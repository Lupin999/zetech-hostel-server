const pool = require('../config/db');

const createPayment = (bookingId, amount, paymentMethod, mpesaCode, status = 'pending') => {
    return pool.query(
        'INSERT INTO payments (booking_id, amount, payment_method, mpesa_code, status) VALUES (?, ?, ?, ?, ?)',
        [bookingId, amount, paymentMethod, mpesaCode || null, status]
    );
};

const getPaymentsByBookingId = (bookingId) => {
    return pool.query("SELECT id, status FROM payments WHERE booking_id = ?", [bookingId]);
};

const getStudentPayments = (userId) => {
    return pool.query(
        `SELECT p.*, r.room_number, r.hostel, b.semester
         FROM payments p
         JOIN bookings b ON p.booking_id = b.id
         JOIN rooms r ON b.room_id = r.id
         WHERE b.user_id = ? ORDER BY p.payment_date DESC`,
        [userId]
    );
};

const getAllPayments = () => {
    return pool.query(
        `SELECT p.*, r.room_number, r.hostel, b.semester,
         u.full_name, u.reg_no
         FROM payments p
         JOIN bookings b ON p.booking_id = b.id
         JOIN rooms r ON b.room_id = r.id
         JOIN users u ON b.user_id = u.id
         ORDER BY p.payment_date DESC`
    );
};

const updatePaymentStatus = (id, status) => {
    return pool.query("UPDATE payments SET status = ? WHERE id = ?", [status, id]);
};

const findPaymentByCheckoutId = (checkoutId) => {
    return pool.query(
        "SELECT p.*, b.user_id FROM payments p JOIN bookings b ON p.booking_id = b.id WHERE p.mpesa_code = ?",
        [checkoutId]
    );
};

const confirmByCheckoutId = (checkoutId) => {
    return pool.query("UPDATE payments SET status = 'confirmed' WHERE mpesa_code = ?", [checkoutId]);
};

const updateMpesaCode = (newCode, oldCode) => {
    return pool.query("UPDATE payments SET status = 'confirmed', mpesa_code = ? WHERE mpesa_code = ?", [newCode, oldCode]);
};

const findPaymentWithDetails = (id) => {
    return pool.query(
        `SELECT p.*, b.user_id, r.room_number FROM payments p
         JOIN bookings b ON p.booking_id = b.id
         JOIN rooms r ON b.room_id = r.id WHERE p.id = ?`, [id]
    );
};

const findPaymentWithFullDetails = (mpesaCode) => {
    return pool.query(
        `SELECT p.*, b.user_id, r.room_number, u.full_name, u.reg_no
         FROM payments p JOIN bookings b ON p.booking_id = b.id
         JOIN rooms r ON b.room_id = r.id JOIN users u ON b.user_id = u.id
         WHERE p.mpesa_code = ?`, [mpesaCode]
    );
};

const deletePendingByBookingId = (bookingId) => {
    return pool.query("DELETE FROM payments WHERE booking_id = ? AND status = 'pending'", [bookingId]);
};

const deletePendingByCheckoutId = (checkoutId) => {
    return pool.query("DELETE FROM payments WHERE mpesa_code = ? AND status = 'pending'", [checkoutId]);
};

const getApprovedBookingForPayment = (bookingId, userId) => {
    return pool.query(
        "SELECT b.*, r.room_number, r.price FROM bookings b JOIN rooms r ON b.room_id = r.id WHERE b.id = ? AND b.user_id = ? AND b.status = 'approved'",
        [bookingId, userId]
    );
};

const getRoomNumberByBookingId = (bookingId) => {
    return pool.query(
        'SELECT r.room_number FROM rooms r JOIN bookings b ON b.room_id = r.id WHERE b.id = ?',
        [bookingId]
    );
};

const getBookingInfoForNotification = (bookingId) => {
    return pool.query(
        `SELECT r.room_number, u.full_name, u.reg_no FROM bookings b
         JOIN rooms r ON b.room_id = r.id JOIN users u ON b.user_id = u.id
         WHERE b.id = ?`, [bookingId]
    );
};

module.exports = {
    createPayment, getPaymentsByBookingId, getStudentPayments, getAllPayments,
    updatePaymentStatus, findPaymentByCheckoutId, confirmByCheckoutId, updateMpesaCode,
    findPaymentWithDetails, findPaymentWithFullDetails, deletePendingByBookingId,
    deletePendingByCheckoutId, getApprovedBookingForPayment, getRoomNumberByBookingId,
    getBookingInfoForNotification
};
