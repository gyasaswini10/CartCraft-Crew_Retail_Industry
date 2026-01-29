const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const token = req.header('Authorization');
    console.log("Auth Middleware - Token received:", token ? "Yes" : "No");
    if (!token) return res.status(401).json({ error: 'Access denied' });

    try {
        // Remove "Bearer " if present
        const tokenString = token.startsWith('Bearer ') ? token.slice(7, token.length) : token;
        const verified = jwt.verify(tokenString, process.env.JWT_SECRET);
        req.user = verified;
        console.log("Auth Middleware - Verified User:", req.user);
        next();
    } catch (error) {
        console.error("Auth Middleware - Error:", error.message);
        res.status(400).json({ error: 'Invalid token' });
    }
};

module.exports = verifyToken;
