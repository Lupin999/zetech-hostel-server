const pool = require('../config/db');

const listStudents = (search) => pool.query(
    `SELECT u.id, u.reg_no, u.email, u.phone, u.full_name, u.role, u.campus, u.course, u.created_at,
        (SELECT CONCAT(r.hostel, ' / ', r.room_number) FROM bookings b JOIN rooms r ON r.id = b.room_id
         WHERE b.user_id = u.id AND b.status = 'approved' ORDER BY b.created_at DESC LIMIT 1) AS current_room
     FROM users u
    WHERE (? = '' OR u.full_name LIKE ? OR u.reg_no LIKE ? OR u.email LIKE ?)
     ORDER BY u.full_name LIMIT 250`,
    [search, `%${search}%`, `%${search}%`, `%${search}%`]
);

const updateRole = (userId, role) => pool.query('UPDATE users SET role = ? WHERE id = ?', [role, userId]);

const listStays = () => pool.query(
    `SELECT b.id, b.user_id, b.room_id, b.semester, b.arrival_date, b.departure_date,
        b.checked_in_at, b.checked_out_at, r.room_number, r.hostel, bd.bed_number,
        u.full_name, u.reg_no,
        (SELECT COUNT(*) FROM payments p WHERE p.booking_id = b.id AND p.status = 'confirmed') AS confirmed_payments
     FROM bookings b JOIN users u ON u.id = b.user_id JOIN rooms r ON r.id = b.room_id
     LEFT JOIN beds bd ON bd.id = b.bed_id
    WHERE b.status IN ('approved', 'completed') ORDER BY b.arrival_date IS NULL, b.arrival_date, b.id DESC`
);

const checkIn = (bookingId) => pool.query(
    `UPDATE bookings SET checked_in_at = CURRENT_TIMESTAMP
     WHERE id = ? AND status = 'approved' AND checked_in_at IS NULL AND checked_out_at IS NULL
       AND EXISTS (SELECT 1 FROM payments p WHERE p.booking_id = bookings.id AND p.status = 'confirmed')`,
    [bookingId]
);

const checkOut = (bookingId) => pool.query(
    `UPDATE bookings SET checked_out_at = CURRENT_TIMESTAMP, status = 'completed'
     WHERE id = ? AND status = 'approved' AND checked_in_at IS NOT NULL AND checked_out_at IS NULL`,
    [bookingId]
);

const getStayBed = (bookingId) => pool.query(
    'SELECT bed_id FROM bookings WHERE id = ? AND status = \'approved\' AND checked_in_at IS NOT NULL AND checked_out_at IS NULL',
    [bookingId]
);

const updateStayDates = (bookingId, arrivalDate, departureDate) => pool.query(
    `UPDATE bookings SET arrival_date = ?, departure_date = ?
     WHERE id = ? AND status = 'approved' AND checked_out_at IS NULL`,
    [arrivalDate || null, departureDate || null, bookingId]
);

const updateBedStatus = (bedId, status) => pool.query('UPDATE beds SET status = ? WHERE id = ?', [status, bedId]);

const getStudentRoom = (userId, roomId) => pool.query(
    `SELECT r.id FROM bookings b JOIN rooms r ON r.id = b.room_id
    WHERE b.user_id = ? AND b.status = 'approved' AND b.checked_out_at IS NULL AND (? IS NULL OR r.id = ?)
     ORDER BY b.created_at DESC LIMIT 1`,
    [userId, roomId || null, roomId || null]
);

const createRequest = ({ userId, roomId, requestType, title, description, priority }) => pool.query(
    `INSERT INTO maintenance_requests (user_id, room_id, request_type, title, description, priority)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, roomId, requestType, title, description, priority]
);

const listRequests = (userId) => pool.query(
    `SELECT m.*, u.full_name, u.reg_no, r.room_number, r.hostel
     FROM maintenance_requests m JOIN users u ON u.id = m.user_id
     LEFT JOIN rooms r ON r.id = m.room_id
     WHERE (? IS NULL OR m.user_id = ?)
     ORDER BY FIELD(m.status, 'open', 'in_progress', 'resolved', 'closed'), m.created_at DESC`,
    [userId || null, userId || null]
);

const updateRequest = (id, { status, resolution, assignedTo }) => pool.query(
    `UPDATE maintenance_requests SET status = ?, resolution = ?, assigned_to = ?,
        resolved_at = IF(? IN ('resolved', 'closed'), COALESCE(resolved_at, CURRENT_TIMESTAMP), NULL)
     WHERE id = ?`,
    [status, resolution || null, assignedTo || null, status, id]
);

const createVisitor = ({ residentId, visitorName, visitorPhone, purpose }) => pool.query(
    `INSERT INTO visitor_logs (resident_id, visitor_name, visitor_phone, purpose)
     VALUES (?, ?, ?, ?)`,
    [residentId, visitorName, visitorPhone || null, purpose]
);

const listVisitors = (residentId) => pool.query(
    `SELECT v.*, resident.full_name AS resident_name, resident.reg_no, recorder.full_name AS recorded_by_name
     FROM visitor_logs v JOIN users resident ON resident.id = v.resident_id
     LEFT JOIN users recorder ON recorder.id = v.recorded_by
     WHERE (? IS NULL OR v.resident_id = ?)
     ORDER BY v.created_at DESC LIMIT 500`,
    [residentId || null, residentId || null]
);

const getVisitor = (id) => pool.query('SELECT * FROM visitor_logs WHERE id = ?', [id]);

const listInspections = () => pool.query(
    `SELECT i.*, r.room_number, r.hostel, r.campus, r.status AS room_status, u.full_name AS inspector_name
     FROM room_inspections i JOIN rooms r ON r.id = i.room_id
     LEFT JOIN users u ON u.id = i.inspected_by
     ORDER BY i.inspected_at DESC LIMIT 500`
);

const createInspection = async ({ roomId, inspectorId, conditionStatus, cleanliness, safetyStatus, notes }) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [result] = await connection.query(
            `INSERT INTO room_inspections (room_id, inspected_by, condition_status, cleanliness, safety_status, notes)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [roomId, inspectorId, conditionStatus, cleanliness, safetyStatus, notes || null]
        );
        if (conditionStatus === 'uninhabitable') {
            await connection.query("UPDATE rooms SET status = 'maintenance' WHERE id = ?", [roomId]);
        }
        await connection.commit();
        return [{ insertId: result.insertId }];
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

const updateRoomStatus = (roomId, status) => pool.query('UPDATE rooms SET status = ? WHERE id = ?', [status, roomId]);

const updateVisitorStatus = (id, status, actorId) => pool.query(
    `UPDATE visitor_logs SET status = ?, recorded_by = ?,
        arrival_at = IF(? = 'checked_in', COALESCE(arrival_at, CURRENT_TIMESTAMP), arrival_at),
        departure_at = IF(? = 'checked_out', CURRENT_TIMESTAMP, departure_at)
     WHERE id = ?`,
    [status, actorId, status, status, id]
);

const getPaymentReceipt = (paymentId, userId) => pool.query(
    `SELECT p.id, p.amount, p.payment_method, p.mpesa_code, p.payment_date, p.status,
        b.id AS booking_id, b.semester, u.full_name, u.reg_no, r.room_number, r.hostel, r.campus
     FROM payments p JOIN bookings b ON b.id = p.booking_id JOIN users u ON u.id = b.user_id
     JOIN rooms r ON r.id = b.room_id
     WHERE p.id = ? AND (? IS NULL OR b.user_id = ?)`,
    [paymentId, userId || null, userId || null]
);

const getPaymentReport = (from, to) => pool.query(
    `SELECT p.id, p.booking_id, p.amount, p.payment_method, p.mpesa_code, p.status, p.payment_date,
        u.full_name, u.reg_no, r.room_number, r.hostel
     FROM payments p JOIN bookings b ON b.id = p.booking_id
     JOIN users u ON u.id = b.user_id JOIN rooms r ON r.id = b.room_id
     WHERE p.payment_date >= ? AND p.payment_date < DATE_ADD(?, INTERVAL 1 DAY)
     ORDER BY p.payment_date DESC`,
    [from, to]
);

const getBalances = (userId) => pool.query(
    `SELECT b.id AS booking_id, b.user_id, b.semester, b.arrival_date, b.departure_date,
        u.full_name, u.reg_no, r.room_number, r.hostel, r.price AS amount_due,
        COALESCE(SUM(CASE WHEN p.status = 'confirmed' THEN p.amount ELSE 0 END), 0) AS amount_paid,
        GREATEST(r.price - COALESCE(SUM(CASE WHEN p.status = 'confirmed' THEN p.amount ELSE 0 END), 0), 0) AS balance
     FROM bookings b JOIN users u ON u.id = b.user_id JOIN rooms r ON r.id = b.room_id
     LEFT JOIN payments p ON p.booking_id = b.id
    WHERE b.status IN ('approved', 'completed') AND (? IS NULL OR b.user_id = ?)
     GROUP BY b.id, u.id, r.id ORDER BY u.full_name, b.created_at DESC`,
    [userId || null, userId || null]
);

const getOverview = (from, to) => Promise.all([
    pool.query(
        `SELECT status, COUNT(*) AS total FROM bookings
         WHERE created_at >= ? AND created_at < DATE_ADD(?, INTERVAL 1 DAY) GROUP BY status`, [from, to]
    ),
    pool.query(
        `SELECT COUNT(*) AS rooms, COALESCE(SUM(capacity), 0) AS beds,
            COALESCE(SUM((SELECT COUNT(*) FROM beds bd WHERE bd.room_id = r.id AND bd.status = 'occupied')), 0) AS occupied
         FROM rooms r WHERE r.status <> 'maintenance'`
    ),
    pool.query(
        `SELECT COALESCE(SUM(CASE WHEN status = 'confirmed' THEN amount ELSE 0 END), 0) AS collected,
            COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) AS pending
         FROM payments WHERE payment_date >= ? AND payment_date < DATE_ADD(?, INTERVAL 1 DAY)`, [from, to]
    ),
    pool.query("SELECT status, COUNT(*) AS total FROM maintenance_requests GROUP BY status"),
    pool.query("SELECT COUNT(*) AS total FROM visitor_logs WHERE status = 'checked_in'")
]).then(([[bookings], [rooms], [payments], [requests], [visitors]]) => ({
    bookings,
    rooms: rooms[0],
    payments: payments[0],
    requests,
    visitors_checked_in: visitors[0].total,
    from,
    to,
}));

const writeAuditLog = ({ actorId, action, entityType, entityId, details }) => pool.query(
    `INSERT INTO admin_audit_logs (actor_user_id, action, entity_type, entity_id, details)
     VALUES (?, ?, ?, ?, ?)`,
    [actorId || null, action, entityType, entityId || null, details ? JSON.stringify(details) : null]
);

const listAuditLogs = () => pool.query(
    `SELECT a.*, u.full_name AS actor_name, u.email AS actor_email
     FROM admin_audit_logs a LEFT JOIN users u ON u.id = a.actor_user_id
     ORDER BY a.created_at DESC LIMIT 500`
);

module.exports = {
    listStudents, updateRole, listStays, checkIn, checkOut, getStayBed, updateStayDates, updateBedStatus, getStudentRoom,
    createRequest, listRequests, updateRequest, createVisitor, listVisitors,
    getVisitor, updateVisitorStatus, listInspections, createInspection, updateRoomStatus, getPaymentReceipt,
    getPaymentReport, getBalances, getOverview, writeAuditLog, listAuditLogs,
};