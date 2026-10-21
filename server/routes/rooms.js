const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { authenticateToken, requireRole } = require('../middleware/auth');
const roomService = require('../services/roomService');
const logger = require('../utils/logger');

// Validate that a route param is a positive integer
const validId = (id) => /^\d+$/.test(id) && Number(id) > 0;

const roomValidation = [
    body('room_number').trim().notEmpty().withMessage('Room number is required'),
    body('hostel').isIn(['Boys', 'Girls']).withMessage('Hostel must be Boys or Girls'),
    body('campus').trim().notEmpty().withMessage('Campus is required'),
    body('price').isFloat({ min: 0 }).withMessage('Valid price is required'),
];

// Validation rules for room updates — same as create but all fields optional
const roomUpdateValidation = [
    body('room_number').optional().trim().notEmpty().withMessage('Room number cannot be empty'),
    body('hostel').optional().isIn(['Boys', 'Girls']).withMessage('Hostel must be Boys or Girls'),
    body('campus').optional().trim().notEmpty().withMessage('Campus cannot be empty'),
    body('price').optional().isFloat({ min: 0 }).withMessage('Valid price is required'),
    body('status').optional().isIn(['available', 'full', 'maintenance']).withMessage('Invalid status'),
    body('capacity').optional().isInt({ min: 1, max: 8 }).withMessage('Capacity must be 1–8'),
];

router.get('/', authenticateToken, async (req, res) => {
    try {
        const rooms = await roomService.getRooms();
        res.json(rooms);
    } catch (error) {
        logger.error('GET ROOMS ERROR', { message: error.message });
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/', authenticateToken, requireRole('admin', 'warden'), roomValidation, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
    try {
        const result = await roomService.addRoom(req.body);
        res.status(201).json(result);
    } catch (error) {
        logger.error('ADD ROOM ERROR', { message: error.message });
        if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Room already exists' });
        res.status(500).json({ error: 'Server error' });
    }
});

router.put('/:id', authenticateToken, requireRole('admin', 'warden'), roomUpdateValidation, async (req, res) => {
    if (!validId(req.params.id)) return res.status(400).json({ error: 'Invalid room ID' });
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
    try {
        const result = await roomService.editRoom(req.params.id, req.body);
        res.json(result);
    } catch (error) {
        logger.error('UPDATE ROOM ERROR', { message: error.message });
        res.status(500).json({ error: 'Server error' });
    }
});

router.delete('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
    if (!validId(req.params.id)) return res.status(400).json({ error: 'Invalid room ID' });
    try {
        const result = await roomService.removeRoom(req.params.id);
        if (result.error) return res.status(result.status).json({ error: result.error });
        res.json(result);
    } catch (error) {
        logger.error('DELETE ROOM ERROR', { message: error.message });
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/:id/beds', authenticateToken, async (req, res) => {
    if (!validId(req.params.id)) return res.status(400).json({ error: 'Invalid room ID' });
    try {
        const beds = await roomService.getBeds(req.params.id);
        res.json(beds);
    } catch (error) {
        logger.error('GET BEDS ERROR', { message: error.message });
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
