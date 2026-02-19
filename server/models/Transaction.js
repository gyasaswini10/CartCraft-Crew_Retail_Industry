const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    invoice_no: { type: String, required: true, unique: true },
    transaction_date: { type: Date, default: Date.now },
    customer_id: { type: String, ref: 'User' }, // Changed to String to prevent ObjectId casting issues
    items: [{
        productId: { type: String, required: true, ref: 'Product' }, // Changed to match Product schema convention 
        // Ideally ref should be ObjectId, but user has a custom product_id. 
        // I will store the custom product_id string here for simplicity as per user table desc, 
        // but lookup might need manual handling if not using ObjectId ref. 
        // Actually, let's store the product details snapshot or just the ID.
        product_name: { type: String }, // Store name at purchase
        product_image: { type: String }, // Store image at purchase
        quantity: { type: Number, required: true },
        price_at_purchase: { type: Number, required: true } // Good practice to store price at time of sale
    }],
    total_price: { type: Number, required: true },
    subtotal: { type: Number },
    discount_amount: { type: Number, default: 0 },
    shipping_charges: { type: Number, default: 0 },
    store_id: { type: String, default: 'STORE_001' }
});

module.exports = mongoose.model('Transaction', transactionSchema);
