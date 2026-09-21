const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const required = [
    'PORT',
    'DB_HOST',
    'DB_USER',
    'DB_NAME',
    'JWT_SECRET',
    'SMTP_EMAIL',
    'SMTP_PASSWORD',
    'MPESA_CONSUMER_KEY',
    'MPESA_CONSUMER_SECRET',
    'MPESA_SHORTCODE',
    'MPESA_PASSKEY',
    'MPESA_CALLBACK_URL',
];

// Optional but warned-about in production
const recommended = ['ALLOWED_ORIGINS', 'RENDER_URL'];

function validateEnv() {
    const missing = required.filter(key => !process.env[key]);
    if (missing.length) {
        console.error('\n❌ Missing required environment variables:\n');
        missing.forEach(key => console.error(`   - ${key}`));
        console.error('\n   Add them to your .env file and restart the server.\n');
        process.exit(1);
    }

    if (process.env.JWT_SECRET === 'your_jwt_secret_key_change_this') {
        console.warn('\n⚠️  WARNING: Using default JWT_SECRET. Change it in .env for production!\n');
    }

    if (process.env.NODE_ENV === 'production') {
        const missingRec = recommended.filter(k => !process.env[k]);
        if (missingRec.length) {
            missingRec.forEach(k => console.warn(`⚠️  Recommended env var not set: ${k}`));
        }
    }
}

module.exports = validateEnv;
