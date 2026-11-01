const model = require('../models/operationsModel');
const RoomModel = require('../models/roomModel');
const { sendNotification } = require('./notificationService');

const staffRoles = ['admin', 'accounts', 'warden'];
const residentialRoles = ['admin', 'warden'];
const financeRoles = ['admin', 'accounts'];
const userRoles = ['student', ...staffRoles];
const requestStatuses = ['open', 'in_progress', 'resolved', 'closed'];
const visitorStatuses = ['checked_in', 'checked_out', 'cancelled'];

const audit = async (actorId, action, entityType, entityId, details) => {
    try {
        await model.writeAuditLog({ actorId, action, entityType, entityId, details });
    } catch (error) {
        console.error('AUDIT LOG WRITE FAILED:', error.message);
    }
};

const getDateRange = (from, to) => {
    const today = new Date().toISOString().slice(0, 10);
    const defaultFrom = `${today.slice(0, 7)}-01`;
    const validDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value || '') && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
    const start = from || defaultFrom;
    const end = to || today;
    if (!validDate(start) || !validDate(end) || start > end) return { error: 'Enter a valid date range', status: 400 };
    return { from: start, to: end };
};

const listStudents = async (search = '') => {
    const [rows] = await model.listStudents(search.trim().slice(0, 100));
    return rows;
};

const setStudentRole = async (actor, userId, role) => {
    if (actor.role !== 'admin') return { error: 'Only an admin can change user roles', status: 403 };
    if (!userRoles.includes(role)) return { error: 'Invalid role', status: 400 };
    if (Number(actor.id) === Number(userId)) return { error: 'You cannot change your own role', status: 400 };
    const [users] = await model.getUserRoleDetails(userId);
    if (!users.length) return { error: 'User not found', status: 404 };
    const target = users[0];
    if (target.role === role) return { message: 'User already has this role' };
    const [result] = await model.updateRole(userId, role);
    if (!result.affectedRows) return { error: 'User not found', status: 404 };
    await audit(actor.id, 'user.role.updated', 'user', userId, {
        target_name: target.full_name,
        target_reg_no: target.reg_no,
        previous_role: target.role,
        role,
    });
    return { message: 'User role updated' };
};

const listStays = async () => {
    const [rows] = await model.listStays();
    return rows;
};

const getStudentCurrentStay = async (userId) => {
    const [rows] = await model.getStudentCurrentStay(userId);
    return { stay: rows[0] || null };
};

const listStayHistory = async (search = '') => {
    await model.activateDuePeriods();
    await model.closeExpiredPeriods();
    const [rows] = await model.listStayHistory(search.trim().slice(0, 100));
    return rows;
};

const checkIn = async (actorId, bookingId) => {
    const [result] = await model.checkIn(bookingId);
    if (!result.affectedRows) return { error: 'Check-in requires an approved booking, confirmed payment, and no existing stay', status: 409 };
    await audit(actorId, 'stay.checked_in', 'booking', bookingId);
    return { message: 'Resident checked in' };
};

const checkOut = async (actorId, bookingId) => {
    const [stays] = await model.getStayBed(bookingId);
    if (!stays.length) return { error: 'Resident must be checked in and not already checked out', status: 409 };
    const [result] = await model.checkOut(bookingId);
    if (!result.affectedRows) return { error: 'Resident must be checked in and not already checked out', status: 409 };
    if (stays[0].bed_id) await RoomModel.updateBedStatus(stays[0].bed_id, 'available');
    await audit(actorId, 'stay.checked_out', 'booking', bookingId);
    return { message: 'Resident checked out' };
};

const createCheckoutRequest = async (userId, reason) => {
    const { stay } = await getStudentCurrentStay(userId);
    if (!stay) return { error: 'You must be checked in to request checkout', status: 409 };
    const result = await model.createCheckoutRequest({
        bookingId: stay.id,
        userId,
        reason: reason?.trim() || null,
    });
    if (result.error) return result;
    await sendNotification(userId, `Your checkout request for ${stay.hostel} Hostel Room ${stay.room_number} is awaiting admin or warden approval.`, 'booking');
    return { id: result.id, message: 'Checkout request submitted for staff review' };
};

const listCheckoutRequests = async (user) => {
    const [rows] = await model.listCheckoutRequests(
        ['admin', 'warden'].includes(user.role) ? null : user.id
    );
    return rows;
};

const decideCheckoutRequest = async (actor, requestId, decision, note) => {
    if (!['approved', 'declined'].includes(decision)) {
        return { error: 'Decision must be approved or declined', status: 400 };
    }
    const result = await model.decideCheckoutRequest({
        requestId,
        reviewerId: actor.id,
        decision,
        note: note?.trim() || null,
    });
    if (!result) return { error: 'Pending checkout request not found', status: 404 };
    if (result.error) return result;
    await sendNotification(
        result.userId,
        decision === 'approved'
            ? 'Your checkout request was approved. Your stay is now complete.'
            : `Your checkout request was declined.${note?.trim() ? ` Note: ${note.trim()}` : ''}`,
        'booking'
    );
    await audit(actor.id, `stay.checkout_${decision}`, 'booking', result.bookingId, { request_id: requestId });
    return { message: `Checkout request ${decision}` };
};

const updateStayDates = async (actorId, bookingId, arrivalDate, departureDate) => {
    if (arrivalDate && departureDate && departureDate < arrivalDate) {
        return { error: 'Departure date cannot be before arrival date', status: 400 };
    }
    if (arrivalDate && departureDate && departureDate > addMonths(arrivalDate, 4)) {
        return { error: 'A stay cannot be longer than 4 months', status: 400 };
    }
    const [result] = await model.updateStayDates(bookingId, arrivalDate, departureDate);
    if (!result.affectedRows) return { error: 'Active approved stay not found', status: 404 };
    await audit(actorId, 'stay.dates_updated', 'booking', bookingId, { arrival_date: arrivalDate, departure_date: departureDate });
    return { message: 'Stay dates updated' };
};

const createRequest = async (userId, input) => {
    const { stay } = await getStudentCurrentStay(userId);
    if (!stay) return { error: 'An active checked-in room is required to submit a request', status: 403 };
    if (input.room_id && Number(input.room_id) !== Number(stay.room_id)) {
        return { error: 'Requests can only be submitted for your current room', status: 403 };
    }
    const [result] = await model.createRequest({
        userId,
        roomId: stay.room_id,
        requestType: input.request_type || 'maintenance',
        title: input.title.trim(),
        description: input.description.trim(),
        priority: input.priority || 'normal',
    });
    return { id: result.insertId, message: 'Request submitted' };
};

const listRequests = async (user) => {
    const [rows] = await model.listRequests(residentialRoles.includes(user.role) ? null : user.id);
    return rows;
};

const updateRequest = async (actorId, id, input) => {
    if (!requestStatuses.includes(input.status)) return { error: 'Invalid request status', status: 400 };
    const [result] = await model.updateRequest(id, {
        status: input.status,
        resolution: input.resolution?.trim() || null,
        assignedTo: input.assigned_to || null,
    });
    if (!result.affectedRows) return { error: 'Request not found', status: 404 };
    await audit(actorId, 'service_request.updated', 'maintenance_request', id, { status: input.status });
    return { message: 'Request updated' };
};

const createVisitor = async (userId, input) => {
    const { stay } = await getStudentCurrentStay(userId);
    if (!stay) return { error: 'An active checked-in room is required to register a visitor', status: 403 };
    const [result] = await model.createVisitor({
        residentId: userId,
        visitorName: input.visitor_name.trim(),
        visitorPhone: input.visitor_phone?.trim(),
        purpose: input.purpose.trim(),
    });
    return { id: result.insertId, message: 'Visitor registered' };
};

const listVisitors = async (user) => {
    const [rows] = await model.listVisitors(residentialRoles.includes(user.role) ? null : user.id);
    return rows;
};

const listInspections = async () => {
    const [rows] = await model.listInspections();
    return rows;
};

const createInspection = async (actorId, input) => {
    const [result] = await model.createInspection({
        roomId: input.room_id,
        inspectorId: actorId,
        conditionStatus: input.condition_status,
        cleanliness: input.cleanliness,
        safetyStatus: input.safety_status,
        notes: input.notes?.trim(),
    });
    await audit(actorId, 'room.inspected', 'room', input.room_id, {
        condition_status: input.condition_status,
        cleanliness: input.cleanliness,
        safety_status: input.safety_status,
    });
    return { id: result.insertId, message: 'Room inspection recorded' };
};

const updateRoomStatus = async (actorId, roomId, status) => {
    const [result] = await model.updateRoomStatus(roomId, status);
    if (!result.affectedRows) return { error: 'Room not found', status: 404 };
    await audit(actorId, 'room.status_updated', 'room', roomId, { status });
    return { message: 'Room status updated' };
};

const updateVisitor = async (actorId, id, status) => {
    if (!visitorStatuses.includes(status)) return { error: 'Invalid visitor status', status: 400 };
    const [rows] = await model.getVisitor(id);
    if (!rows.length) return { error: 'Visitor record not found', status: 404 };
    const allowed = rows[0].status === 'expected' && ['checked_in', 'cancelled'].includes(status)
        || rows[0].status === 'checked_in' && status === 'checked_out';
    if (!allowed) return { error: 'That visitor status change is not allowed', status: 409 };
    await model.updateVisitorStatus(id, status, actorId);
    await audit(actorId, `visitor.${status}`, 'visitor', id);
    return { message: 'Visitor status updated' };
};

const getPaymentReceipt = async (paymentId, user) => {
    const [rows] = await model.getPaymentReceipt(paymentId, staffRoles.includes(user.role) ? null : user.id);
    return rows[0] || null;
};

const getBalances = async (user) => {
    const [rows] = await model.getBalances(financeRoles.includes(user.role) ? null : user.id);
    return rows;
};

const getReports = async (from, to) => {
    const range = getDateRange(from, to);
    if (range.error) return range;
    const [overview, [payments], [balances]] = await Promise.all([
        model.getOverview(range.from, range.to),
        model.getPaymentReport(range.from, range.to),
        model.getBalances(null),
    ]);
    return { ...overview, payment_rows: payments, balance_rows: balances };
};

const getAuditLogs = async () => {
    const [rows] = await model.listAuditLogs();
    return rows;
};

const addMonths = (dateValue, months) => {
    const [year, month, day] = dateValue.split('-').map(Number);
    const targetMonth = month - 1 + months;
    const targetYear = year + Math.floor(targetMonth / 12);
    const normalizedMonth = targetMonth % 12;
    const lastDay = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
    return `${targetYear}-${String(normalizedMonth + 1).padStart(2, '0')}-${String(Math.min(day, lastDay)).padStart(2, '0')}`;
};

const isValidDate = (value) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};

const listPeriods = async () => {
    await model.activateDuePeriods();
    await model.closeExpiredPeriods();
    const [rows] = await model.listPeriods();
    return rows;
};

const createPeriod = async (actorId, input) => {
    const campus = input.campus.trim();
    const semester = input.semester.trim();
    const { hostel, opens_on: opensOn, duration_months: durationMonths } = input;
    if (!campus || !semester || campus.length > 100 || semester.length > 80) {
        return { error: 'Campus and semester are required', status: 400 };
    }
    if (!['Boys', 'Girls'].includes(hostel)) return { error: 'Select a valid hostel', status: 400 };
    if (!isValidDate(opensOn)) return { error: 'Enter a valid opening date', status: 400 };
    if (!Number.isInteger(durationMonths) || durationMonths < 1 || durationMonths > 4) {
        return { error: 'Duration must be between 1 and 4 months', status: 400 };
    }
    const closesOn = addMonths(opensOn, durationMonths);
    const creation = await model.createPeriod({
        campus, hostel, semester, opensOn, durationMonths, closesOn, createdBy: actorId,
    });
    if (creation?.error) return creation;
    const [result] = creation;
    await audit(actorId, 'hostel.period.created', 'hostel_period', result.insertId, {
        campus, hostel, semester, opens_on: opensOn, closes_on: closesOn, duration_months: durationMonths,
    });
    return { id: result.insertId, closes_on: closesOn, message: 'Hostel period scheduled' };
};

module.exports = {
    listStudents, setStudentRole, listStays, getStudentCurrentStay, listStayHistory, checkIn, checkOut, createCheckoutRequest, listCheckoutRequests, decideCheckoutRequest, updateStayDates, createRequest,
    listRequests, updateRequest, createVisitor, listVisitors, updateVisitor,
    listInspections, createInspection, updateRoomStatus,
    getPaymentReceipt, getBalances,
    getReports, getAuditLogs, listPeriods, createPeriod,
};