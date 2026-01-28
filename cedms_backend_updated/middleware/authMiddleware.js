const jwt = require('jsonwebtoken');
const rbac = require('../data/rbac.json');

const SECRET_KEY = process.env.JWT_SECRET || 'super_secret_key_change_me_in_prod';

const authenticate = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Access denied. No token provided.' });

    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        req.user = decoded;
        next();
    } catch (ex) {
        res.status(400).json({ error: 'Invalid token.' });
    }
};

const authorize = (resource, action) => {
    return (req, res, next) => {
        if (!req.user) return res.status(401).json({ error: 'User not authenticated' });

        const userRole = req.user.role;
        const permissions = rbac.permissions[userRole];

        if (!permissions || !permissions[resource]) {
            return res.status(403).json({ error: 'Access denied. no resource perm' });
        }

        // Check strict match or ownership suffix
        const resourcePerms = permissions[resource];
        const hasPermission = resourcePerms.includes(action) ||
            resourcePerms.some(p => p === `${action}_own`);

        if (hasPermission) {
            next();
        } else {
            res.status(403).json({ error: 'Access denied. Action not allowed.' });
        }
    };
};

module.exports = { authenticate, authorize, SECRET_KEY };
