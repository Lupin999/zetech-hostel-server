const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const notificationService = require('../services/notificationService');
const logger = require('../utils/logger');

router.get('/', authenticateToken, async (req, res) => {
    try {
        const notifications = await notificationService.getNotifications(req.user.id);
        res.json(notifications);
    } catch (error) {
        logger.error('GET NOTIFICATIONS ERROR', { message: error.message });
        res.status(500).json({ error: 'Server error' });
    }
});

// Send a direct message to a user — admin/warden/accounts only
router.post('/send', authenticateToken, requireRole('admin', 'accounts', 'warden'), async (req, res) => {
    const { user_id, message } = req.body;
    if (!user_id || !message?.trim()) return res.status(400).json({ error: 'User ID and message required' });
    try {
        await notificationService.sendMessage(user_id, message);
        res.json({ message: 'Sent' });
    } catch (error) {
        logger.error('SEND NOTIFICATION ERROR', { message: error.message });
        res.status(500).json({ error: 'Server error' });
    }
});

router.patch('/read', authenticateToken, async (req, res) => {
    try {
        await notificationService.markAllRead(req.user.id);
        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        logger.error('MARK READ ERROR', { message: error.message });
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
