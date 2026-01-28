const jwt = require('jsonwebtoken');

const JWT_SECRET = 'cedms-super-secret-key-2026-academic-project'; // In production, use env variable

/**
 * JWT Authentication Middleware
 */
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user; // { id, username, role }
        next();
    });
}

/**
 * Generate JWT token
 */
function generateToken(user) {
    return jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
    );
}

module.exports = {
    authenticateToken,
    generateToken,
    JWT_SECRET
};
