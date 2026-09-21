const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const paymentService = require('../services/paymentService');

router.post('/stk-push', authenticateToken, async (req, res) => {
    try {
        const { phone, booking_id } = req.body;
        if (!phone || !booking_id) return res.status(400).json({ error: 'Phone and booking ID required' });
        const result = await paymentService.initiateStkPush(req.user.id, phone, booking_id);
        if (result.error) return res.status(result.status).json({ error: result.error });
        res.json(result);
    } catch (error) {
        console.log('STK PUSH ERROR:', error?.response?.data || error.message);
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
        console.log('STK QUERY ERROR:', error?.response?.data || error.message);
        res.json({ status: 'pending', message: 'Unable to verify payment status, still checking...' });
    }
});

router.post('/callback', async (req, res) => {
    try {
        // Validate callback is from Safaricom IP ranges
        const safaricomIPs = ['196.201.214.', '196.201.213.', '196.201.212.'];
        const clientIP = req.ip || req.connection.remoteAddress || '';
        const isSafaricom = safaricomIPs.some(ip => clientIP.includes(ip)) || clientIP.includes('127.0.0.1') || clientIP.includes('::1');

        if (!isSafaricom && process.env.NODE_ENV === 'production') {
            console.log('MPESA CALLBACK REJECTED - Suspicious IP:', clientIP);
            return res.status(403).json({ ResultCode: 1, ResultDesc: 'Rejected' });
        }

        // Validate payload structure
        if (!req.body?.Body?.stkCallback) {
            console.log('MPESA CALLBACK REJECTED - Invalid payload');
            return res.status(400).json({ ResultCode: 1, ResultDesc: 'Invalid payload' });
        }

        console.log('MPESA CALLBACK:', JSON.stringify(req.body));
        await paymentService.handleCallback(req.body.Body);
        res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    } catch (error) {
        console.log('MPESA CALLBACK ERROR:', error);
        res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }
});

router.post('/', authenticateToken, [
    body('booking_id').isInt().withMessage('Booking ID is required'),
    body('amount').isFloat({ min: 12000 }).withMessage('Minimum payment is KES 12,000 (deposit)'),
    body('payment_method').isIn(['mpesa', 'cash']).withMessage('Payment method must be mpesa or cash'),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
    try {
        const result = await paymentService.submitPayment(req.user.id, req.body);
        if (result.error) return res.status(result.status).json({ error: result.error });
        res.status(201).json(result);
    } catch (error) {
        console.log('SUBMIT PAYMENT ERROR:', error);
        res.status(500).json({ error: error.message || 'Server error' });
    }
});

router.get('/my', authenticateToken, async (req, res) => {
    try {
        const payments = await paymentService.getMyPayments(req.user.id);
        res.json(payments);
    } catch (error) {
        console.log('GET MY PAYMENTS ERROR:', error);
        res.status(500).json({ error: error.message || 'Server error' });
    }
});

router.get('/all', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const payments = await paymentService.getAllPayments();
        res.json(payments);
    } catch (error) {
        console.log('GET ALL PAYMENTS ERROR:', error);
        res.status(500).json({ error: error.message || 'Server error' });
    }
});

router.patch('/:id/confirm', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const result = await paymentService.confirmPayment(req.params.id);
        res.json(result);
    } catch (error) {
        console.log('CONFIRM PAYMENT ERROR:', error);
        res.status(500).json({ error: error.message || 'Server error' });
    }
});

module.exports = router;
