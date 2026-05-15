const pool = require('../config/db');

const invalidateExisting = (phone) => {
    return pool.query('UPDATE otp_codes SET used = TRUE WHERE phone = ? AND used = FALSE', [phone]);
};

const createOtp = (phone, code, expiresAt) => {
    return pool.query('INSERT INTO otp_codes (phone, code, expires_at) VALUES (?, ?, ?)', [phone, code, expiresAt]);
};

const findValidOtp = (phone, code) => {
    return pool.query(
        'SELECT * FROM otp_codes WHERE phone = ? AND code = ? AND used = FALSE AND expires_at > NOW() ORDER BY id DESC LIMIT 1',
        [phone, code]
    );
};

const markUsed = (id) => {
    return pool.query('UPDATE otp_codes SET used = TRUE WHERE id = ?', [id]);
};

module.exports = { invalidateExisting, createOtp, findValidOtp, markUsed };
