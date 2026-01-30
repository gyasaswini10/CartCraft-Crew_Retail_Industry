const mongoose = require("mongoose");
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const Customer = require("./models/Customer");
const User = require("./models/User");
const Product = require("./models/Product");
const productRoutes = require("./routes/productRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const reportRoutes = require("./routes/reportRoutes");
const authRoutes = require('./routes/authRoutes');
const cartRoutes = require('./routes/cartRoutes');
const verifyToken = require('./middleware/authMiddleware');
const paymentRoutes = require("./routes/paymentRoutes");


const messageTemplates = {
  Young: {
    fbt: [
      "this goes great with what you picked 😄",
      "this combo is a crowd favorite 👀"
    ],
    preference: [
      "this feels like your vibe 💙",
      "you might enjoy adding this 😌"
    ]
  },
  Middle: {
    fbt: [
      "this pairs well with your current items",
      "many customers often add this together"
    ],
    preference: [
      "based on what you usually buy",
      "this could be a helpful addition"
    ]
  },
  Senior: {
    fbt: [
      "this item is commonly purchased with your selection",
      "many shoppers find this a useful addition"
    ],
    preference: [
      "based on your past purchases",
      "this aligns with your typical choices"
    ]
  }
};

const playfulPhrases = {
  Young: {
    openers: [
      "Low-key perfect match 👀",
      "Hear me out for a sec 😉",
      "Okay but this is tempting 💙",
      "Not gonna lie 😄",
      "This one just fits 👌"
    ],
    closers: [
      "— trust the vibe ✨",
      "— your cart would approve 😌",
      "— just saying 👀",
      "— feels right, doesn’t it?",
      "— kinda hard to ignore 😄"
    ]
  },
  Middle: {
    openers: [
      "Worth considering:",
      "A smart add-on could be:",
      "This pairs well with your basket:"
    ],
    closers: [
      "— customers often choose this.",
      "— it complements your items nicely."
    ]
  },
  Senior: {
    openers: [
      "Many shoppers find that",
      "A practical addition is"
    ],
    closers: [
      "— based on common preferences.",
      "— a useful choice."
    ]
  }
};

const openers = {
  Young: ["Looks like", "Nice pick —", "Quick thought —"],
  Middle: ["You might find that", "Customers often notice that"],
  Senior: ["It is common that", "Many customers find that"]
};

// 🧺 Cross-sell map (marketing layer)
const crossSellMap = {
  dairy: ["bread", "cookies", "cereal"],
  snacks: ["soft drink", "chocolate"],
  essential: ["cleaner", "detergent"],
  grains: ["pulses", "spices"]
};

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildExplanation({ type, customer, product, cartCategories, ageGroup }) {
  const prefs = customer.preferences
    ? Object.keys(customer.preferences)
    : [];
  const tone = playfulPhrases[ageGroup] || playfulPhrases.Middle;

  const opener = pickRandom(tone.openers);
  const closer = pickRandom(tone.closers);

  if (type === "FBT") {
    return `${opener} people often add this with what’s already in your cart ${closer}`;
  }

  if (type === "CROSS_SELL") {
    return `${opener} this usually goes well with what’s already in your cart ${closer}`;
  }

  if (type === "PREFERENCE") {
    if (prefs.includes(product.category)) {
      return `${opener} you clearly have a thing for ${product.category} items ${closer}`;
    }

    const matchedTag = product.tags?.find(tag =>
      prefs.includes(tag.toLowerCase())
    );

    if (matchedTag) {
      return `${opener} this matches your ${matchedTag} picks pretty well ${closer}`;
    }

    return `${opener} this feels like something you’d enjoy ${closer}`;
  }

  return `${opener} this could be a nice little add-on ${closer}`;
}

const app = express();

app.use(cors({
  origin: '*', // Allow all origins (or specify your frontend URL)
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-razorpay-signature', 'x-razorpay-payment-id'],
  exposedHeaders: ['x-rtb-fingerprint-id', 'x-razorpay-payment-id', 'x-razorpay-signature'] // Allow client to read these if needed
}));
app.use(express.json());
app.use("/api/products", productRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/reports", reportRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/cart', cartRoutes);
app.use("/api/payment", paymentRoutes);

app.post("/recommendations", async (req, res) => {
  try {
    const { customerId, currentCart } = req.body;
    console.log("Rec Request:", { customerId, cartSize: currentCart?.length });

    if (!customerId) return res.status(400).json({ error: "Missing customerId" });
    if (!currentCart) return res.status(400).json({ error: "Missing currentCart" });

    let customer = await Customer.findOne({ customerId });
    if (!customer) {
      // Auto-create customer profile if it doesn't exist
      console.log(`Creating new customer profile for ID: ${customerId}`);
      customer = new Customer({
        customerId,
        name: "Valued Customer",
        ageGroup: "Middle", // Default
        shoppingFrequency: "Monthly"
      });
      await customer.save();
    }

    const shouldNudge =
      (customer.shoppingFrequency === "Weekly" && customer.lastPurchaseDaysAgo <= 5) ||
      (customer.shoppingFrequency === "BiWeekly" && customer.lastPurchaseDaysAgo <= 10) ||
      (customer.shoppingFrequency === "Monthly" && customer.lastPurchaseDaysAgo <= 20);


    const ageGroup = customer.ageGroup || "Middle";
    const tone = messageTemplates[ageGroup];


    // ⏸️ Cooldown list
    const recentlyRecommended = new Set(customer.recentlyRecommended || []);

    // 🧺 Products already in cart
    const productsInCart = await Product.find({
      productId: { $in: currentCart }
    });

    // 💰 Calculate the total price of items currently in the cart
    const currentCartValue = productsInCart.reduce((sum, p) => sum + p.price, 0);
    console.log(`Current Cart Value: ${currentCartValue}`);

    // 🧠 Derive cart categories (normalized)
    const cartCategories = productsInCart.map(p =>
      p.category.toLowerCase()
    );



    // 🎯 Basket-aware but discovery-safe recommendation limit
    const avgBasketItems = customer.avgBasketItems || 3;

    // FIX: Always allow at least 2 slots unless the cart is truly massive.
    // This ensures Rule 1 (FBT) doesn't take the only available slot.
    let MAX_RECOMMENDATIONS = 2;

    if (shouldNudge) {
      MAX_RECOMMENDATIONS = 3;
    }

    // If basket is already unusually large, we still keep 1 slot for a "smart" add-on
    if (currentCart.length > avgBasketItems + 2) {
      MAX_RECOMMENDATIONS = 1;
    }

    // 🎯 Prepare preference keys from the Customer Map
    const preferenceKeys = customer.preferences instanceof Map
      ? Array.from(customer.preferences.keys())
      : Object.keys(customer.preferences || {});

    let recommendations = [];
    // 🧠 Collect cross-sell categories from cart
    const crossSellCategories = new Set();

    cartCategories.forEach(category => {
      const related = crossSellMap[category];
      if (related) {
        related.forEach(item => crossSellCategories.add(item));
      }
    });


    // 🔹 Fix 1: Frequently Bought Together
    const fbtProducts = await Product.find({
      category: {
        $in: cartCategories.map(cat => new RegExp(`^${cat}$`, "i"))
      },
      productId: { $nin: currentCart }
    });


    fbtProducts.forEach(product => {
      let score = 4; // base FBT score

      // 🎯 Bonus if cart category matches
      if (cartCategories.includes(product.category.toLowerCase())) {
        score += 2;
      }

      // 🚀 UPSELL LOGIC: Boost score if this item increases basket value
      const currentAvgPrice = productsInCart.length > 0
        ? productsInCart.reduce((sum, p) => sum + p.price, 0) / productsInCart.length
        : 0;

      if (product.price > currentAvgPrice) {
        score += 1.5; // Favor items that grow the transaction value
      }

      // 🔁 Cooldown penalty (keep this here)
      if (recentlyRecommended.has(product.productId)) {
        score -= 3;
      }

      // 🛑 Ignore if score drops too low
      if (score <= 0) return;

      recommendations.push({
        productId: product.productId,
        name: product.name,
        score,
        reason: "Frequently bought together",
        message: buildExplanation({
          type: "FBT",
          customer,
          product,
          cartCategories,
          ageGroup
        })
      });
    });

    // 🔹 Fix 2: Preferences
    const preferenceProducts = preferenceKeys.length > 0
      ? await Product.find({
        $or: [
          { category: { $in: preferenceKeys.map(k => new RegExp(`^${k}$`, "i")) } },
          { tags: { $in: preferenceKeys.map(k => new RegExp(`^${k}$`, "i")) } }
        ],
        productId: { $nin: currentCart }
      })
      : [];

    preferenceProducts.forEach(product => {
      let score = 0;

      // Strong match
      if (customer.preferences.get(product.category.toLowerCase())) {
        score += 5;
      }

      // Soft match
      if (product.tags?.some(tag => customer.preferences.get(tag.toLowerCase()))) {
        score += 3;
      }

      // 🔁 Cooldown penalty
      if (recentlyRecommended.has(product.productId)) {
        score -= 3;
      }

      if (score <= 0) return;

      recommendations.push({
        productId: product.productId,
        name: product.name,
        score,
        reason: "Matches your preferences",
        message: buildExplanation({
          type: "PREFERENCE",
          customer,
          product,
          cartCategories,
          ageGroup
        })
      });
    });

    // 🧺 Cross-sell product candidates
    const crossSellProducts = crossSellCategories.size
      ? await Product.find({
        $or: [
          { category: { $in: Array.from(crossSellCategories) } },
          { tags: { $in: Array.from(crossSellCategories) } }
        ],
        productId: { $nin: currentCart }
      })
      : [];

    // 🧺 Cross-sell scoring (marketing nudge)
    crossSellProducts.forEach(product => {
      let score = 5; // weaker than preferences, stronger than fallback

      // Mild boost if preference exists
      if (customer.preferences?.get?.(product.category.toLowerCase())) {

        score += 1;
      }

      // Cooldown penalty still applies
      if (recentlyRecommended.has(product.productId)) {
        score -= 2;
      }

      if (score <= 0) return;

      recommendations.push({
        productId: product.productId,
        name: product.name,
        score,
        reason: "Pairs well with your cart",
        message: buildExplanation({
          type: "CROSS_SELL",
          customer,
          product,
          cartCategories,
          ageGroup
        })
      });
    });

    // 🧼 Remove duplicates
    const uniqueRecommendations = Array.from(
      new Map(recommendations.map(r => [r.productId, r])).values()
    );
    // 🔢 Rank by score (high → low)
    uniqueRecommendations.sort((a, b) => b.score - a.score);


    const finalRecommendations = uniqueRecommendations
      .slice(0, MAX_RECOMMENDATIONS)
      .map(({ score, ...rest }) => rest);
    // 🛟 Safety net — never return empty if recommendations exist
    if (finalRecommendations.length === 0 && uniqueRecommendations.length > 0) {
      const { score, ...rest } = uniqueRecommendations[0];
      finalRecommendations.push(rest);
    }


    // 🛟 Fallback — never return empty recommendations
    if (finalRecommendations.length === 0 && recommendations.length === 0) {


      const fallbackProducts = await Product.find({ isActive: true }).limit(3);

      fallbackProducts.forEach(product => {
        finalRecommendations.push({
          productId: product.productId,
          name: product.name,
          reason: "Popular choice",
          message: "Many customers often add this to their basket"
        });
      });
    }


    // 🧠 Save cooldown memory
    await Customer.updateOne(
      { customerId },
      { $set: { recentlyRecommended: finalRecommendations.map(r => r.productId) } }
    );

    // 💰 Calculate Basket Metrics
    const totalCartValue = productsInCart.reduce((sum, p) => sum + p.price, 0);
    const FREE_SHIPPING_THRESHOLD = 500;
    const amountToReward = Math.max(0, FREE_SHIPPING_THRESHOLD - totalCartValue);

    // 📊 25% KPI Tracker (For the Panel)
    const currentSize = currentCart.length;
    const projectedSize = currentSize + finalRecommendations.length;
    const historicalAvg = customer.avgBasketItems || 3;
    const growthRate = currentSize > 0
      ? ((projectedSize - currentSize) / currentSize) * 100
      : 0;
    const analytics = {
      currentBasketValue: totalCartValue,
      nextRewardIn: amountToReward,
      isEligibleForFreeShipping: totalCartValue >= FREE_SHIPPING_THRESHOLD,
      projectedGrowth: `${growthRate.toFixed(0)}%`
    };

    // 🎫 Simple Coupon Logic
    let activeCoupon = null;
    if (customer.loyaltyTier === "Gold") {
      activeCoupon = { code: "GOLD20", discount: "20% OFF" };
    }

    //  res.json 
    res.json({
      customer: customer.name,
      ageGroup: customer.ageGroup,
      loyalty: customer.loyaltyTier,
      recommendations: finalRecommendations,
      analytics,
      offers: activeCoupon
    });

  } catch (error) { // ⬅️ The "End of the route" is right before this catch block
    console.error("Recommendation error:", error);
    res.status(500).json({ error: "Server error", details: error.message });
  }
});

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected successfully");
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error.message);
  });

// 🛒 Order completion — auto-learn preferences
app.post("/orders", async (req, res) => {
  try {
    const { customerId, purchasedProducts } = req.body;




    // purchasedProducts = ["PROD001", "PROD005", ...]

    const customer = await Customer.findOne({ customerId });
    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }

    // Fetch purchased product details
    const products = await Product.find({
      productId: { $in: purchasedProducts }
    });

    // 🧠 Collect weighted preference signals
    const learnedPrefs = new Map(customer.preferences || []);

    products.forEach(product => {
      const category = product.category.toLowerCase();

      // Increment category weight
      learnedPrefs.set(
        category,
        (learnedPrefs.get(category) || 0) + 1
      );

      // Increment tag weights
      product.tags?.forEach(tag => {
        const normalizedTag = tag.toLowerCase();
        learnedPrefs.set(
          normalizedTag,
          (learnedPrefs.get(normalizedTag) || 0) + 1
        );
      });
    });

    // ⏳ Apply gentle decay to non-reinforced preferences
    const DECAY_RATE = 1;      // how much to reduce
    const MIN_WEIGHT = 1;     // never drop below this

    for (const [pref, weight] of learnedPrefs.entries()) {
      const wasReinforced = products.some(product =>
        product.category.toLowerCase() === pref ||
        product.tags?.map(t => t.toLowerCase()).includes(pref)
      );

      if (!wasReinforced) {
        learnedPrefs.set(
          pref,
          Math.max(MIN_WEIGHT, weight - DECAY_RATE)
        );
      }
    }

    // Save weighted preferences (merge, don't overwrite)
    await Customer.updateOne(
      { customerId },
      {
        $set: {
          preferences: Object.fromEntries(learnedPrefs)
        }
      }
    );

    res.json({
      message: "Order processed & preferences updated",
      updatedPreferences: Object.fromEntries(learnedPrefs)
    });

  } catch (error) {
    console.error("Order processing error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Test route
app.get("/", (req, res) => {
  res.send("FreshMart backend is running");
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`FreshMart server running on port ${PORT}`);
});
