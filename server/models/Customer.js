const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema({
  customerId: {
    type: String,
    required: true,
    unique: true
  },

  name: String,
  email: String,
  phone: String,
  loyaltyTier: String,

  role: {
  type: String,
  enum: ['Customer', 'Sales Manager', 'Product Manager', 'Admin'],
  default: 'Customer'
 },


  ageGroup: {
    type: String,
    enum: ["Young", "Middle", "Senior"],
    default: "Middle"
  },

  // 🎯 Preference signals
  preferences: {
  type: Map,
  of: Number,
  default: {}
},


  // 🔁 Frequency intelligence
  shoppingFrequency: {
    type: String,
    enum: ["Weekly", "BiWeekly", "Monthly"],
    default: "Monthly"
  },

  lastPurchaseDaysAgo: {
    type: Number,
    default: 30
  },

  // 🧺 Basket behavior
  avgBasketItems: {
    type: Number,
    default: 3
  },

  // ⏸️ Recommendation cooldown
  recentlyRecommended: {
    type: [String],
    default: []
  },

  createdAt: {
    type: String
  }
});

module.exports = mongoose.model("Customer", customerSchema);
