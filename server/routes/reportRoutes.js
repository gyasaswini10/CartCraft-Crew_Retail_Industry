const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Transaction = require('../models/Transaction');
const verifyToken = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');

// Get Expiry Report (Admin, Sales Manager, Product Manager)
router.get('/expiry', verifyToken, authorizeRoles('Admin', 'Sales Manager', 'Product Manager'), async (req, res) => {
    try {
        const today = new Date();
        const next30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

        const expired = await Product.find({ expiry_date: { $lt: today } });
        const nearExpiry = await Product.find({ expiry_date: { $gte: today, $lte: next30Days } });

        res.json({ expired, nearExpiry });
    } catch (error) {
        res.status(500).json({ error: 'Failed to generate expiry report' });
    }
});

// Market Basket Analysis (Admin, Sales Manager, Product Manager)
router.get('/mba', verifyToken, authorizeRoles('Admin', 'Sales Manager', 'Product Manager'), async (req, res) => {
    try {
        const transactions = await Transaction.find();
        const pairs = {};

        transactions.forEach(t => {
            const items = t.items.map(i => i.product_id); // WARNING: Schema says 'productId' string ref.
            // Transaction.js previously had items: [{ productId }]
            // Let's check logic:
            // "const items = t.items.map(i => i.product_id);"
            // Transaction.js schema (Step 738, 742) defines `productId`.
            // BUT lines 30-31 says `items = t.items.map(i => i.product_id)`.
            // Does Transaction item have `product_id` or `productId`?
            // Transaction.js Line 8: `productId: { type: String... }`
            // So `i.product_id` is UNDEFINED!
            // I must fix that bug too while I'm here.

            // Wait, looking at Step 656 (transactionRoutes checkout):
            // processedItems.push({ productId: item.productId ... })
            // So DB has `productId`.

            const txnItems = t.items.map(i => i.productId); // Correct property name

            // Generate pairs
            for (let i = 0; i < txnItems.length; i++) {
                for (let j = i + 1; j < txnItems.length; j++) {
                    const p1 = txnItems[i];
                    const p2 = txnItems[j];
                    const key = [p1, p2].sort().join(','); // consistent key order
                    pairs[key] = (pairs[key] || 0) + 1;
                }
            }
        });

        // Format for response
        const analysis = Object.entries(pairs)
            .map(([pair, count]) => ({ pair: pair.split(','), count }))
            .sort((a, b) => b.count - a.count); // Most frequent first

        res.json(analysis);
    } catch (error) {
        console.error("MBA Error:", error);
        res.status(500).json({ error: 'Failed to run Market Basket Analysis', details: error.message });
    }
});

// Sales Reports (Sales Manager, Admin, Product Manager)
// "Monitor daily / monthly sales", "Identify fast-moving products"
router.get('/sales', verifyToken, authorizeRoles('Admin', 'Sales Manager', 'Product Manager'), async (req, res) => {
    try {
        const { type } = req.query; // 'daily' or 'monthly' or 'top'

        if (type === 'top') {
            // Top Selling / Fast Moving Products
            const transactions = await Transaction.find();
            const productCounts = {};
            transactions.forEach(t => {
                t.items.forEach(item => {
                    productCounts[item.productId] = (productCounts[item.productId] || 0) + item.quantity;
                });
            });

            const sorted = Object.entries(productCounts)
                .map(([id, count]) => ({ product_id: id, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 10); // Top 10

            return res.json(sorted);
        }

        if (type === 'daily' || type === 'monthly') {
            const matchStage = {};
            const today = new Date();

            if (type === 'daily') {
                const startOfDay = new Date(today.setHours(0, 0, 0, 0));
                const endOfDay = new Date(today.setHours(23, 59, 59, 999));
                matchStage.transaction_date = { $gte: startOfDay, $lte: endOfDay };
            } else if (type === 'monthly') {
                const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                matchStage.transaction_date = { $gte: startOfMonth, $lte: endOfMonth };
            }

            const sales = await Transaction.aggregate([
                { $match: matchStage },
                { $group: { _id: null, totalRevenue: { $sum: '$total_price' }, count: { $sum: 1 } } }
            ]);

            return res.json(sales[0] || { totalRevenue: 0, count: 0 });
        }

        res.status(400).json({ error: 'Invalid report type. Use ?type=daily, ?type=monthly, or ?type=top' });

    } catch (error) {
        res.status(500).json({ error: 'Failed to generate sales report', details: error.message });
    }
});

module.exports = router;
