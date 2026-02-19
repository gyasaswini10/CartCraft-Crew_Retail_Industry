const mongoose = require('mongoose');
const Product = require('./models/Product');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI;

async function checkAndFixStock() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("Connected to DB");

        const totalProducts = await Product.countDocuments();
        console.log(`Total Products: ${totalProducts}`);

        const productsWithoutStock = await Product.find({ stock: { $exists: false } });
        console.log(`Products missing 'stock' field: ${productsWithoutStock.length}`);

        if (productsWithoutStock.length > 0) {
            console.log("Backfilling stock data...");
            const res = await Product.updateMany(
                { stock: { $exists: false } },
                { $set: { stock: 50 } }
            );
            console.log(`Backfilled stock for ${res.modifiedCount} products.`);
        } else {
            console.log("All products have stock data.");
        }

        // Verify "Stock > 0" query
        const availableProducts = await Product.find({ stock: { $gt: 0 } }).countDocuments();
        console.log(`Products available for recommendation (stock > 0): ${availableProducts}`);

        mongoose.disconnect();
    } catch (err) {
        console.error("Error:", err);
    }
}

checkAndFixStock();
