const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');
const Product = require('../models/Product');

// GET Basket
router.get('/:customerId', async (req, res) => {
    try {
        const { customerId } = req.params;
        const customer = await Customer.findOne({ customerId });

        if (!customer) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        res.json(customer.basket || []);
    } catch (err) {
        console.error('Get Cart Error:', err);
        res.status(500).json({ error: 'Failed to retrieve cart' });
    }
});

// ADD to Basket
router.post('/add', async (req, res) => {
    try {
        const { customerId, product } = req.body;
        console.log('Add Cart Request:', { customerId, product: product?.name });

        if (!customerId) {
            return res.status(400).json({ error: "Missing customerId" });
        }

        let customer = await Customer.findOne({ customerId });
        if (!customer) {
            // Auto-create if not exists (similar to recommendations logic)
            console.log(`Creating new customer profile for ID: ${customerId}`);
            customer = new Customer({ customerId, name: "New Customer" });
        }

        const basket = customer.basket || [];
        const existingItemIndex = basket.findIndex(item => item.productId === product.productId);

        if (existingItemIndex > -1) {
            basket[existingItemIndex].quantity += 1;
        } else {
            basket.push({
                productId: product.productId,
                name: product.name,
                price: product.price,
                image_url: product.image_url || product.imageUrl,
                quantity: 1
            });
        }

        customer.basket = basket;
        await customer.save();

        res.json(customer.basket);
    } catch (err) {
        console.error('Add to Cart Error:', err);
        // Log to file for easier debugging
        const fs = require('fs');
        fs.appendFileSync('server_error.log', `${new Date().toISOString()} - Add Cart Error: ${err.message}\n${err.stack}\n\n`);
        res.status(500).json({ error: 'Failed to add item to cart', details: err.message });
    }
});

// REMOVE from Basket
router.post('/remove', async (req, res) => {
    try {
        const { customerId, productId } = req.body;

        const customer = await Customer.findOne({ customerId });
        if (!customer) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        // Filter out the item
        customer.basket = customer.basket.filter(item => item.productId !== productId);
        await customer.save();

        res.json(customer.basket);
    } catch (err) {
        console.error('Remove from Cart Error:', err);
        res.status(500).json({ error: 'Failed to remove item from cart' });
    }
});

// SYNC/UPDATE Basket (Full override - optional usage)
router.post('/sync', async (req, res) => {
    try {
        const { customerId, cart } = req.body;
        await Customer.updateOne({ customerId }, { $set: { basket: cart } });
        res.json({ message: 'Cart synced' });
    } catch (err) {
        res.status(500).json({ error: 'Sync failed' });
    }
});

module.exports = router;
