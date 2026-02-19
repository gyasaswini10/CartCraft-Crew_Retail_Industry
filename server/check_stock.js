const mongoose = require('mongoose');
const Product = require('./models/Product');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI;

async function checkStock() {
    try {
        await mongoose.connect(MONGO_URI);
        const products = await Product.find().limit(10);
        console.log("--- Current Stock Samples ---");
        products.forEach(p => {
            console.log(`Product: ${p.name}, Stock: ${p.stock}`);
        });
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

checkStock();
