const Razorpay = require("razorpay");
const crypto = require("crypto");
require("dotenv").config();

// Initialize Razorpay only if keys are available
let razorpayInstance;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    razorpayInstance = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,   // Razorpay Key ID
        key_secret: process.env.RAZORPAY_KEY_SECRET,  // Razorpay Key Secret
    });
    console.log("Razorpay initialized successfully");
} else {
    console.error("Razorpay keys missing!");
}

const createOrder = async (req, res) => {
    if (!razorpayInstance) {
        console.error("Razorpay instance not initialized. Check server .env keys.");
        return res.status(500).json({ error: "Razorpay configuration missing on server." });
    }

    const { amount, currency } = req.body;

    const options = {
        amount: Math.round(amount * 100), // Amount in the smallest currency unit (paise for INR)
        currency: currency || "INR",  // Default to INR if currency not provided
        receipt: `receipt_${Date.now()}`
    };

    try {
        const order = await razorpayInstance.orders.create(options);
        console.log("Order created successfully: ", order);
        res.status(200).json(order);
    } catch (error) {
        console.error("Error while creating Razorpay order: ", error);
        const fs = require('fs');
        const logMessage = `${new Date().toISOString()} - Payment Create Order Error: ${error.message}\nStack: ${error.stack}\nDetails: ${JSON.stringify(error)}\n\n`;
        fs.appendFileSync('server_error.log', logMessage);
        res.status(500).json({ error: "Failed to create Razorpay order", details: error });
    }
};


// Verify Razorpay payment
const verifyPayment = (req, res) => {
    const { order_id, payment_id, razorpay_signature } = req.body;
    const body = order_id + "|" + payment_id;

    const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest("hex");

    const isAuthentic = expectedSignature === razorpay_signature;

    if (isAuthentic) {
        res.status(200).json({ message: "Payment verified successfully" });
    } else {
        res.status(400).json({ message: "Invalid payment signature" });
    }
};

module.exports = { createOrder, verifyPayment };
