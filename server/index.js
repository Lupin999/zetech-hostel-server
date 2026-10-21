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

// Trust the first proxy hop (required on Render/Heroku/Railway so req.ip
// reflects the real client IP rather than the load-balancer's 127.0.0.1)
app.set('trust proxy', 1);

app.get('/health', (req, res) => {
    res.status(200).send('ok');
});

// CORS — must be before helmet so preflight OPTIONS requests pass
// Set ALLOWED_ORIGINS in .env as a comma-separated list of allowed origins.
// e.g. ALLOWED_ORIGINS=https://zetech-hostel.netlify.app,http://localhost:5173
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : ['http://localhost:5173', 'http://localhost:4173', 'http://127.0.0.1:5173', 'http://127.0.0.1:4173'];

if (process.env.NODE_ENV === 'production' && !process.env.ALLOWED_ORIGINS) {
    logger.warn('ALLOWED_ORIGINS is not set — CORS will block all browser requests in production!');
}

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman, server-to-server)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Security headers (allow cross-origin images)
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(express.json());
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/api', require('./middleware/adminAudit'));

// Rate limit auth endpoints
const authLimiter = rateLimit({ windowMs: 60000, max: 5, message: 'Too many attempts, please wait a minute' });
// Tighter limit for admin creation — 3 attempts per 2 minutes
const adminCreateLimiter = rateLimit({ windowMs: 2 * 60000, max: 3, message: 'Too many admin creation attempts, please wait 2 minutes' });

// API docs & status
app.use('/api', require('./routes/api'));

// Routes
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/send-otp', authLimiter);
app.use('/api/auth/verify-otp', authLimiter);
app.use('/api/auth/create-admin', adminCreateLimiter);
app.use('/api/auth', require('./routes/auth'));
app.use('/api/rooms', require('./routes/rooms'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/notices', require('./routes/notices'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/health', require('./routes/health'));
app.use('/api/operations', require('./routes/operations'));

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
            // /api/ping is public — no auth required, won't 401
            https.get(process.env.RENDER_URL + '/api/ping', (res) => {
                logger.info('Keep alive ping sent');
            }).on('error', () => {
                logger.warn('Keep alive ping failed');
            });
        }, 14 * 60 * 1000);
    }
});
