const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const paymentService = require('../services/paymentService');
const logger = require('../utils/logger');

router.post('/stk-push', authenticateToken, async (req, res) => {
    try {
        const { phone, booking_id } = req.body;
        if (typeof phone !== 'string' || !phone.trim() || !/^\d+$/.test(String(booking_id)) || Number(booking_id) < 1) {
            return res.status(400).json({ error: 'A valid phone number and booking ID are required' });
        }
        const result = await paymentService.initiateStkPush(req.user.id, phone, booking_id);
        if (result.error) return res.status(result.status).json({ error: result.error });
        res.json(result);
    } catch (error) {
        const providerError = error?.response?.data?.errorMessage
            || error?.response?.data?.ResponseDescription;
        const isProviderError = error?.stage === 'mpesa-stk-push';
        logger.error('STK PUSH ERROR', {
            stage: error?.stage || 'payment-processing',
            providerStatus: error?.response?.status,
            providerCode: error?.code,
            providerMessage: providerError,
        });
        res.status(isProviderError ? 502 : 500).json({
            error: isProviderError
                ? providerError || 'Safaricom could not start the payment. Please try again.'
                : 'The payment could not be recorded. Please contact the hostel office before retrying.',
        });
    }
});

router.post('/stk-query', authenticateToken, async (req, res) => {
    try {
        const { checkout_request_id } = req.body;
        if (!checkout_request_id) return res.status(400).json({ error: 'Checkout request ID required' });
        const result = await paymentService.queryStkStatus(checkout_request_id, req.user.id);
        if (result.error) return res.status(result.status).json({ error: result.error });
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

router.get('/my', authenticateToken, async (req, res) => {
    try {
        const payments = await paymentService.getMyPayments(req.user.id);
        res.json(payments);
    } catch (error) {
        logger.error('GET MY PAYMENTS ERROR', { message: error.message });
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/all', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const payments = await paymentService.getAllPayments();
        res.json(payments);
    } catch (error) {
        logger.error('GET ALL PAYMENTS ERROR', { message: error.message });
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
