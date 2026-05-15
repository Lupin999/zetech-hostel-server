const pool = require('../config/db');

const getActiveBooking = (userId) => {
    return pool.query(
        `SELECT b.*, r.room_number, r.hostel, r.price, bd.bed_number, bd.position
         FROM bookings b JOIN rooms r ON b.room_id = r.id
         LEFT JOIN beds bd ON b.bed_id = bd.id
         WHERE b.user_id = ? AND b.status IN ('pending','approved')
         ORDER BY b.created_at DESC LIMIT 1`,
        [userId]
    );
};

const getStudentBookings = (userId) => {
    return pool.query(
        `SELECT b.*, r.room_number, r.hostel, r.campus, r.price, r.room_type,
         bd.bed_number, bd.position AS bed_position
         FROM bookings b JOIN rooms r ON b.room_id = r.id
         LEFT JOIN beds bd ON b.bed_id = bd.id
         WHERE b.user_id = ? ORDER BY b.created_at DESC`,
        [userId]
    );
};

const getAllBookings = () => {
    return pool.query(
        `SELECT b.*, r.room_number, r.hostel, r.campus, r.price,
         u.full_name, u.reg_no, u.email,
         bd.bed_number, bd.position AS bed_position,
         p.status AS payment_status, p.amount AS payment_amount
         FROM bookings b
         JOIN rooms r ON b.room_id = r.id
         JOIN users u ON b.user_id = u.id
         LEFT JOIN beds bd ON b.bed_id = bd.id
         LEFT JOIN payments p ON p.booking_id = b.id
         ORDER BY b.created_at DESC`
    );
};

const checkExistingBooking = (userId) => {
    return pool.query(
        "SELECT id FROM bookings WHERE user_id = ? AND status IN ('pending','approved')",
        [userId]
    );
};

const createBooking = (userId, roomId, bedId, semester, arrivalDate) => {
    return pool.query(
        'INSERT INTO bookings (user_id, room_id, bed_id, semester, arrival_date) VALUES (?, ?, ?, ?, ?)',
        [userId, roomId, bedId || null, semester, arrivalDate || null]
    );
};

const getBookingById = (id) => {
    return pool.query(
        `SELECT b.*, r.room_number, bd.bed_number, u.full_name, u.reg_no
         FROM bookings b JOIN rooms r ON b.room_id = r.id
         LEFT JOIN beds bd ON b.bed_id = bd.id
         JOIN users u ON b.user_id = u.id
         WHERE b.id = ?`, [id]
    );
};

const getBookingByIdAndUser = (id, userId) => {
    return pool.query('SELECT * FROM bookings WHERE id = ? AND user_id = ?', [id, userId]);
};

const updateBookingStatus = (id, status) => {
    return pool.query('UPDATE bookings SET status = ? WHERE id = ?', [status, id]);
};

const suspendBooking = (id, suspended, reason) => {
    return pool.query('UPDATE bookings SET suspended = ?, suspend_reason = ? WHERE id = ?',
        [suspended, suspended ? (reason || null) : null, id]);
};

const getApprovedBookingWithDetails = (id) => {
    return pool.query(
        `SELECT b.*, r.room_number, u.full_name FROM bookings b
         JOIN rooms r ON b.room_id = r.id JOIN users u ON b.user_id = u.id
         WHERE b.id = ? AND b.status = 'approved'`, [id]
    );
};

const getApprovedCount = (roomId) => {
    return pool.query(
        "SELECT COUNT(*) AS count FROM bookings WHERE room_id = ? AND status = 'approved'",
        [roomId]
    );
};

const deleteBooking = (id) => {
    return pool.query('DELETE FROM bookings WHERE id = ?', [id]);
};

const getBookingStatus = () => {
    return pool.query("SELECT message FROM notices WHERE title = 'BOOKING_STATUS' LIMIT 1");
};

const setBookingStatus = (open, userId) => {
    return pool.query("SELECT id FROM notices WHERE title = 'BOOKING_STATUS'").then(async ([existing]) => {
        if (existing.length) {
            return pool.query("UPDATE notices SET message = ? WHERE title = 'BOOKING_STATUS'", [open ? 'open' : 'closed']);
        } else {
            return pool.query("INSERT INTO notices (title, message, created_by) VALUES ('BOOKING_STATUS', ?, ?)", [open ? 'open' : 'closed', userId]);
        }
    });
};

const getStudentHostel = (userId) => {
    return pool.query(
        `SELECT r.hostel FROM bookings b JOIN rooms r ON b.room_id = r.id
         WHERE b.user_id = ? AND b.status IN ('pending','approved')
         ORDER BY b.created_at DESC LIMIT 1`, [userId]
    );
};

module.exports = {
    getActiveBooking, getStudentBookings, getAllBookings, checkExistingBooking,
    createBooking, getBookingById, getBookingByIdAndUser, updateBookingStatus,
    suspendBooking, getApprovedBookingWithDetails, getApprovedCount, deleteBooking,
    getBookingStatus, setBookingStatus, getStudentHostel
};
