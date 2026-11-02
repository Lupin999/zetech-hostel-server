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

const findPaymentByCheckoutId = (checkoutId, userId) => {
    return pool.query(
        "SELECT p.*, b.user_id FROM payments p JOIN bookings b ON p.booking_id = b.id WHERE p.mpesa_code = ? AND b.user_id = ?",
        [checkoutId, userId]
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

const recordAdminVerifiedPayment = async ({ bookingId, amount, mpesaCode, adminId }) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [bookings] = await connection.query(
            `SELECT b.id, b.user_id, b.status, b.checked_out_at, r.price,
                r.room_number, r.hostel, u.full_name, u.reg_no
             FROM bookings b
             JOIN rooms r ON r.id = b.room_id
             JOIN users u ON u.id = b.user_id
             WHERE b.id = ? FOR UPDATE`,
            [bookingId]
        );
        if (!bookings.length || bookings[0].status !== 'approved' || bookings[0].checked_out_at) {
            await connection.rollback();
            return { error: 'An active approved booking is required to record a payment', status: 409 };
        }

        const [duplicates] = await connection.query(
            'SELECT id FROM payments WHERE mpesa_code = ? LIMIT 1 FOR UPDATE',
            [mpesaCode]
        );
        if (duplicates.length) {
            await connection.rollback();
            return { error: 'That M-Pesa receipt has already been recorded', status: 409 };
        }

        const [paidRows] = await connection.query(
            "SELECT COALESCE(SUM(amount), 0) AS amount_paid FROM payments WHERE booking_id = ? AND status = 'confirmed'",
            [bookingId]
        );
        const booking = bookings[0];
        const amountPaid = Number(paidRows[0].amount_paid);
        const amountDue = Number(booking.price);
        if (amount > amountDue - amountPaid + 0.001) {
            await connection.rollback();
            return {
                error: `Payment exceeds the remaining balance of KES ${Math.max(amountDue - amountPaid, 0).toLocaleString()}`,
                status: 400,
            };
        }

        const [payment] = await connection.query(
            `INSERT INTO payments (booking_id, amount, payment_method, mpesa_code, status)
             VALUES (?, ?, 'mpesa', ?, 'confirmed')`,
            [bookingId, amount, mpesaCode]
        );
        await connection.query(
            `INSERT INTO admin_audit_logs (actor_user_id, action, entity_type, entity_id, details)
             VALUES (?, 'payment.manually_verified', 'payment', ?, ?)`,
            [adminId, String(payment.insertId), JSON.stringify({
                booking_id: Number(bookingId),
                student_name: booking.full_name,
                registration_number: booking.reg_no,
                amount,
                mpesa_receipt: mpesaCode,
                verified_in_official_account: true,
            })]
        );
        await connection.query(
            'INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)',
            [
                booking.user_id,
                `Your M-Pesa payment of KES ${amount.toLocaleString()} for Room ${booking.room_number} has been verified by the hostel admin. Receipt: ${mpesaCode}.`,
                'payment',
            ]
        );
        await connection.commit();
        return {
            id: payment.insertId,
            userId: booking.user_id,
            roomNumber: booking.room_number,
            amount,
            mpesaCode,
        };
    } catch (error) {
        await connection.rollback();
        if (error.code === 'ER_DUP_ENTRY') {
            return { error: 'That M-Pesa receipt has already been recorded', status: 409 };
        }
        throw error;
    } finally {
        connection.release();
    }
};

module.exports = {
    createPayment, getPaymentsByBookingId, getStudentPayments, getAllPayments,
    findPaymentByCheckoutId, confirmByCheckoutId, updateMpesaCode,
    findPaymentWithDetails, findPaymentWithFullDetails, deletePendingByBookingId,
    deletePendingByCheckoutId, getApprovedBookingForPayment, getRoomNumberByBookingId,
    getBookingInfoForNotification, recordAdminVerifiedPayment
};
