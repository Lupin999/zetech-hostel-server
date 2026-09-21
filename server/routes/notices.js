const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const noticeService = require('../services/noticeService');

router.get('/', authenticateToken, async (req, res) => {
    try {
        const notices = await noticeService.getNotices(req.user.id);
        res.json(notices);
    } catch (error) {
        console.log('GET NOTICES ERROR:', error);
        res.status(500).json({ error: error.message || 'Server error' });
    }
});

router.post('/', authenticateToken, requireAdmin, [
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
        console.log('CREATE NOTICE ERROR:', error);
        res.status(500).json({ error: error.message || 'Server error' });
    }
});

router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const result = await noticeService.deleteNotice(req.params.id);
        res.json(result);
    } catch (error) {
        console.log('DELETE NOTICE ERROR:', error);
        res.status(500).json({ error: error.message || 'Server error' });
    }
});

module.exports = router;
