const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    // SSL: set DB_SSL=true in .env to enable.
    // rejectUnauthorized defaults to true (verifies the server certificate).
    // Only set DB_SSL_REJECT_UNAUTHORIZED=false if you are connecting to a
    // self-signed cert and you understand the MITM risk.
    ssl: process.env.DB_SSL === 'true'
        ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' }
        : false,
});

module.exports = pool;
