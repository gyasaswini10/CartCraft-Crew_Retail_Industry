console.log("Starting server...");
const mongoose = require("mongoose");
const fs = require('fs');
const path = require('path');
const express = require("express");
const cors = require("cors");
require("dotenv").config({ path: path.join(__dirname, '.env') });

const Customer = require("./models/Customer");
const User = require("./models/User");
const Product = require("./models/Product");
const SupportRequest = require("./models/SupportRequest");
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
      "your basket is practically begging for this combo 👀",
      "we promise this won't tell anyone you're having seconds 🤫"
    ],
    preference: [
      "your vibe called, it wants this back in the cart 💙",
      "go on, treat yourself to a little something extra 😌"
    ]
  },
  Middle: {
    fbt: [
      "a perfect match for your current selection",
      "this item is feeling lonely without your cart items"
    ],
    preference: [
      "based on your excellent taste in $category",
      "a sophisticated addition for a shopper like you"
    ]
  },
  Senior: {
    fbt: [
      "a classic pairing that never goes out of style",
      "many of our best customers reach for this too"
    ],
    preference: [
      "aligns perfectly with your preferred choices",
      "a reliable addition to your usual basket"
    ]
  }
};

const crossSellMap = {
  beverages: ["snacks", "staples"],
  snacks: ["beverages", "dairy"],
  dairy: ["snacks", "staples"],
  "fruits-vegetables": ["staples", "beverages"],
  staples: ["fruits-vegetables", "dairy"],
  "baby-products": ["self-care", "dairy"],
  "self-care": ["baby-products", "staples"]
};

// 🧠 Natural Language Explanation Generator (Flirtatious Pick-up Lines)
function buildExplanation({ type, customer, product, cartCategories, ageGroup }) {
  const category = product.category ? product.category.toLowerCase() : 'item';

  const pickupLines = [
    `Are you a camera? Because every time I look at this ${category}, I smile.`,
    `Do you believe in love at first sight, or should I walk this ${category} by again?`,
    `I'm not a photographer, but I can definitely picture you with this ${category}.`,
    `Is it hot in here, or is it just the chemistry between you and this ${category}?`,
    `Hand over the cart, you've already stolen my heart... and this ${category} belongs in it.`,
    `If you were a triangle, you'd be acute one... just like this ${category} deal.`,
    `Stop! Drop everything. This ${category} is the missing piece to your puzzle.`,
    `Your cart looks like it's missing a soulmate. I think I found it: this ${category}.`,
    `Are you a magician? Because whenever I look at your cart, everyone else disappears except this ${category}.`,
    `I'm lost. Can you give me directions to your heart? I'll bring some ${category} along.`
  ];

  return pickupLines[Math.floor(Math.random() * pickupLines.length)];
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

// 📬 Support Request Routes
app.post("/api/support", async (req, res) => {
  try {
    console.log("Received support request:", req.body);
    const { customerId, customerName, email, subject, message, category } = req.body;
    const request = new SupportRequest({ customerId, customerName, email, subject, message, category });
    await request.save();
    console.log("Support request saved successfully");
    res.status(201).json({ message: "Request submitted successfully" });
  } catch (error) {
    console.error("Support submission error:", error);
    res.status(500).json({ error: "Failed to submit request" });
  }
});

app.get("/api/support", verifyToken, async (req, res) => {
  try {
    // Only Admin, Product Manager, or Sales Manager can view requests
    // Allow Customers to view their own requests, otherwise restrict to Managers
    if (req.user.role === 'Customer') {
      const requests = await SupportRequest.find({ customerId: req.user.id }).sort({ createdAt: -1 });
      return res.json(requests);
    }

    if (req.user.role !== 'Admin' && req.user.role !== 'Product Manager' && req.user.role !== 'Sales Manager') {
      return res.status(403).json({ error: "Access denied" });
    }
    let filter = {};
    if (req.user.role === 'Product Manager') {
      filter = { category: { $in: ['Product', 'Stock', 'Quality', 'General'] } };
    } else if (req.user.role === 'Sales Manager') {
      filter = { category: { $in: ['Order', 'Payment', 'Shipping', 'General'] } };
    }
    const requests = await SupportRequest.find(filter).sort({ createdAt: -1 });
    // Debug log to check adminReply presence
    if (req.user.role === 'Customer') {
      console.log(`Sending ${requests.length} tickets to customer ${req.user.id}. Sample:`, requests[0]);
    }
    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch requests" });
  }
});

app.put("/api/support/:id", verifyToken, async (req, res) => {
  try {
    // Allow Customers to resolve their own tickets
    if (req.user.role === 'Customer') {
      const ticket = await SupportRequest.findOne({ _id: req.params.id, customerId: req.user.id });
      if (!ticket) return res.status(404).json({ error: "Ticket not found" });

      if (req.body.status === 'Resolved') {
        ticket.status = 'Resolved';
        ticket.resolvedAt = new Date();
        await ticket.save();
        return res.json({ message: "Ticket resolved" });
      } else {
        return res.status(400).json({ error: "Customers can only resolve tickets" });
      }
    }

    if (req.user.role !== 'Admin' && req.user.role !== 'Product Manager' && req.user.role !== 'Sales Manager') {
      return res.status(403).json({ error: "Access denied" });
    }
    const { status, adminReply } = req.body;
    console.log(`[DEBUG] Received update for ticket ${req.params.id}:`, req.body);
    const updateData = { status };
    if (adminReply) {
      updateData.adminReply = adminReply;
      console.log(`Saving Admin Reply for ticket ${req.params.id}:`, adminReply);
    }
    if (status === 'Resolved') {
      updateData.resolvedAt = new Date();
    }

    const updatedTicket = await SupportRequest.findByIdAndUpdate(req.params.id, { $set: updateData }, { new: true });
    console.log("Updated Ticket:", updatedTicket);
    res.json({ message: "Status updated", updatedFields: updateData, ticket: updatedTicket });
  } catch (error) {
    res.status(500).json({ error: "Failed to update status" });
  }
});

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
    const currentAvgPrice = productsInCart.length > 0 ? currentCartValue / productsInCart.length : 0;
    console.log(`Current Cart Value: ${currentCartValue}, Avg Item Price: ${currentAvgPrice}`);

    // 🧠 Derive cart categories (normalized)
    const cartCategories = productsInCart.map(p =>
      p.category.toLowerCase()
    );



    // 🎯 Basket-aware but discovery-safe recommendation limit
    const avgBasketItems = customer.avgBasketItems || 3;

    // 🎯 Expanded limit for full-width layout
    let MAX_RECOMMENDATIONS = 4;

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
      productId: { $nin: currentCart },
      stock: { $gt: 0 }
    });


    fbtProducts.forEach(product => {
      let score = 4; // base FBT score

      // 🎯 Bonus if cart category matches
      if (cartCategories.includes(product.category.toLowerCase())) {
        score += 2;
      }

      // 🚀 UPSELL LOGIC: Boost score if this item increases basket value
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
        image: product.imageUrl || product.image_url,
        price: product.price,
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
        productId: { $nin: currentCart },
        stock: { $gt: 0 }
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
        image: product.imageUrl || product.image_url,
        price: product.price,
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
        productId: { $nin: currentCart },
        stock: { $gt: 0 }
      })
      : [];

    // 🧺 Cross-sell scoring (marketing nudge)
    crossSellProducts.forEach(product => {
      let score = 5; // weaker than preferences, stronger than fallback

      // Mild boost if preference exists
      if (customer.preferences?.get?.(product.category.toLowerCase())) {

        score += 1;
      }

      // 🚀 UPSELL LOGIC: Boost score if this item increases basket value
      if (product.price > currentAvgPrice) {
        score += 1.5;
      }

      // Cooldown penalty still applies
      if (recentlyRecommended.has(product.productId)) {
        score -= 2;
      }

      if (score <= 0) return;

      recommendations.push({
        productId: product.productId,
        name: product.name,
        image: product.imageUrl || product.image_url,
        price: product.price,
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


    let finalRecommendations = uniqueRecommendations
      .slice(0, MAX_RECOMMENDATIONS)
      .map(({ score, ...rest }) => rest);

    // 🛟 Safety net — ensure AT LEAST 2 recommendations if products exist in catalog
    if (finalRecommendations.length < 2) {
      const fallbackNeeded = 2 - finalRecommendations.length;
      const existingProductIds = [
        ...currentCart,
        ...finalRecommendations.map(r => r.productId)
      ];

      const fallbackProducts = await Product.find({
        productId: { $nin: existingProductIds },
        isActive: true,
        stock: { $gt: 0 }
      }).limit(fallbackNeeded);

      fallbackProducts.forEach(product => {
        finalRecommendations.push({
          productId: product.productId,
          name: product.name,
          image: product.imageUrl || product.image_url,
          price: product.price,
          reason: "Popular choice",
          message: buildExplanation({ type: "FALLBACK", customer: null, product, cartCategories: [] })
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

    // 🛡️ FINAL SAFEGUARD: Explicitly filter out any items currently in the cart
    // This catches any edge cases where MongoDB $nin might have missed due to type mismatches
    finalRecommendations = finalRecommendations.filter(item => !currentCart.includes(item.productId));

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
  .then(async () => {
    console.log("MongoDB connected successfully");
    await seedDatabase();
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


const seedDatabase = async () => {
  try {
    const count = await Product.countDocuments();
    if (count === 0) {
      console.log("No products found. Seeding database...");
      const datasetPath = path.join(__dirname, '../client/public/images/Dataset.json');
      if (fs.existsSync(datasetPath)) {
        const rawData = fs.readFileSync(datasetPath, 'utf8');
        const dataset = JSON.parse(rawData);

        // We need to map the dataset structure to the mongoose schema
        const productsToInsert = dataset.products.map(p => ({
          productId: `P${String(p.id).padStart(3, '0')}`,
          name: p.title,
          price: p.price,
          category: p.category,
          imageUrl: p.images && p.images.length > 0 ? p.images[0] : p.thumbnail,
          description: p.description,
          tags: p.tags,
          isActive: true,
          stock: p.stock !== undefined ? p.stock : (Math.floor(Math.random() * 100) + 10) // Use dataset stock or random
        }));

        await Product.insertMany(productsToInsert);
        console.log(`Database seeded with ${productsToInsert.length} products`);
      } else {
        console.log("Dataset.json not found at " + datasetPath);
      }
    } else {
      console.log(`Database already has ${count} products. Skipping seed.`);
    }
  } catch (err) {
    console.error("Seeding error:", err);
  }
};

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`FreshMart server running on port ${PORT}`);
});
