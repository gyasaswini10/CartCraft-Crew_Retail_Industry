const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        console.log(`Role Middleware - User Role: ${req.user?.role}, Allowed: ${allowedRoles}`);

        // Normalize roles to lowercase for case-insensitive comparison
        const normalizedUserRole = req.user?.role?.toLowerCase();
        const normalizedAllowedRoles = allowedRoles.map(r => r.toLowerCase());

        if (!req.user || !normalizedAllowedRoles.includes(normalizedUserRole)) {
            return res.status(403).json({ error: 'Access forbidden: Insufficient permissions' });
        }
        next();
    };
};

module.exports = authorizeRoles;
