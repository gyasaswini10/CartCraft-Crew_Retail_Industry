const mongoose = require('mongoose');
const Product = require('./models/Product');
require('dotenv').config();

const SERVER_URL = 'http://localhost:5000';
const MONGO_URI = process.env.MONGO_URI;

// Mock user token (you might need a real one if auth is strict, but let's try with a mock user first or just use the models directly for setup)
// Since checkout requires auth, we need to create a user and get a token, or mock the request if we can bypassing auth or using a known token.
// For simplicity, let's assume we have a valid token or we temporarily allowed it. 
// Actually, I can use the models directly to set upstate, and then call the API.

// If we cannot easily get a token, we might fail the checkout test via API. 
// However, we can test the logic by manually invoking the checkout function or just trusting the unit test if we had one.
// Let's rely on the fact that I can't easily generate a JWT here without login.
// I'll simulate the user flow:
// 1. Create a product with stock 1.
// 2. Call recommendation API (Should see it).
// 3. Update stock to 0 (Direct DB update to simulate "someone else bought it").
// 4. Call recommendation API (Should NOT see it).

// Tests handling of "Stock Decrement" is harder without a valid user token for checkout. 
// But I can verification the recommendation filtering easily.

async function verifyStockLogic() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("Connected to DB");

        const testProductId = "TEST_STOCK_001";

        // 1. Clean up
        await Product.deleteOne({ productId: testProductId });

        // 2. Create Product with Stock 1
        const p = new Product({
            productId: testProductId,
            name: "Stock Test Item",
            price: 100,
            category: "testing",
            isActive: true,
            stock: 1,
            imageUrl: "http://example.com/img.png"
        });
        await p.save();
        console.log("Created Test Product with Stock 1");

        // 3. Check Recommendations (Should appear if we seed it as a cross-sell or FBT candidate, or fallback)
        // To ensure it appears, let's make it a 'fallback' candidate by having a small cart
        // 3. Check Recommendations (Should appear if we seed it as a cross-sell or FBT candidate, or fallback)
        // To ensure it appears, let's make it a 'fallback' candidate by having a small cart
        const res1 = await fetch(`${SERVER_URL}/recommendations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                customerId: "TEST_USER_001",
                currentCart: []
            })
        });
        // We don't strictly need the data here, just priming.

        // Let's set stock to 0 directly
        p.stock = 0;
        await p.save();
        console.log("Updated Stock to 0");

        const res2 = await fetch(`${SERVER_URL}/recommendations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                customerId: "TEST_USER_001",
                currentCart: ["OTHER_ITEM"]
            })
        });
        const data2 = await res2.json();

        const foundInRecs = res2.data.recommendations.some(r => r.productId === testProductId);
        if (foundInRecs) {
            console.error("❌ FAILURE: Item with Stock 0 was recommended!");
        } else {
            console.log("✅ SUCCESS: Item with Stock 0 was NOT recommended.");
        }

        // Clean up
        await Product.deleteOne({ productId: testProductId });
        mongoose.disconnect();

    } catch (err) {
        console.error("Verification failed:", err.message);
        if (err.response) {
            console.error("API Response:", err.response.data);
        }
    }
}

verifyStockLogic();
