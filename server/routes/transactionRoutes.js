const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const Product = require('../models/Product');
const verifyToken = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');

// Checkout (Customer)
router.post('/checkout', verifyToken, authorizeRoles('Customer'), async (req, res) => {
    try {
        const { items, invoice_no } = req.body; // Items: [{product_id, quantity}]
        let total_price = 0;
        const processedItems = [];

        // Calculate total and verify stock (optional, but good practice)
        // Calculate total and verify stock (optional, but good practice)
        console.log("Checkout User:", req.user.id);
        console.log("Checkout Items:", items);
        for (const item of items) {
            const product = await Product.findOne({ productId: item.productId });
            if (!product) {
                return res.status(404).json({ error: `Product ${item.productId} not found` });
            }
            total_price += product.price * item.quantity;
            processedItems.push({
                productId: item.productId,
                product_name: product.name,
                product_image: product.imageUrl,
                quantity: item.quantity,
                price_at_purchase: product.price
            });
        }

        const transaction = new Transaction({
            invoice_no: invoice_no || `INV-${Date.now()}`,
            customer_id: req.user.id,
            items: processedItems,
            total_price
        });

        await transaction.save();
        res.status(201).json({ message: 'Transaction successful', transaction });
    } catch (error) {
        console.error("Checkout Error:", error); // Log the full error
        res.status(500).json({ error: 'Checkout failed', details: error.message });
    }
});

// View My Transactions (Customer)
router.get('/my-orders', verifyToken, authorizeRoles('Customer'), async (req, res) => {
    try {
        const transactions = await Transaction.find({ customer_id: req.user.id }).sort({ createdAt: -1 });
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch your orders' });
    }
});

// View All Transactions (Admin, Sales Manager)
router.get('/', verifyToken, authorizeRoles('Admin', 'Sales Manager'), async (req, res) => {
    try {
        const transactions = await Transaction.find().populate('customer_id', 'username');
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
});

module.exports = router;
