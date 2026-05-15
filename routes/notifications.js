const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const notificationService = require('../services/notificationService');

router.get('/', authenticateToken, async (req, res) => {
    try {
        const notifications = await notificationService.getNotifications(req.user.id);
        res.json(notifications);
    } catch (error) {
        console.log('GET NOTIFICATIONS ERROR:', error);
        res.status(500).json({ error: error.message || 'Server error' });
    }
});

router.post('/send', authenticateToken, async (req, res) => {
    if (!['admin', 'warden', 'accounts'].includes(req.user.role))
        return res.status(403).json({ error: 'Admin only' });
    const { user_id, message } = req.body;
    if (!user_id || !message?.trim()) return res.status(400).json({ error: 'User ID and message required' });
    try {
        await notificationService.sendMessage(user_id, message);
        res.json({ message: 'Sent' });
    } catch (error) {
        console.log('SEND NOTIFICATION ERROR:', error);
        res.status(500).json({ error: error.message || 'Server error' });
    }
});

router.patch('/read', authenticateToken, async (req, res) => {
    try {
        await notificationService.markAllRead(req.user.id);
        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        console.log('MARK READ ERROR:', error);
        res.status(500).json({ error: error.message || 'Server error' });
    }
});

module.exports = router;
module.exports.sendNotification = notificationService.sendNotification;
