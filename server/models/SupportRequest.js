const mongoose = require("mongoose");

const supportRequestSchema = new mongoose.Schema({
    customerId: String,
    customerName: String,
    email: String,
    subject: String,
    category: { type: String, default: 'General' }, // Product, Order, Payment, etc.
    message: String,
    status: { type: String, default: 'Pending' }, // Pending, Resolved
    adminReply: String,
    resolvedAt: Date,
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("SupportRequest", supportRequestSchema);
