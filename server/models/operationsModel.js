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

const getUserRoleDetails = (userId) => pool.query(
    'SELECT id, full_name, reg_no, role FROM users WHERE id = ?',
    [userId]
);

const listStays = () => pool.query(
    `SELECT b.id, b.user_id, b.room_id, b.semester, b.arrival_date, b.departure_date,
        b.checked_in_at, b.checked_out_at, r.room_number, r.hostel, bd.bed_number,
        u.full_name, u.reg_no,
        (SELECT COUNT(*) FROM payments p WHERE p.booking_id = b.id AND p.status = 'confirmed') AS confirmed_payments
     FROM bookings b JOIN users u ON u.id = b.user_id JOIN rooms r ON r.id = b.room_id
     LEFT JOIN beds bd ON bd.id = b.bed_id
    WHERE b.status = 'approved' ORDER BY b.arrival_date IS NULL, b.arrival_date, b.id DESC`
);

const listStayHistory = (search = '') => pool.query(
    `SELECT b.id, b.semester, b.arrival_date, b.departure_date, b.checked_in_at, b.checked_out_at,
        r.room_number, r.hostel, r.campus, bd.bed_number, u.full_name, u.reg_no,
        (SELECT COUNT(*) FROM payments p WHERE p.booking_id = b.id AND p.status = 'confirmed') AS confirmed_payments
     FROM bookings b JOIN users u ON u.id = b.user_id JOIN rooms r ON r.id = b.room_id
     LEFT JOIN beds bd ON bd.id = b.bed_id
     WHERE b.status = 'completed' AND b.checked_out_at IS NOT NULL
       AND (? = '' OR u.full_name LIKE ? OR u.reg_no LIKE ? OR b.semester LIKE ? OR r.room_number LIKE ?)
     ORDER BY b.checked_out_at DESC, b.id DESC LIMIT 1000`,
    [search, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`]
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

const getStudentCurrentStay = (userId) => pool.query(
    `SELECT b.id, b.room_id, r.room_number, r.hostel, r.campus, b.semester
     FROM bookings b JOIN rooms r ON r.id = b.room_id
     WHERE b.user_id = ? AND b.status = 'approved'
       AND b.checked_in_at IS NOT NULL AND b.checked_out_at IS NULL
     ORDER BY b.checked_in_at DESC LIMIT 1`,
    [userId]
);

const createCheckoutRequest = async ({ bookingId, userId, reason }) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [stays] = await connection.query(
            `SELECT id FROM bookings WHERE id = ? AND user_id = ? AND status = 'approved'
             AND checked_in_at IS NOT NULL AND checked_out_at IS NULL FOR UPDATE`,
            [bookingId, userId]
        );
        if (!stays.length) {
            await connection.rollback();
            return { error: 'An active checked-in stay is required to request checkout', status: 409 };
        }
        const [pending] = await connection.query(
            "SELECT id FROM checkout_requests WHERE booking_id = ? AND status = 'pending' FOR UPDATE",
            [bookingId]
        );
        if (pending.length) {
            await connection.rollback();
            return { error: 'A checkout request is already awaiting review', status: 409 };
        }
        const [result] = await connection.query(
            'INSERT INTO checkout_requests (booking_id, user_id, reason) VALUES (?, ?, ?)',
            [bookingId, userId, reason || null]
        );
        await connection.commit();
        return { id: result.insertId };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

const listCheckoutRequests = (userId) => pool.query(
    `SELECT c.*, b.semester, b.arrival_date, b.checked_in_at,
        u.full_name, u.reg_no, r.room_number, r.hostel, r.campus, bd.bed_number,
        reviewer.full_name AS reviewer_name
     FROM checkout_requests c
     JOIN bookings b ON b.id = c.booking_id JOIN users u ON u.id = c.user_id
     JOIN rooms r ON r.id = b.room_id LEFT JOIN beds bd ON bd.id = b.bed_id
     LEFT JOIN users reviewer ON reviewer.id = c.reviewed_by
     WHERE (? IS NULL OR c.user_id = ?)
     ORDER BY FIELD(c.status, 'pending', 'approved', 'declined'), c.requested_at DESC`,
    [userId || null, userId || null]
);

const decideCheckoutRequest = async ({ requestId, reviewerId, decision, note }) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [requests] = await connection.query(
            `SELECT c.id, c.booking_id, c.user_id, c.status, b.bed_id
             FROM checkout_requests c JOIN bookings b ON b.id = c.booking_id
             WHERE c.id = ? FOR UPDATE`,
            [requestId]
        );
        if (!requests.length || requests[0].status !== 'pending') {
            await connection.rollback();
            return null;
        }
        const request = requests[0];
        if (decision === 'approved') {
            const [result] = await connection.query(
                `UPDATE bookings SET checked_out_at = CURRENT_TIMESTAMP, status = 'completed'
                 WHERE id = ? AND status = 'approved' AND checked_in_at IS NOT NULL AND checked_out_at IS NULL`,
                [request.booking_id]
            );
            if (!result.affectedRows) {
                await connection.rollback();
                return { error: 'The stay is no longer active', status: 409 };
            }
            if (request.bed_id) {
                await connection.query("UPDATE beds SET status = 'available' WHERE id = ?", [request.bed_id]);
            }
        }
        await connection.query(
            `UPDATE checkout_requests SET status = ?, decision_note = ?, reviewed_by = ?,
             reviewed_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'pending'`,
            [decision, note || null, reviewerId, requestId]
        );
        await connection.commit();
        return { bookingId: request.booking_id, userId: request.user_id };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

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

const deleteInspection = (id) => pool.query('DELETE FROM room_inspections WHERE id = ?', [id]);

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

const listPeriods = () => pool.query(
    `SELECT p.*, u.full_name AS created_by_name
     FROM hostel_periods p LEFT JOIN users u ON u.id = p.created_by
     ORDER BY p.opens_on DESC, p.id DESC`
);

const createPeriod = async ({ campus, hostel, semester, opensOn, durationMonths, closesOn, createdBy }) => {
    const connection = await pool.getConnection();
    const lockName = 'hostel_period_create';
    let lockAcquired = false;
    try {
        const [locks] = await connection.query('SELECT GET_LOCK(?, 10) AS acquired', [lockName]);
        if (Number(locks[0].acquired) !== 1) {
            return { error: 'Could not safely schedule the hostel period. Please try again.', status: 503 };
        }
        lockAcquired = true;
        await connection.beginTransaction();
        const [overlaps] = await connection.query(
            `SELECT id FROM hostel_periods
             WHERE campus = ? AND hostel = ? AND status IN ('scheduled', 'open')
               AND opens_on < ? AND closes_on > ? LIMIT 1 FOR UPDATE`,
            [campus, hostel, closesOn, opensOn]
        );
        if (overlaps.length) {
            await connection.rollback();
            return { error: 'This period overlaps another scheduled or open period for that hostel and campus', status: 409 };
        }
        const [result] = await connection.query(
            `INSERT INTO hostel_periods (campus, hostel, semester, opens_on, duration_months, closes_on, status, created_by)
             VALUES (?, ?, ?, ?, ?, ?, IF(? <= CURDATE(), 'open', 'scheduled'), ?)`,
            [campus, hostel, semester, opensOn, durationMonths, closesOn, opensOn, createdBy]
        );
        await connection.commit();
        return [result];
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        if (lockAcquired) await connection.query('SELECT RELEASE_LOCK(?)', [lockName]);
        connection.release();
    }
};

const getPeriodBookingAccess = (campus, hostel) => pool.query(
    `SELECT COUNT(*) AS configured,
        SUM(status IN ('scheduled', 'open') AND opens_on <= CURDATE() AND closes_on > CURDATE()) AS is_open,
        MAX(CASE WHEN status = 'open' AND opens_on <= CURDATE() AND closes_on > CURDATE()
            THEN semester END) AS active_semester
     FROM hostel_periods WHERE campus = ? AND hostel = ?`,
    [campus, hostel]
);

const activateDuePeriods = () => pool.query(
    `UPDATE hostel_periods SET status = 'open'
     WHERE status = 'scheduled' AND opens_on <= CURDATE() AND closes_on > CURDATE()`
);

const closeExpiredPeriods = async () => {
    const [duePeriods] = await pool.query(
        `SELECT id FROM hostel_periods WHERE status IN ('scheduled', 'open') AND closes_on <= CURDATE()
         ORDER BY closes_on, id`
    );
    let closed = 0;
    for (const { id } of duePeriods) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            const [periods] = await connection.query(
                `SELECT id, campus, hostel FROM hostel_periods
                 WHERE id = ? AND status IN ('scheduled', 'open') AND closes_on <= CURDATE() FOR UPDATE`,
                [id]
            );
            if (!periods.length) {
                await connection.rollback();
                continue;
            }
            const period = periods[0];
            const [stays] = await connection.query(
                `SELECT b.id, b.bed_id, b.user_id, b.checked_in_at
                 FROM bookings b JOIN rooms r ON r.id = b.room_id
                 WHERE r.campus = ? AND r.hostel = ? AND b.status = 'approved'
                   AND b.checked_out_at IS NULL FOR UPDATE`,
                [period.campus, period.hostel]
            );
            const checkedInIds = stays.filter((stay) => stay.checked_in_at).map((stay) => stay.id);
            const notCheckedInIds = stays.filter((stay) => !stay.checked_in_at).map((stay) => stay.id);
            if (checkedInIds.length) {
                const placeholders = checkedInIds.map(() => '?').join(', ');
                await connection.query(
                    `UPDATE bookings SET status = 'completed', checked_out_at = CURRENT_TIMESTAMP
                     WHERE id IN (${placeholders})`,
                    checkedInIds
                );
                await connection.query(
                    `UPDATE checkout_requests SET status = 'approved',
                     decision_note = 'Automatically approved when the hostel period closed',
                     reviewed_at = CURRENT_TIMESTAMP
                     WHERE booking_id IN (${placeholders}) AND status = 'pending'`,
                    checkedInIds
                );
            }
            if (notCheckedInIds.length) {
                const placeholders = notCheckedInIds.map(() => '?').join(', ');
                await connection.query(
                    `UPDATE bookings SET status = 'cancelled'
                     WHERE id IN (${placeholders})`,
                    notCheckedInIds
                );
            }
            const bedIds = stays.map((stay) => stay.bed_id).filter(Boolean);
            if (bedIds.length) {
                const placeholders = bedIds.map(() => '?').join(', ');
                await connection.query(
                    `UPDATE beds SET status = 'available' WHERE id IN (${placeholders})`,
                    bedIds
                );
            }
            await connection.query(
                `UPDATE hostel_periods SET status = 'closed', closed_at = CURRENT_TIMESTAMP WHERE id = ?`,
                [id]
            );
            await connection.query(
                `INSERT INTO admin_audit_logs (action, entity_type, entity_id, details)
                 VALUES ('hostel.period.closed', 'hostel_period', ?, ?)`,
                [String(id), JSON.stringify({ campus: period.campus, hostel: period.hostel, checked_out: checkedInIds.length, cancelled: notCheckedInIds.length })]
            );
            await connection.commit();
            closed += 1;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
    return closed;
};

module.exports = {
    listStudents, updateRole, listStays, listStayHistory, checkIn, checkOut, getStayBed, getStudentCurrentStay, createCheckoutRequest, listCheckoutRequests, decideCheckoutRequest, updateStayDates, updateBedStatus, getStudentRoom,
    createRequest, listRequests, updateRequest, createVisitor, listVisitors,
    getVisitor, updateVisitorStatus, listInspections, createInspection, deleteInspection, updateRoomStatus, getPaymentReceipt,
    getPaymentReport, getBalances, getOverview, writeAuditLog, listAuditLogs,
    getUserRoleDetails,
    listPeriods, createPeriod, getPeriodBookingAccess, activateDuePeriods, closeExpiredPeriods,
};