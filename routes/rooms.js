const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const roomService = require('../services/roomService');

const roomValidation = [
    body('room_number').trim().notEmpty().withMessage('Room number is required'),
    body('hostel').isIn(['Boys', 'Girls']).withMessage('Hostel must be Boys or Girls'),
    body('campus').trim().notEmpty().withMessage('Campus is required'),
    body('price').isFloat({ min: 0 }).withMessage('Valid price is required'),
];

router.get('/', authenticateToken, async (req, res) => {
    try {
        const rooms = await roomService.getRooms();
        res.json(rooms);
    } catch (error) {
        console.log('GET ROOMS ERROR:', error);
        res.status(500).json({ error: error.message || 'Server error' });
    }
});

router.post('/', authenticateToken, requireAdmin, roomValidation, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
    try {
        const result = await roomService.addRoom(req.body);
        res.status(201).json(result);
    } catch (error) {
        console.log('ADD ROOM ERROR:', error);
        if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Room already exists' });
        res.status(500).json({ error: error.message || 'Server error' });
    }
});

router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const result = await roomService.editRoom(req.params.id, req.body);
        res.json(result);
    } catch (error) {
        console.log('UPDATE ROOM ERROR:', error);
        res.status(500).json({ error: error.message || 'Server error' });
    }
});

router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const result = await roomService.removeRoom(req.params.id);
        if (result.error) return res.status(result.status).json({ error: result.error });
        res.json(result);
    } catch (error) {
        console.log('DELETE ROOM ERROR:', error);
        res.status(500).json({ error: error.message || 'Server error' });
    }
});

router.get('/:id/beds', authenticateToken, async (req, res) => {
    try {
        const beds = await roomService.getBeds(req.params.id);
        res.json(beds);
    } catch (error) {
        console.log('GET BEDS ERROR:', error);
        res.status(500).json({ error: error.message || 'Server error' });
    }
});

module.exports = router;
