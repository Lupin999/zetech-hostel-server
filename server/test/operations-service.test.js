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

    const result = await service.setStudentRole({ id: 10, role: 'student' }, 12, 'admin');

    assert.equal(result.status, 403);
    assert.match(result.error, /Only an admin/);
});

test('role changes only allow student or admin and record the target identity', async () => {
    const invalidRole = await service.setStudentRole({ id: 10, role: 'admin' }, 12, 'warden');
    assert.equal(invalidRole.status, 400);

    let auditEntry;
    model.getUserRoleDetails = async () => [[{
        id: 12, full_name: 'Student Example', reg_no: 'CS-01-0001/2026', role: 'student',
    }]];
    model.updateRole = async () => [{ affectedRows: 1 }];
    model.writeAuditLog = async (entry) => { auditEntry = entry; };

    const result = await service.setStudentRole({ id: 10, role: 'admin' }, 12, 'admin');

    assert.equal(result.message, 'User role updated');
    assert.equal(auditEntry.entityId, 12);
    assert.deepEqual(auditEntry.details, {
        target_name: 'Student Example',
        target_reg_no: 'CS-01-0001/2026',
        previous_role: 'student',
        role: 'admin',
    });
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

test('admin can delete an inspection and the deletion is audited', async () => {
    let auditEntry;
    model.deleteInspection = async () => [{ affectedRows: 1 }];
    model.writeAuditLog = async (entry) => { auditEntry = entry; };

    const result = await service.deleteInspection(5, 20);

    assert.deepEqual(result, { message: 'Room inspection deleted' });
    assert.equal(auditEntry.action, 'room.inspection_deleted');
    assert.equal(auditEntry.entityType, 'room_inspection');
    assert.equal(auditEntry.entityId, 20);
});

test('deleting a missing inspection returns not found', async () => {
    model.deleteInspection = async () => [{ affectedRows: 0 }];
    model.writeAuditLog = () => assert.fail('missing inspection must not be audited');

    const result = await service.deleteInspection(5, 20);

    assert.equal(result, null);
});

test('students without a checked-in room cannot submit service requests', async () => {
    model.getStudentCurrentStay = async () => [[], []];
    model.createRequest = () => assert.fail('request must not be created');

    const result = await service.createRequest(7, {
        title: 'Leaking tap', description: 'The tap is leaking.', request_type: 'maintenance',
    });

    assert.equal(result.status, 403);
    assert.match(result.error, /checked-in room/);
});

test('service requests are attached to the current checked-in room', async () => {
    let request;
    model.getStudentCurrentStay = async () => [[{ id: 14, room_id: 9 }], []];
    model.createRequest = async (value) => {
        request = value;
        return [{ insertId: 41 }];
    };

    const result = await service.createRequest(7, {
        title: 'Leaking tap', description: 'The tap is leaking.', request_type: 'maintenance',
    });

    assert.equal(result.id, 41);
    assert.equal(request.roomId, 9);
});

test('students without a checked-in room cannot register visitors', async () => {
    model.getStudentCurrentStay = async () => [[], []];
    model.createVisitor = () => assert.fail('visitor must not be created');

    const result = await service.createVisitor(7, {
        visitor_name: 'Guest', purpose: 'Visit',
    });

    assert.equal(result.status, 403);
    assert.match(result.error, /checked-in room/);
});

test('date reports reject reversed or malformed ranges', async () => {
    const result = await service.getReports('2026-10-20', '2026-10-01');

    assert.equal(result.status, 400);
    assert.match(result.error, /valid date range/);
});

test('date reports reject impossible calendar dates', async () => {
    model.getOverview = async () => ({});
    model.getPaymentReport = async () => [[], []];
    model.getBalances = async () => [[], []];

    const result = await service.getReports('2026-02-31', '2026-03-01');

    assert.equal(result.status, 400);
    assert.match(result.error, /valid date range/);
});

test('admins see the balance ledger while students see only their own balance', async () => {
    const requestedScopes = [];
    model.getBalances = async userId => {
        requestedScopes.push(userId);
        return [[], []];
    };

    await service.getBalances({ id: 14, role: 'student' });
    await service.getBalances({ id: 15, role: 'admin' });

    assert.deepEqual(requestedScopes, [14, null]);
});

test('student services only query records for the signed-in student', async () => {
    const requestedScopes = [];
    model.listRequests = async userId => { requestedScopes.push(userId); return [[]]; };
    model.listCheckoutRequests = async userId => { requestedScopes.push(userId); return [[]]; };
    model.getBalances = async userId => { requestedScopes.push(userId); return [[]]; };
    const student = { id: 21, role: 'student' };

    await service.listRequests(student);
    await service.listCheckoutRequests(student);
    await service.getBalances(student);

    assert.deepEqual(requestedScopes, [21, 21, 21]);
});

test('checkout requests require an active checked-in stay', async () => {
    model.getStudentCurrentStay = async () => [[], []];
    model.createCheckoutRequest = () => assert.fail('checkout request must not be created');

    const result = await service.createCheckoutRequest(7, 'Leaving campus');

    assert.equal(result.status, 409);
    assert.match(result.error, /checked in/);
});

test('students without a checked-in stay receive an empty current-stay result', async () => {
    model.getStudentCurrentStay = async () => [[], []];

    assert.deepEqual(await service.getStudentCurrentStay(7), { stay: null });
});

test('stay dates cannot exceed four months', async () => {
    model.updateStayDates = () => assert.fail('invalid stay dates must not be saved');

    const result = await service.updateStayDates(7, 31, '2026-01-31', '2026-06-01');

    assert.equal(result.status, 400);
    assert.match(result.error, /4 months/);
});

test('stay dates may span exactly four months', async () => {
    let updatedDates;
    model.updateStayDates = async (...dates) => {
        updatedDates = dates;
        return [{ affectedRows: 1 }];
    };
    model.writeAuditLog = async () => [];

    const result = await service.updateStayDates(7, 31, '2026-01-31', '2026-05-31');

    assert.equal(result.message, 'Stay dates updated');
    assert.deepEqual(updatedDates, [31, '2026-01-31', '2026-05-31']);
});

test('period closing dates clamp to the final day of the target month', async () => {
    let savedPeriod;
    model.createPeriod = async period => {
        savedPeriod = period;
        return [{ insertId: 31 }];
    };
    model.writeAuditLog = async () => [];

    const result = await service.createPeriod(7, {
        campus: 'Main Campus',
        hostel: 'Boys',
        semester: 'Semester 1',
        opens_on: '2024-01-31',
        duration_months: 1,
    });

    assert.equal(savedPeriod.closesOn, '2024-02-29');
    assert.equal(result.closes_on, '2024-02-29');
});

test('hostel periods cannot exceed four months', async () => {
    model.createPeriod = () => assert.fail('invalid hostel period must not be created');

    const result = await service.createPeriod(7, {
        campus: 'Main Campus',
        hostel: 'Boys',
        semester: 'Semester 1',
        opens_on: '2026-01-01',
        duration_months: 5,
    });

    assert.equal(result.status, 400);
    assert.match(result.error, /1 and 4 months/);
});

test('overlapping hostel periods are rejected by the serialized creation operation', async () => {
    model.createPeriod = async () => ({
        error: 'This period overlaps another scheduled or open period for that hostel and campus',
        status: 409,
    });

    const result = await service.createPeriod(7, {
        campus: 'Main Campus',
        hostel: 'Boys',
        semester: 'Semester 2',
        opens_on: '2026-09-01',
        duration_months: 3,
    });

    assert.equal(result.status, 409);
    assert.match(result.error, /overlaps/);
});