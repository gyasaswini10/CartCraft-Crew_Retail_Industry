const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema({
  productId: { type: String, required: true, unique: true }, // Your Brain's key
  name: { type: String, required: true },                   // Your Brain's key
  price: { type: Number, required: true },                  // Your Brain's key
  category: { type: String, lowercase: true, required: true },
  imageUrl: String,                                         // Your Brain's key
  description: String,
  tags: [String],
  isActive: { type: Boolean, default: true },
  stock: { type: Number, default: 50, min: 0 }
});

module.exports = mongoose.model("Product", ProductSchema);