const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const operationsService = require('../services/operationsService');
const logger = require('../utils/logger');

const router = express.Router();
const validId = (id) => /^\d+$/.test(id) && Number(id) > 0;
const allowRoles = (...roles) => (req, res, next) => {
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Your role cannot perform this action' });
    next();
};
const handleErrors = (req, res) => {
    const errors = validationResult(req);
    if (errors.isEmpty()) return false;
    res.status(400).json({ error: errors.array()[0].msg });
    return true;
};
const run = (handler) => async (req, res) => {
    try {
        const result = await handler(req);
        if (result?.error) return res.status(result.status || 400).json({ error: result.error });
        if (result === null) return res.status(404).json({ error: 'Record not found' });
        res.json(result);
    } catch (error) {
        logger.error('OPERATIONS API ERROR', { message: error.message });
        res.status(500).json({ error: 'Server error' });
    }
};

router.get('/students', authenticateToken, allowRoles('admin'), query('search').optional().isString(), (req, res, next) => {
    if (handleErrors(req, res)) return;
    next();
}, run((req) => operationsService.listStudents(req.query.search)));

router.patch('/students/:id/role', authenticateToken, allowRoles('admin'),
    param('id').custom(validId), body('role').isIn(['student', 'admin', 'accounts', 'warden']),
    (req, res, next) => { if (handleErrors(req, res)) return; next(); },
    run((req) => operationsService.setStudentRole(req.user, req.params.id, req.body.role)));

router.get('/stays', authenticateToken, allowRoles('admin', 'warden'), run(() => operationsService.listStays()));
router.put('/stays/:id/check-in', authenticateToken, allowRoles('admin', 'warden'), (req, res, next) => {
    if (!validId(req.params.id)) return res.status(400).json({ error: 'Invalid booking ID' });
    next();
}, run((req) => operationsService.checkIn(req.user.id, req.params.id)));
router.put('/stays/:id/check-out', authenticateToken, allowRoles('admin', 'warden'), (req, res, next) => {
    if (!validId(req.params.id)) return res.status(400).json({ error: 'Invalid booking ID' });
    next();
}, run((req) => operationsService.checkOut(req.user.id, req.params.id)));
router.put('/stays/:id/dates', authenticateToken, allowRoles('admin', 'warden'),
    param('id').custom(validId), body('arrival_date').optional({ values: 'null' }).isISO8601({ strict: true }),
    body('departure_date').optional({ values: 'null' }).isISO8601({ strict: true }),
    (req, res, next) => { if (handleErrors(req, res)) return; next(); },
    run((req) => operationsService.updateStayDates(req.user.id, req.params.id, req.body.arrival_date || null, req.body.departure_date || null)));

router.get('/requests', authenticateToken, run((req) => operationsService.listRequests(req.user)));
router.post('/requests', authenticateToken,
    body('request_type').optional().isIn(['maintenance', 'complaint']),
    body('title').trim().isLength({ min: 3, max: 160 }),
    body('description').trim().isLength({ min: 5, max: 5000 }),
    body('priority').optional().isIn(['low', 'normal', 'high', 'urgent']),
    body('room_id').optional().isInt({ min: 1 }),
    (req, res, next) => { if (handleErrors(req, res)) return; next(); },
    run((req) => operationsService.createRequest(req.user.id, {
        ...req.body, request_type: req.body.request_type || 'maintenance', priority: req.body.priority || 'normal',
    })));
router.patch('/requests/:id', authenticateToken, allowRoles('admin', 'warden'),
    param('id').custom(validId), body('status').isIn(['open', 'in_progress', 'resolved', 'closed']),
    body('resolution').optional().isString().isLength({ max: 5000 }),
    body('assigned_to').optional({ values: 'null' }).isInt({ min: 1 }),
    (req, res, next) => { if (handleErrors(req, res)) return; next(); },
    run((req) => operationsService.updateRequest(req.user.id, req.params.id, req.body)));

router.get('/visitors', authenticateToken, run((req) => operationsService.listVisitors(req.user)));
router.post('/visitors', authenticateToken,
    body('visitor_name').trim().isLength({ min: 2, max: 120 }),
    body('visitor_phone').optional({ values: 'falsy' }).isString().isLength({ max: 30 }),
    body('purpose').trim().isLength({ min: 2, max: 255 }),
    (req, res, next) => { if (handleErrors(req, res)) return; next(); },
    run((req) => operationsService.createVisitor(req.user.id, req.body)));
router.patch('/visitors/:id/status', authenticateToken, allowRoles('admin', 'warden'),
    param('id').custom(validId), body('status').isIn(['checked_in', 'checked_out', 'cancelled']),
    (req, res, next) => { if (handleErrors(req, res)) return; next(); },
    run((req) => operationsService.updateVisitor(req.user.id, req.params.id, req.body.status)));

router.get('/inspections', authenticateToken, allowRoles('admin', 'warden'), run(() => operationsService.listInspections()));
router.post('/inspections', authenticateToken, allowRoles('admin', 'warden'),
    body('room_id').isInt({ min: 1 }),
    body('condition_status').isIn(['good', 'attention_required', 'uninhabitable']),
    body('cleanliness').isIn(['clean', 'needs_cleaning', 'poor']),
    body('safety_status').isIn(['clear', 'issue_found']),
    body('notes').optional().isString().isLength({ max: 5000 }),
    (req, res, next) => { if (handleErrors(req, res)) return; next(); },
    run((req) => operationsService.createInspection(req.user.id, req.body)));
router.patch('/rooms/:id/status', authenticateToken, allowRoles('admin', 'warden'),
    param('id').custom(validId), body('status').isIn(['available', 'full', 'maintenance']),
    (req, res, next) => { if (handleErrors(req, res)) return; next(); },
    run((req) => operationsService.updateRoomStatus(req.user.id, req.params.id, req.body.status)));

router.get('/refunds', authenticateToken, run((req) => operationsService.listRefunds(req.user)));
router.post('/refunds', authenticateToken,
    body('payment_id').isInt({ min: 1 }), body('amount').isFloat({ gt: 0 }),
    body('reason').trim().isLength({ min: 5, max: 2000 }),
    (req, res, next) => { if (handleErrors(req, res)) return; next(); },
    run((req) => operationsService.createRefund(req.user.id, req.body)));
router.patch('/refunds/:id/review', authenticateToken, allowRoles('admin', 'accounts'),
    param('id').custom(validId), body('status').isIn(['approved', 'rejected']),
    (req, res, next) => { if (handleErrors(req, res)) return; next(); },
    run((req) => operationsService.reviewRefund(req.user.id, req.params.id, req.body.status)));
router.patch('/refunds/:id/process', authenticateToken, allowRoles('admin', 'accounts'),
    param('id').custom(validId), body('external_reference').trim().isLength({ min: 3, max: 100 }),
    (req, res, next) => { if (handleErrors(req, res)) return; next(); },
    run((req) => operationsService.processRefund(req.user.id, req.params.id, req.body.external_reference)));

router.get('/payments/:id/receipt', authenticateToken, (req, res, next) => {
    if (!validId(req.params.id)) return res.status(400).json({ error: 'Invalid payment ID' });
    next();
}, run((req) => operationsService.getPaymentReceipt(req.params.id, req.user)));
router.get('/balances', authenticateToken, run((req) => operationsService.getBalances(req.user)));
router.get('/reports', authenticateToken, allowRoles('admin', 'accounts'),
    query('from').optional().isISO8601({ strict: true }), query('to').optional().isISO8601({ strict: true }),
    (req, res, next) => { if (handleErrors(req, res)) return; next(); },
    run((req) => operationsService.getReports(req.query.from, req.query.to)));
router.get('/audit', authenticateToken, allowRoles('admin'), run(() => operationsService.getAuditLogs()));

module.exports = router;