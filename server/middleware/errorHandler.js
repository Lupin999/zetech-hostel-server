const logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
    logger.error(`${req.method} ${req.path} — ${err.message}`, { stack: err.stack });

    if (err.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ error: 'Duplicate entry — resource already exists' });
    }

    const status = err.status || 500;
    const message = status === 500 ? 'Internal server error' : err.message;

    res.status(status).json({ error: message });
}

module.exports = errorHandler;
