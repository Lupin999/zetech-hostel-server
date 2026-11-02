const jwt = require('jsonwebtoken');
const operationsModel = require('../models/operationsModel');
const logger = require('../utils/logger');
const { normalizeRole } = require('../utils/roles');

const mutationMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const auditedDetailFields = new Set([
    'status', 'role', 'suspended', 'room_id', 'bed_id', 'arrival_date', 'departure_date',
    'room_number', 'room_type', 'capacity', 'price', 'hostel', 'campus', 'semester',
    'opens_on', 'duration_months', 'closes_on', 'condition_status', 'cleanliness',
    'safety_status', 'priority', 'request_type', 'decision', 'target',
]);

function getAuditedChanges(body = {}) {
    return Object.fromEntries(
        Object.entries(body && typeof body === 'object' ? body : {}).filter(([key, value]) =>
            auditedDetailFields.has(key)
            && (value === null || ['string', 'number', 'boolean'].includes(typeof value))
            && String(value ?? '').length <= 200
        )
    );
}

module.exports = (req, res, next) => {
    if (!mutationMethods.has(req.method) || req.path.startsWith('/operations')) return next();
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return next();

    jwt.verify(token, process.env.JWT_SECRET, (error, user) => {
        if (error || normalizeRole(user?.role) !== 'admin') return next();

        res.on('finish', () => {
            if (res.statusCode < 200 || res.statusCode >= 400) return;
            const parts = req.path.split('/').filter(Boolean);
            const entityId = [...parts].reverse().find(part => /^\d+$/.test(part)) || null;
            operationsModel.writeAuditLog({
                actorId: user.id,
                action: `${req.method} ${req.baseUrl}${req.path}`.slice(0, 80),
                entityType: parts[0] || 'api',
                entityId,
                details: {
                    route: req.path,
                    changes: getAuditedChanges(req.body),
                },
            }).catch((auditError) => logger.error('ADMIN AUDIT WRITE ERROR', { message: auditError.message }));
        });
        next();
    });
};