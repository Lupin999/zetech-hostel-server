const pool = require('../config/db');

const createUser = (reg_no, email, phone, full_name, password_hash, campus, role = 'student') => {
    return pool.query(
        'INSERT INTO users (reg_no, email, phone, full_name, password_hash, role, campus) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [reg_no, email, phone || null, full_name, password_hash, role, campus]
    );
};

const findByEmail = (email) => {
    return pool.query('SELECT * FROM users WHERE email = ?', [email]);
};

const findById = (id) => {
    return pool.query('SELECT id, reg_no, email, phone, full_name, role, campus, course FROM users WHERE id = ?', [id]);
};

const findByPhone = (phone) => {
    return pool.query('SELECT * FROM users WHERE phone = ?', [phone]);
};

const updatePassword = (id, password_hash) => {
    return pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [password_hash, id]);
};

const updateProfile = (id, full_name, course, phone, email) => {
    if (email) {
        return pool.query('UPDATE users SET full_name = ?, course = ?, phone = ?, email = ? WHERE id = ?', [full_name, course || null, phone || null, email, id]);
    }
    return pool.query('UPDATE users SET full_name = ?, course = ?, phone = ? WHERE id = ?', [full_name, course || null, phone || null, id]);
};

const findByRole = (...roles) => {
    return pool.query(`SELECT id FROM users WHERE role IN (${roles.map(() => '?').join(',')})`, roles);
};

const findNameById = (id) => {
    return pool.query('SELECT full_name, reg_no FROM users WHERE id = ?', [id]);
};

module.exports = { createUser, findByEmail, findById, findByPhone, updatePassword, updateProfile, findByRole, findNameById };
