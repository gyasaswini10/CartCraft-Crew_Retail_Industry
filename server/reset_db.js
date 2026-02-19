const mongoose = require("mongoose");
const Product = require("./models/Product");
require("dotenv").config();

mongoose
    .connect(process.env.MONGO_URI)
    .then(async () => {
        console.log("Connected to MongoDB. Clearing products...");
        const result = await Product.deleteMany({});
        console.log(`Deleted ${result.deletedCount} products.`);
        mongoose.connection.close();
    })
    .catch((err) => {
        console.error("Error:", err);
        mongoose.connection.close();
    });
