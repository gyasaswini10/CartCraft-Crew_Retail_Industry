const mongoose = require('mongoose');
const Product = require('./models/Product');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI;

async function randomizeStock() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("Connected to MongoDB for Stock Randomization");

        // Find all products with stock exactly 50 (the default value we want to change)
        // OR we can just update ALL products that might have been defaulted
        const products = await Product.find({ stock: 50 });
        console.log(`Found ${products.length} products with stock = 50. Updating...`);

        let updatedCount = 0;
        for (const p of products) {
            // Generate random stock between 5 and 100
            const randomStock = Math.floor(Math.random() * 96) + 5;
            p.stock = randomStock;
            await p.save();
            updatedCount++;
        }

        console.log(`Successfully updated ${updatedCount} products with new random stock values.`);

    } catch (err) {
        console.error("Error updating stock:", err);
    } finally {
        await mongoose.disconnect();
    }
}

randomizeStock();
