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
        for (const item of items) {
            const product = await Product.findOne({ product_id: item.product_id });
            if (!product) {
                return res.status(404).json({ error: `Product ${item.product_id} not found` });
            }
            total_price += product.unit_price * item.quantity;
            processedItems.push({
                product_id: item.product_id,
                quantity: item.quantity,
                price_at_purchase: product.unit_price
            });
        }

        const transaction = new Transaction({
            invoice_no: invoice_no || `INV-${Date.now()}`,
            customer_id: req.user.userId,
            items: processedItems,
            total_price
        });

        await transaction.save();
        res.status(201).json({ message: 'Transaction successful', transaction });
    } catch (error) {
        res.status(500).json({ error: 'Checkout failed', details: error.message });
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
