const validateEnv = require('./config/env');
validateEnv();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const rateLimit = require('./middleware/rateLimit');

const app = express();

// CORS — must be before helmet so preflight OPTIONS requests pass
app.use(cors());

// Security headers (allow cross-origin images)
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(express.json());
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Rate limit auth endpoints
const authLimiter = rateLimit({ windowMs: 60000, max: 5, message: 'Too many attempts, please wait a minute' });

// API docs & status
app.use('/api', require('./routes/api'));

// Routes
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/send-otp', authLimiter);
app.use('/api/auth/verify-otp', authLimiter);
app.use('/api/auth', require('./routes/auth'));
app.use('/api/rooms', require('./routes/rooms'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/notices', require('./routes/notices'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/health', require('./routes/health'));

// DB test (dev only)
if (process.env.NODE_ENV !== 'production') {
    app.get('/api/db-test', async (req, res) => {
        try {
            const pool = require('./config/db');
            const [rows] = await pool.query('SHOW TABLES');
            res.json({ connected: true, tables: rows });
        } catch (error) {
            res.json({ connected: false, error: error.message });
        }
    });
}

// Central error handler (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
    logger.info(`Server running on port ${PORT}`);

    if (process.env.NODE_ENV === 'production') {
        const https = require('https');
        setInterval(() => {
            https.get(process.env.RENDER_URL + '/health', (res) => {
                console.log('Keep alive ping sent');
            }).on('error', (err) => {
                console.log('Keep alive ping failed');
            });
        }, 14 * 60 * 1000);
    }
});
