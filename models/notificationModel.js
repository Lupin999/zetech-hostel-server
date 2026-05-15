const pool = require('../config/db');

const createNotification = (userId, message, type = 'general') => {
    return pool.query('INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)', [userId, message, type]);
};

const getUserNotifications = (userId) => {
    return pool.query('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC', [userId]);
};

const markAllRead = (userId) => {
    return pool.query('UPDATE notifications SET is_read = TRUE WHERE user_id = ?', [userId]);
};

module.exports = { createNotification, getUserNotifications, markAllRead };
