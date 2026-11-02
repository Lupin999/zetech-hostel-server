const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeRole } = require('../utils/roles');

test('legacy staff roles resolve to admin while student stays student', () => {
    assert.equal(normalizeRole('admin'), 'admin');
    assert.equal(normalizeRole('accounts'), 'admin');
    assert.equal(normalizeRole('warden'), 'admin');
    assert.equal(normalizeRole('student'), 'student');
});
