const express = require('express');
const router = express.Router();
const Product = require("../models/Product");
const verifyToken = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');
const fs = require('fs');
const path = require('path');

// Get All Products (Admin, Sales Manager, Customer)
// Only Admin and Sales Manager might want detailed lists, but Customer needs to browse too.
router.get('/', async (req, res) => {
    try {
        const products = await Product.find();
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});

// Add Product (Admin, Product Manager)
router.post('/', verifyToken, authorizeRoles('Admin', 'Product Manager', 'Sales Manager', 'SalesManager'), async (req, res) => {
    try {
        console.log("POST /api/products - Body:", req.body);
        const product = new Product(req.body);
        await product.save();
        res.status(201).json({ message: 'Product added successfully', product });
    } catch (error) {
        console.error("POST /api/products - Error:", error);
        res.status(400).json({ error: 'Failed to add product', details: error.message });
    }
});

// Update Product (Admin, Product Manager)
router.put('/:id', verifyToken, authorizeRoles('Admin', 'Product Manager'), async (req, res) => {
    try {
        const product = await Product.findOneAndUpdate({ productId: req.params.id }, req.body, { new: true });
        if (!product) return res.status(404).json({ error: 'Product not found' });
        res.json({ message: 'Product updated successfully', product });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update product' });
    }
});

// Delete Product (Admin, Product Manager)
router.delete('/:id', verifyToken, authorizeRoles('Admin', 'Product Manager'), async (req, res) => {
    try {
        const product = await Product.findOneAndDelete({ productId: req.params.id });
        if (!product) return res.status(404).json({ error: 'Product not found' });
        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete product' });
    }
});

// Import Products from Dataset (Admin only)
router.post('/import-dataset', verifyToken, authorizeRoles('Admin'), async (req, res) => {
    try {
        // Read dataset.json file
        const datasetPath = path.join(__dirname, '../../client/public/images/Dataset.json');
        const rawData = fs.readFileSync(datasetPath, 'utf8');
        const dataset = JSON.parse(rawData);

        let importedCount = 0;
        let skippedCount = 0;

        for (const productData of dataset.products) {
            try {
                // Check if product already exists
                const existingProduct = await Product.findOne({ productId: `P${String(productData.id).padStart(3, '0')}` });

                if (existingProduct) {
                    skippedCount++;
                    continue;
                }

                // Map dataset fields to database schema
                const today = new Date().toISOString().split('T')[0];
                const nextYear = new Date();
                nextYear.setFullYear(nextYear.getFullYear() + 1);
                const expiry = nextYear.toISOString().split('T')[0];

                // Inside your /import-dataset route
                const newProduct = new Product({
                    productId: `P${String(productData.id).padStart(3, '0')}`, // Matches your Brain
                    name: productData.title,                                   // Matches your Brain
                    price: productData.price,                                  // Matches your Brain
                    category: productData.category,
                    imageUrl: productData.images?.[0] || productData.thumbnail, // Matches your Brain
                    description: productData.description,
                    tags: productData.tags,
                    stock: productData.stock !== undefined ? productData.stock : Math.floor(Math.random() * 96) + 5, // Random 5-100
                    isActive: true
                });

                await newProduct.save();
                importedCount++;

            } catch (error) {
                console.error(`Error importing product ${productData.id}:`, error.message);
            }
        }

        res.json({
            message: 'Import completed',
            imported: importedCount,
            skipped: skippedCount,
            total: dataset.products.length
        });

    } catch (error) {
        res.status(500).json({ error: 'Failed to import dataset', details: error.message });
    }
});

module.exports = router;
