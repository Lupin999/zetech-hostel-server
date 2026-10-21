const test = require('node:test');
const assert = require('node:assert/strict');
const model = require('../models/operationsModel');
const service = require('../services/operationsService');

const originals = { ...model };

test.afterEach(() => {
    Object.assign(model, originals);
});

test('only an administrator can change user roles', async () => {
    model.updateRole = () => assert.fail('role update must not run');

    const result = await service.setStudentRole({ id: 10, role: 'accounts' }, 12, 'warden');

    assert.equal(result.status, 403);
    assert.match(result.error, /Only an admin/);
});

test('check-in refuses bookings without an eligible approved paid stay', async () => {
    model.checkIn = async () => [{ affectedRows: 0 }];

    const result = await service.checkIn(5, 20);

    assert.equal(result.status, 409);
    assert.match(result.error, /confirmed payment/);
});

test('successful check-in is recorded in the audit log', async () => {
    let auditEntry;
    model.checkIn = async () => [{ affectedRows: 1 }];
    model.writeAuditLog = async entry => { auditEntry = entry; };

    const result = await service.checkIn(5, 20);

    assert.equal(result.message, 'Resident checked in');
    assert.equal(auditEntry.action, 'stay.checked_in');
    assert.equal(auditEntry.entityId, 20);
});

test('students without an approved booking cannot submit service requests', async () => {
    model.getStudentRoom = async () => [[], []];
    model.createRequest = () => assert.fail('request must not be created');

    const result = await service.createRequest(7, {
        title: 'Leaking tap', description: 'The tap is leaking.', request_type: 'maintenance',
    });

    assert.equal(result.status, 403);
    assert.match(result.error, /approved booking/);
});

test('date reports reject reversed or malformed ranges', async () => {
    const result = await service.getReports('2026-10-20', '2026-10-01');

    assert.equal(result.status, 400);
    assert.match(result.error, /valid date range/);
});

test('wardens see only their own balances; finance staff see the ledger', async () => {
    const requestedScopes = [];
    model.getBalances = async userId => {
        requestedScopes.push(userId);
        return [[], []];
    };

    await service.getBalances({ id: 14, role: 'warden' });
    await service.getBalances({ id: 15, role: 'accounts' });

    assert.deepEqual(requestedScopes, [14, null]);
});