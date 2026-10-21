const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { authenticateToken, requireRole } = require('../middleware/auth');
const paymentService = require('../services/paymentService');
const logger = require('../utils/logger');

router.post('/stk-push', authenticateToken, async (req, res) => {
    try {
        const { phone, booking_id } = req.body;
        if (!phone || !booking_id) return res.status(400).json({ error: 'Phone and booking ID required' });
        const result = await paymentService.initiateStkPush(req.user.id, phone, booking_id);
        if (result.error) return res.status(result.status).json({ error: result.error });
        res.json(result);
    } catch (error) {
        logger.error('STK PUSH ERROR', { message: error?.response?.data || error.message });
        res.status(500).json({ error: 'Failed to initiate M-Pesa payment. Check your phone number and try again.' });
    }
});

router.post('/stk-query', authenticateToken, async (req, res) => {
    try {
        const { checkout_request_id } = req.body;
        if (!checkout_request_id) return res.status(400).json({ error: 'Checkout request ID required' });
        const result = await paymentService.queryStkStatus(checkout_request_id);
        res.json(result);
    } catch (error) {
        const errMsg = error?.response?.data?.errorMessage || '';
        if (errMsg.includes('being processed')) {
            return res.json({ status: 'pending', message: 'Payment is being processed' });
        }
        logger.error('STK QUERY ERROR', { data: error?.response?.data || error.message });
        res.json({ status: 'pending', message: 'Unable to verify payment status, still checking...' });
    }
});

router.post('/callback', async (req, res) => {
    try {
        // Validate callback is from Safaricom IP ranges.
        // With 'trust proxy' set in index.js, req.ip is the real client IP on Render.
        const safaricomIPs = ['196.201.214.', '196.201.213.', '196.201.212.'];
        const clientIP = req.ip || req.connection.remoteAddress || '';
        const isSafaricom = safaricomIPs.some(ip => clientIP.includes(ip));
        // Allow localhost only in development (never in production)
        const isLocal = process.env.NODE_ENV !== 'production' &&
            (clientIP.includes('127.0.0.1') || clientIP.includes('::1'));

        if (!isSafaricom && !isLocal && process.env.NODE_ENV === 'production') {
            logger.warn(`MPESA CALLBACK REJECTED - Suspicious IP: ${clientIP}`);
            return res.status(403).json({ ResultCode: 1, ResultDesc: 'Rejected' });
        }

        // Validate payload structure
        if (!req.body?.Body?.stkCallback) {
            logger.warn('MPESA CALLBACK REJECTED - Invalid payload');
            return res.status(400).json({ ResultCode: 1, ResultDesc: 'Invalid payload' });
        }

        logger.info('MPESA CALLBACK received', { body: JSON.stringify(req.body) });
        await paymentService.handleCallback(req.body.Body);
        res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    } catch (error) {
        logger.error('MPESA CALLBACK ERROR', { message: error.message });
        res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }
});

router.post('/', authenticateToken, [
    body('booking_id').isInt().withMessage('Booking ID is required'),
    body('amount').isFloat({ min: 12000 }).withMessage('Minimum payment is KES 12,000 (deposit)'),
    body('payment_method').equals('mpesa').withMessage('Payments must be made through M-Pesa'),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
    try {
        const result = await paymentService.submitPayment(req.user.id, req.body);
        if (result.error) return res.status(result.status).json({ error: result.error });
        res.status(201).json(result);
    } catch (error) {
        logger.error('SUBMIT PAYMENT ERROR', { message: error.message });
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/my', authenticateToken, async (req, res) => {
    try {
        const payments = await paymentService.getMyPayments(req.user.id);
        res.json(payments);
    } catch (error) {
        logger.error('GET MY PAYMENTS ERROR', { message: error.message });
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/all', authenticateToken, requireRole('admin', 'accounts'), async (req, res) => {
    try {
        const payments = await paymentService.getAllPayments();
        res.json(payments);
    } catch (error) {
        logger.error('GET ALL PAYMENTS ERROR', { message: error.message });
        res.status(500).json({ error: 'Server error' });
    }
});

router.patch('/:id/confirm', authenticateToken, requireRole('admin', 'accounts'), async (req, res) => {
    if (!/^\d+$/.test(req.params.id) || Number(req.params.id) < 1) {
        return res.status(400).json({ error: 'Invalid payment ID' });
    }
    try {
        const result = await paymentService.confirmPayment(req.params.id);
        res.json(result);
    } catch (error) {
        logger.error('CONFIRM PAYMENT ERROR', { message: error.message });
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
