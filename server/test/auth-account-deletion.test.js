const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const authService = require('../services/authService');

const originalGetConnection = pool.getConnection;

test.afterEach(() => {
    pool.getConnection = originalGetConnection;
});

const setupConnection = ({ role = 'student', admins = [{ id: 1 }, { id: 2 }], password = 'correct-password' } = {}) => {
    const statements = [];
    let committed = false;
    let rolledBack = false;
    const passwordHash = bcrypt.hashSync(password, 4);
    pool.getConnection = async () => ({
        beginTransaction: async () => {},
        commit: async () => { committed = true; },
        rollback: async () => { rolledBack = true; },
        release: () => {},
        query: async (sql) => {
            statements.push(sql);
            if (sql.includes('FROM users WHERE id = ? FOR UPDATE')) {
                return [[{ id: 7, role, phone: '0712345678', password_hash: passwordHash }]];
            }
            if (sql.includes("FROM users WHERE role IN ('admin', 'accounts', 'warden') FOR UPDATE")) return [admins];
            if (sql.includes('SELECT bed_id FROM bookings')) return [[{ bed_id: 3 }]];
            if (sql.includes('SELECT id FROM bookings WHERE user_id = ? FOR UPDATE')) {
                return [[{ id: 11 }, { id: 12 }]];
            }
            if (sql.includes('FROM payments WHERE booking_id IN')) return [[{ id: 21 }]];
            return [{ affectedRows: 1 }];
        },
    });
    return {
        statements,
        wasCommitted: () => committed,
        wasRolledBack: () => rolledBack,
    };
};

test('account deletion removes dependent data transactionally', async () => {
    const connection = setupConnection();

    const result = await authService.deleteAccount(7, 'correct-password');

    assert.equal(result.message, 'Account and linked booking/payment records permanently deleted');
    assert.equal(connection.wasCommitted(), true);
    assert.equal(connection.wasRolledBack(), false);
    assert.ok(connection.statements.some((sql) => sql.includes('DELETE FROM refund_requests')));
    assert.ok(connection.statements.some((sql) => sql.includes('DELETE FROM payments')));
    assert.ok(connection.statements.some((sql) => sql.includes('DELETE FROM bookings')));
    assert.ok(connection.statements.some((sql) => sql.includes('DELETE FROM users')));
});

test('account deletion requires the current password', async () => {
    const connection = setupConnection();

    const result = await authService.deleteAccount(7, 'wrong-password');

    assert.equal(result.status, 400);
    assert.match(result.error, /password is incorrect/);
    assert.equal(connection.wasCommitted(), false);
    assert.equal(connection.wasRolledBack(), true);
});

test('the last admin account cannot be deleted', async () => {
    const connection = setupConnection({ role: 'admin', admins: [{ id: 7 }] });

    const result = await authService.deleteAccount(7, 'correct-password');

    assert.equal(result.status, 409);
    assert.match(result.error, /last admin/);
    assert.equal(connection.wasCommitted(), false);
    assert.equal(connection.wasRolledBack(), true);
    assert.equal(connection.statements.some((sql) => sql.includes('DELETE FROM users')), false);
});
