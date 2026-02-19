const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const Product = require('../models/Product');
const verifyToken = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');

// Checkout (Customer & Testing Roles)
router.post('/checkout', verifyToken, authorizeRoles('Customer', 'Admin', 'Sales Manager', 'Product Manager', 'SalesManager'), async (req, res) => {
    try {
        const { items, invoice_no, subtotal: providedSubtotal, discount_amount, shipping_charges } = req.body;
        console.log(`[Checkout] User ID from Token: ${req.user.id} (Type: ${typeof req.user.id})`);

        let calculatedSubtotal = 0;
        const processedItems = [];

        // Calculate total and verify stock
        console.log("Checkout Items:", items);
        for (const item of items) {
            const product = await Product.findOne({ productId: item.productId });
            if (!product) {
                return res.status(404).json({ error: `Product ${item.productId} not found` });
            }

            // 🛑 CHECK STOCK
            if (product.stock < item.quantity) {
                return res.status(400).json({ error: `Insufficient stock for ${product.name}. Only ${product.stock} left.` });
            }

            // 📉 DECREMENT STOCK
            product.stock -= item.quantity;
            await product.save();

            calculatedSubtotal += product.price * item.quantity;
            processedItems.push({
                productId: item.productId,
                product_name: product.name,
                product_image: product.imageUrl || item.image_url || item.imageUrl,
                quantity: item.quantity,
                price_at_purchase: product.price
            });
        }

        const Customer = require('../models/Customer');

        // Use provided values or fallback to calculated subtotal
        const finalSubtotal = providedSubtotal !== undefined ? Number(providedSubtotal) : calculatedSubtotal;
        const finalDiscount = Number(discount_amount) || 0;
        const finalShipping = Number(shipping_charges) || 0;
        const finalTotal = finalSubtotal + finalShipping - finalDiscount;

        // Save Transaction
        const transaction = new Transaction({
            invoice_no: invoice_no || `INV-${Date.now()}`,
            customer_id: req.user.id,
            items: processedItems,
            subtotal: finalSubtotal,
            discount_amount: finalDiscount,
            shipping_charges: finalShipping,
            total_price: finalTotal
        });
        await transaction.save();
        console.log(`[Checkout] Transaction saved: ${transaction.invoice_no}`);

        // Clear Customer Basket
        const targetId = req.user.id ? req.user.id.toString() : null;
        if (targetId) {
            const updatedCustomer = await Customer.findOneAndUpdate(
                { customerId: targetId },
                { $set: { basket: [] } },
                { new: true }
            );

            if (updatedCustomer) {
                console.log(`[Checkout] Cart cleared successfully for customerId: ${targetId}`);
            } else {
                console.warn(`[Checkout] WARNING: No Customer profile found with customerId: ${targetId}. Cart NOT cleared.`);
                // Fallback: check if it's stored under _id 
                const altCustomer = await Customer.findOneAndUpdate(
                    { _id: targetId },
                    { $set: { basket: [] } },
                    { new: true }
                );
                if (altCustomer) console.log(`[Checkout] Cart cleared using fallback _id match for ${targetId}`);
            }
        } else {
            console.error(`[Checkout] CRITICAL: No user ID found in token. Cannot clear cart.`);
        }

        res.status(201).json({ message: 'Transaction successful', transaction });
    } catch (err) {
        console.error("Checkout Error:", err);
        res.status(500).json({ error: 'Checkout failed' });
    }
});

// My Orders (Customer & Testing Roles)
router.get('/my-orders', verifyToken, authorizeRoles('Customer', 'Admin', 'Sales Manager', 'Product Manager', 'SalesManager'), async (req, res) => {
    try {
        const transactions = await Transaction.find({ customer_id: req.user.id }).sort({ transaction_date: -1 });
        res.json(transactions);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

// Get Invoice
router.get('/invoice/:invoiceNo', verifyToken, async (req, res) => {
    try {
        const transaction = await Transaction.findOne({ invoice_no: req.params.invoiceNo });
        if (!transaction) return res.status(404).json({ error: 'Order not found' });
        res.json(transaction);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch invoice' });
    }
});

module.exports = router;
