const rateLimitStore = new Map();

function rateLimit({ windowMs = 60000, max = 10, message = 'Too many requests, please try again later' } = {}) {
    return (req, res, next) => {
        const key = req.ip + req.path;
        const now = Date.now();
        const record = rateLimitStore.get(key);

        if (!record || now - record.start > windowMs) {
            rateLimitStore.set(key, { start: now, count: 1 });
            return next();
        }

        record.count++;
        if (record.count > max) {
            return res.status(429).json({ error: message });
        }

        next();
    };
}

// Clean up old entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, val] of rateLimitStore) {
        if (now - val.start > 300000) rateLimitStore.delete(key);
    }
}, 300000);

module.exports = rateLimit;
