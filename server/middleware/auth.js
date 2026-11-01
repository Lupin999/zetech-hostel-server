const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const logger = require('../utils/logger');

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Access token required' });
    jwt.verify(token, process.env.JWT_SECRET, async (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid or expired token' });
        try {
            const [users] = await pool.query('SELECT id, role FROM users WHERE id = ?', [user.id]);
            if (!users.length) return res.status(401).json({ error: 'Account no longer exists' });
            req.user = { ...user, role: users[0].role };
            next();
        } catch (error) {
            logger.error('AUTHENTICATE TOKEN ERROR', {
                message: error.message,
                stack: error.stack,
            });
            res.status(500).json({ error: 'Could not verify account access' });
        }
    });
}

function requireAdmin(req, res, next) {
    if (!['admin', 'accounts', 'warden'].includes(req.user.role)) return res.status(403).json({ error: 'Admin access required' });
    next();
}

function requireRole(...roles) {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Your role cannot perform this action' });
        next();
    };
}

module.exports = { authenticateToken, requireAdmin, requireRole };
