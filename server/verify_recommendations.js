const mongoose = require("mongoose");
const Product = require("./models/Product");
require("dotenv").config();

async function verify() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to DB");

        // 1. Get some products
        const allProducts = await Product.find().limit(10);
        if (allProducts.length < 5) {
            console.log("Not enough products to test");
            return;
        }

        const cartProducts = allProducts.slice(0, 2);
        const currentCart = cartProducts.map(p => p.productId);
        console.log("Current Cart IDs:", currentCart);

        const productsInCart = await Product.find({
            productId: { $in: currentCart }
        });

        const cartCategories = productsInCart.map(p => p.category.toLowerCase());
        console.log("Cart Categories:", cartCategories);

        // 2. Test FBT Query with $nin
        console.log("Testing FBT Query...");
        const fbtProducts = await Product.find({
            category: {
                $in: cartCategories.map(cat => new RegExp(`^${cat}$`, "i"))
            },
            productId: { $nin: currentCart }
        });

        console.log("FBT Results IDs:", fbtProducts.map(p => p.productId));
        
        const fbtOverlap = fbtProducts.filter(p => currentCart.includes(p.productId));
        if (fbtOverlap.length > 0) {
            console.error("FAIL: FBT Query returned items in cart:", fbtOverlap.map(p => p.productId));
        } else {
            console.log("PASS: FBT Query did not return items in cart.");
        }

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await mongoose.disconnect();
        console.log("Disconnected");
    }
}

verify();
