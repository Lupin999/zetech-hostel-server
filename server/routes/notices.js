const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { authenticateToken, requireRole } = require('../middleware/auth');
const noticeService = require('../services/noticeService');
const logger = require('../utils/logger');

// Validate that a route param is a positive integer
const validId = (id) => /^\d+$/.test(id) && Number(id) > 0;

router.get('/', authenticateToken, async (req, res) => {
    try {
        const notices = await noticeService.getNotices(req.user.id);
        res.json(notices);
    } catch (error) {
        logger.error('GET NOTICES ERROR', { message: error.message });
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/', authenticateToken, requireRole('admin', 'warden'), [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('message').trim().notEmpty().withMessage('Message is required'),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
    try {
        const { title, message, target } = req.body;
        const result = await noticeService.createNotice(title, message, target, req.user.id);
        res.status(201).json(result);
    } catch (error) {
        logger.error('CREATE NOTICE ERROR', { message: error.message });
        res.status(500).json({ error: 'Server error' });
    }
});

router.delete('/:id', authenticateToken, requireRole('admin', 'warden'), async (req, res) => {
    if (!validId(req.params.id)) return res.status(400).json({ error: 'Invalid notice ID' });
    try {
        const result = await noticeService.deleteNotice(req.params.id);
        res.json(result);
    } catch (error) {
        logger.error('DELETE NOTICE ERROR', { message: error.message });
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
