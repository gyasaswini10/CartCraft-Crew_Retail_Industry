const mongoose = require("mongoose");
const Product = require("./models/Product");
const fs = require('fs');
const path = require('path');
require("dotenv").config();

const datasetPath = "c:/Users/Admin/Desktop/freshmart/freshmart/client/public/images/Dataset.json";

mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
        console.log("Connected to MongoDB.");
        const count = await Product.countDocuments();
        console.log(`Current Product Count BEFORE: ${count}`);

        if (count === 0) {
            if (fs.existsSync(datasetPath)) {
                const rawData = fs.readFileSync(datasetPath, 'utf8');
                const dataset = JSON.parse(rawData);

                console.log(`Found ${dataset.products.length} products in dataset.`);

                const productsToInsert = dataset.products.map(p => ({
                    productId: `P${String(p.id).padStart(3, '0')}`,
                    name: p.title,
                    price: p.price,
                    category: p.category,
                    imageUrl: p.images && p.images.length > 0 ? p.images[0] : p.thumbnail,
                    description: p.description,
                    tags: p.tags,
                    isActive: true
                }));

                await Product.insertMany(productsToInsert);
                console.log(`Successfully seeded ${productsToInsert.length} products.`);

                const countAfter = await Product.countDocuments();
                console.log(`Current Product Count AFTER: ${countAfter}`);
            } else {
                console.error(`Dataset not found at ${datasetPath}`);
            }
        } else {
            console.log("Database is already populated. Seeding skipped.");
        }
        mongoose.connection.close();
    })
    .catch(err => {
        console.error("Error:", err);
        mongoose.connection.close();
    });
