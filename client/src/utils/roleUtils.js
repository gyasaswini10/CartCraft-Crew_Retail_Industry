// Helper function for case-insensitive role checking
export const hasRole = (userRole, ...allowedRoles) => {
    if (!userRole) return false;
    const normalizedUserRole = userRole.toLowerCase();
    return allowedRoles.some(role => role.toLowerCase() === normalizedUserRole);
};

// Helper function to check if user has any management role
export const isManager = (userRole) => {
    return hasRole(userRole, 'Admin', 'Product Manager', 'ProductManager', 'Sales Manager', 'SalesManager');
};
