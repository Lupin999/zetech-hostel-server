const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin, requireRole } = require('../middleware/auth');
const bookingService = require('../services/bookingService');
const logger = require('../utils/logger');

// Validate that a route param is a positive integer
const validId = (id) => /^\d+$/.test(id) && Number(id) > 0;

router.get('/active', authenticateToken, async (req, res) => {
    try {
        const booking = await bookingService.getActiveBooking(req.user.id);
        res.json(booking);
    } catch (error) {
        logger.error('GET ACTIVE BOOKING ERROR', { message: error.message });
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/status', authenticateToken, async (req, res) => {
    try {
        const result = await bookingService.getBookingStatus();
        res.json(result);
    } catch { res.json({ open: true }); }
});

router.put('/toggle', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const result = await bookingService.toggleBookings(req.body.open, req.user.id);
        res.json(result);
    } catch (error) {
        logger.error('TOGGLE BOOKINGS ERROR', { message: error.message });
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/', authenticateToken, async (req, res) => {
    try {
        const result = await bookingService.createBooking(req.user.id, req.body);
        if (result.error) return res.status(result.status).json({ error: result.error });
        res.status(201).json(result);
    } catch (error) {
        logger.error('CREATE BOOKING ERROR', { message: error.message });
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/my', authenticateToken, async (req, res) => {
    try {
        const bookings = await bookingService.getMyBookings(req.user.id);
        res.json(bookings);
    } catch (error) {
        logger.error('GET MY BOOKINGS ERROR', { message: error.message });
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/all', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const bookings = await bookingService.getAllBookings();
        res.json(bookings);
    } catch (error) {
        logger.error('GET ALL BOOKINGS ERROR', { message: error.message });
        res.status(500).json({ error: 'Server error' });
    }
});

router.put('/:id/status', authenticateToken, requireRole('admin'), async (req, res) => {
    if (!validId(req.params.id)) return res.status(400).json({ error: 'Invalid booking ID' });
    try {
        const { status, reason } = req.body;
        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ error: 'Status must be approved or rejected' });
        }
        if (status === 'rejected' && (typeof reason !== 'string' || reason.trim().length < 5 || reason.trim().length > 500)) {
            return res.status(400).json({ error: 'Provide a rejection reason between 5 and 500 characters' });
        }
        const result = status === 'approved'
            ? await bookingService.approveBooking(req.params.id)
            : await bookingService.rejectBooking(req.params.id, reason.trim());
        if (result.error) return res.status(result.status).json({ error: result.error });
        res.json(result);
    } catch (error) {
        logger.error('UPDATE BOOKING STATUS ERROR', { message: error.message });
        res.status(500).json({ error: 'Server error' });
    }
});

router.put('/:id/suspend', authenticateToken, requireRole('admin'), async (req, res) => {
    if (!validId(req.params.id)) return res.status(400).json({ error: 'Invalid booking ID' });
    try {
        const { suspended, reason } = req.body;
        const result = await bookingService.suspendBooking(req.params.id, suspended, reason);
        if (result.error) return res.status(result.status).json({ error: result.error });
        res.json(result);
    } catch (error) {
        logger.error('SUSPEND BOOKING ERROR', { message: error.message });
        res.status(500).json({ error: 'Server error' });
    }
});

router.delete('/:id', authenticateToken, async (req, res) => {
    if (!validId(req.params.id)) return res.status(400).json({ error: 'Invalid booking ID' });
    try {
        const result = await bookingService.cancelBooking(req.params.id, req.user.id);
        if (result.error) return res.status(result.status).json({ error: result.error });
        res.json(result);
    } catch (error) {
        logger.error('CANCEL BOOKING ERROR', { message: error.message });
        res.status(500).json({ error: 'Server error' });
    }
});

// Bulk delete — admin only, only completed/rejected/cancelled bookings
router.delete('/bulk', authenticateToken, requireAdmin, async (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || !ids.length) {
        return res.status(400).json({ error: 'Provide an array of booking IDs to delete' });
    }
    const validIds = ids.filter(id => /^\d+$/.test(String(id)) && Number(id) > 0);
    if (!validIds.length) return res.status(400).json({ error: 'No valid booking IDs provided' });
    try {
        const [result] = await require('../models/bookingModel').bulkDeleteBookings(validIds);
        res.json({ deleted: result.affectedRows, message: `${result.affectedRows} booking(s) removed` });
    } catch (error) {
        logger.error('BULK DELETE BOOKINGS ERROR', { message: error.message });
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
