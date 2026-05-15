const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const healthService = require('../services/healthService');

router.get('/', authenticateToken, async (req, res) => {
    try {
        const profile = await healthService.getHealthProfile(req.user.id);
        res.json(profile);
    } catch (error) {
        console.log('GET HEALTH ERROR:', error);
        res.status(500).json({ error: error.message || 'Server error' });
    }
});

router.post('/', authenticateToken, async (req, res) => {
    try {
        const result = await healthService.saveHealthProfile(req.user.id, req.body);
        res.json(result);
    } catch (error) {
        console.log('SAVE HEALTH ERROR:', error);
        res.status(500).json({ error: error.message || 'Server error' });
    }
});

module.exports = router;
