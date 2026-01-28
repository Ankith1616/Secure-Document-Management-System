/**
 * Role-Based Access Control Middleware
 */
function requireRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                error: 'Access denied',
                message: `This action requires one of: ${allowedRoles.join(', ')}`
            });
        }

        next();
    };
}

/**
 * Check if user is Manager or Admin
 */
function isManagerOrAdmin(req, res, next) {
    return requireRole('MANAGER', 'ADMIN')(req, res, next);
}

/**
 * Check if user is Admin
 */
function isAdmin(req, res, next) {
    return requireRole('ADMIN')(req, res, next);
}

module.exports = {
    requireRole,
    isManagerOrAdmin,
    isAdmin
};
