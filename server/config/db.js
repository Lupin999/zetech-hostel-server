const mysql = require('mysql2/promise');

const sslEnabled = process.env.DB_SSL === 'true'
    || (process.env.NODE_ENV === 'production' && process.env.DB_SSL !== 'false');

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    // Production connections use verified TLS by default. Local development
    // can opt in with DB_SSL=true; DB_SSL=false explicitly disables TLS.
    ssl: sslEnabled
        ? {
            ...(process.env.DB_SSL_CA
                ? { ca: process.env.DB_SSL_CA.replace(/\\n/g, '\n') }
                : {}),
            rejectUnauthorized: true,
        }
        : false,
});

module.exports = pool;
