const pool = require('../config/db');

const getNoticesByTarget = (hostel) => {
    return pool.query(
        `SELECT n.*, u.full_name AS author FROM notices n
         JOIN users u ON n.created_by = u.id
         WHERE n.title != 'BOOKING_STATUS'
         AND (n.target = 'all' ${hostel ? `OR n.target = ?` : ''})
         ORDER BY n.created_at DESC`,
        hostel ? [hostel] : []
    );
};

const getAllNotices = () => {
    return pool.query(
        `SELECT n.*, u.full_name AS author FROM notices n
         JOIN users u ON n.created_by = u.id
         WHERE n.title != 'BOOKING_STATUS'
         ORDER BY n.created_at DESC`
    );
};

const createNotice = (title, message, target, createdBy) => {
    return pool.query('INSERT INTO notices (title, message, target, created_by) VALUES (?, ?, ?, ?)', [title, message, target, createdBy]);
};

const deleteNotice = (id) => {
    return pool.query('DELETE FROM notices WHERE id = ?', [id]);
};

module.exports = { getAllNotices, getNoticesByTarget, createNotice, deleteNotice };
