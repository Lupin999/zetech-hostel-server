const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const bookingService = require('../services/bookingService');

router.get('/active', authenticateToken, async (req, res) => {
    try {
        const booking = await bookingService.getActiveBooking(req.user.id);
        res.json(booking);
    } catch (error) {
        console.log('GET ACTIVE BOOKING ERROR:', error);
        res.status(500).json({ error: error.message || 'Server error' });
    }
});

router.get('/status', authenticateToken, async (req, res) => {
    try {
        const result = await bookingService.getBookingStatus();
        res.json(result);
    } catch { res.json({ open: true }); }
});

router.put('/toggle', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const result = await bookingService.toggleBookings(req.body.open, req.user.id);
        res.json(result);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/', authenticateToken, async (req, res) => {
    try {
        const result = await bookingService.createBooking(req.user.id, req.body);
        if (result.error) return res.status(result.status).json({ error: result.error });
        res.status(201).json(result);
    } catch (error) {
        console.log('CREATE BOOKING ERROR:', error);
        res.status(500).json({ error: error.message || 'Server error' });
    }
});

router.get('/my', authenticateToken, async (req, res) => {
    try {
        const bookings = await bookingService.getMyBookings(req.user.id);
        res.json(bookings);
    } catch (error) {
        console.log('GET MY BOOKINGS ERROR:', error);
        res.status(500).json({ error: error.message || 'Server error' });
    }
});

router.get('/all', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const bookings = await bookingService.getAllBookings();
        res.json(bookings);
    } catch (error) {
        console.log('GET ALL BOOKINGS ERROR:', error);
        res.status(500).json({ error: error.message || 'Server error' });
    }
});

router.put('/:id/status', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { status } = req.body;
        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ error: 'Status must be approved or rejected' });
        }
        const result = status === 'approved'
            ? await bookingService.approveBooking(req.params.id)
            : await bookingService.rejectBooking(req.params.id);
        if (result.error) return res.status(result.status).json({ error: result.error });
        res.json(result);
    } catch (error) {
        console.log('UPDATE BOOKING STATUS ERROR:', error);
        res.status(500).json({ error: error.message || 'Server error' });
    }
});

router.put('/:id/suspend', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { suspended, reason } = req.body;
        const result = await bookingService.suspendBooking(req.params.id, suspended, reason);
        if (result.error) return res.status(result.status).json({ error: result.error });
        res.json(result);
    } catch (error) {
        console.log('SUSPEND BOOKING ERROR:', error);
        res.status(500).json({ error: error.message || 'Server error' });
    }
});

router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const result = await bookingService.cancelBooking(req.params.id, req.user.id);
        if (result.error) return res.status(result.status).json({ error: result.error });
        res.json(result);
    } catch (error) {
        console.log('CANCEL BOOKING ERROR:', error);
        res.status(500).json({ error: error.message || 'Server error' });
    }
});

module.exports = router;
