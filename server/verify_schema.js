const mongoose = require('mongoose');
require('dotenv').config();
const Product = require('./models/Product');

mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 })
    .then(async () => {
        try {
            console.log("Connected. Attempting to save...");
            const p = new Product({
                productId: 'TEST-' + Date.now(),
                name: 'Schema Test',
                price: 99,
                category: 'test',
                rating: 0,
                reviews: [],
                minimumOrderQuantity: 1,
                manufacture_date: new Date(),
                image_url: 'http://test.com'
            });
            await p.save();
            console.log('Product saved successfully');
            await Product.deleteOne({ _id: p._id });
        } catch (e) {
            console.error('Save failed:', e);
        }
        process.exit();
    })
    .catch(e => {
        console.error("Connection error:", e);
        process.exit(1);
    });
