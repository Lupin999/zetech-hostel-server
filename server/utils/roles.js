const pool = require('../config/db');

const legacyAdminRoles = new Set(['accounts', 'warden']);

const normalizeRole = (role) => legacyAdminRoles.has(role) ? 'admin' : role;

const normalizeStoredRole = async (user) => {
    const role = normalizeRole(user.role);
    if (role !== user.role) {
        await pool.query('UPDATE users SET role = ? WHERE id = ? AND role = ?', [role, user.id, user.role]);
    }
    return { ...user, role };
};

module.exports = { normalizeRole, normalizeStoredRole };
