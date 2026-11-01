const defaultOrigins = [
    'https://zetechhostel.netlify.app',
    'http://localhost:5173',
    'http://localhost:4173',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:4173',
];

const getAllowedOrigins = (configuredOrigins = process.env.ALLOWED_ORIGINS) => [
    ...new Set([
        ...defaultOrigins,
        ...(configuredOrigins || '').split(',').map((origin) => origin.trim()).filter(Boolean),
    ]),
];

module.exports = { getAllowedOrigins };
