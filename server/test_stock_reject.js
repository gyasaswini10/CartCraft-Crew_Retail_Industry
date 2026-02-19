const mongoose = require('mongoose');
const Product = require('./models/Product');
const Customer = require('./models/Customer');
require('dotenv').config();

const SERVER_URL = 'http://localhost:5000';
// We need fetch if running in node environment without global fetch (Node 18+ has it)
// const fetch = require('node-fetch'); // Assuming Node 18+ for native fetch

const MONGO_URI = process.env.MONGO_URI;

async function runTest() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("Connected to MongoDB");

        // 1. Pick a product and set stock to 0
        const product = await Product.findOne();
        if (!product) throw new Error("No products found");

        console.log(`Testing with Product: ${product.name} (ID: ${product.productId})`);
        const originalStock = product.stock;

        product.stock = 0;
        await product.save();
        console.log(`Set stock to 0 for ${product.name}`);

        // 2. Try to Add to Cart via API
        // We need a customer ID
        const customerId = "TEST_USER_STOCK_CHECK";

        console.log("Attempting to add to cart...");
        const res = await fetch(`${SERVER_URL}/api/cart/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                customerId,
                product: {
                    productId: product.productId,
                    name: product.name,
                    price: product.price,
                    imageUrl: product.imageUrl
                }
            })
        });

        const data = await res.json();

        if (res.status === 400 && data.error && data.error.includes("stock")) {
            console.log("✅ SUCCESS: Backend correctly rejected add to cart with:", data.error);
        } else {
            console.error("❌ FAILURE: Backend did not reject as expected.", { status: res.status, data });
        }

        // 3. Restore Stock
        product.stock = originalStock;
        await product.save();
        console.log(`Restored stock to ${originalStock}`);

    } catch (err) {
        console.error("Test Error:", err);
    } finally {
        await mongoose.disconnect();
    }
}

runTest();
