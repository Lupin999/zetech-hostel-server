const test = require('node:test');
const assert = require('node:assert/strict');
const paymentModel = require('../models/paymentModel');
const mpesa = require('../utils/mpesa');
const { normalizeMpesaPhone } = require('../utils/phone');
const notificationService = require('../services/notificationService');

const servicePath = require.resolve('../services/paymentService');
const originalStkPush = mpesa.stkPush;
const originalSendNotification = notificationService.sendNotification;
const originalMethods = {
    getApprovedBookingForPayment: paymentModel.getApprovedBookingForPayment,
    getPaymentsByBookingId: paymentModel.getPaymentsByBookingId,
    createPayment: paymentModel.createPayment,
    recordAdminVerifiedPayment: paymentModel.recordAdminVerifiedPayment,
};
let stkPushArguments;
let stkPushError;

mpesa.stkPush = async (...args) => {
    if (stkPushError) throw stkPushError;
    stkPushArguments = args;
    return { ResponseCode: '0', CheckoutRequestID: 'ws_CO_test' };
};
notificationService.sendNotification = async () => {};
delete require.cache[servicePath];
const paymentService = require('../services/paymentService');

test.afterEach(() => {
    paymentModel.getApprovedBookingForPayment = originalMethods.getApprovedBookingForPayment;
    paymentModel.getPaymentsByBookingId = originalMethods.getPaymentsByBookingId;
    paymentModel.createPayment = originalMethods.createPayment;
    paymentModel.recordAdminVerifiedPayment = originalMethods.recordAdminVerifiedPayment;
    stkPushArguments = undefined;
    stkPushError = undefined;
});

test.after(() => {
    mpesa.stkPush = originalStkPush;
    notificationService.sendNotification = originalSendNotification;
    delete require.cache[servicePath];
});

test('STK payment always requests the KES 12,000 deposit using a normalized Kenyan phone', async () => {
    let storedPayment;
    paymentModel.getApprovedBookingForPayment = async () => [[{ id: 2 }]];
    paymentModel.getPaymentsByBookingId = async () => [[]];
    paymentModel.createPayment = async (...args) => { storedPayment = args; };

    const result = await paymentService.initiateStkPush(1, '0712 345 678', 2);

    assert.deepEqual(stkPushArguments, ['254712345678', 12000, 'ZH2']);
    assert.deepEqual(storedPayment, [2, 12000, 'mpesa', 'ws_CO_test']);
    assert.equal(result.amount, 12000);
    assert.equal(normalizeMpesaPhone('+254712345678'), '254712345678');
});

test('invalid Kenyan M-Pesa numbers are rejected before starting an STK push', async () => {
    paymentModel.getApprovedBookingForPayment = async () => [[{ id: 2 }]];
    paymentModel.getPaymentsByBookingId = async () => [[]];

    const result = await paymentService.initiateStkPush(1, '0201234567', 2);

    assert.equal(result.status, 400);
    assert.match(result.error, /valid Kenyan M-Pesa number/);
    assert.equal(stkPushArguments, undefined);
});

test('STK provider failures are marked separately from payment-recording failures', async () => {
    paymentModel.getApprovedBookingForPayment = async () => [[{ id: 2 }]];
    paymentModel.getPaymentsByBookingId = async () => [[]];
    stkPushError = Object.assign(new Error('Safaricom unavailable'), { code: 'ECONNRESET' });

    await assert.rejects(
        paymentService.initiateStkPush(1, '0712345678', 2),
        error => error.stage === 'mpesa-stk-push' && error.code === 'ECONNRESET'
    );
});

test('manual transaction-code payment submission is not exposed', () => {
    assert.equal(paymentService.submitPayment, undefined);
});

test('admin manual payment recording requires official-account verification', async () => {
    paymentModel.recordAdminVerifiedPayment = () => assert.fail('unverified payment must not be recorded');

    const result = await paymentService.recordAdminVerifiedPayment(
        { id: 8, role: 'admin' },
        { bookingId: 12, amount: 12000, mpesaCode: 'QWERTY1234', verified: false }
    );

    assert.equal(result.status, 400);
    assert.match(result.error, /official M-Pesa account/);
});

test('admin manual payment stores a normalized receipt only after verification', async () => {
    let payment;
    paymentModel.recordAdminVerifiedPayment = async (value) => {
        payment = value;
        return { id: 55, userId: 7, roomNumber: '12', amount: value.amount, mpesaCode: value.mpesaCode };
    };

    const result = await paymentService.recordAdminVerifiedPayment(
        { id: 8, role: 'admin' },
        { bookingId: 12, amount: '12000', mpesaCode: 'qwerty1234', verified: true }
    );

    assert.deepEqual(payment, {
        bookingId: 12, amount: 12000, mpesaCode: 'QWERTY1234', adminId: 8,
    });
    assert.equal(result.paymentId, 55);
});

test('student accounts cannot record manually verified payments', async () => {
    paymentModel.recordAdminVerifiedPayment = () => assert.fail('student must not record a payment');

    const result = await paymentService.recordAdminVerifiedPayment(
        { id: 7, role: 'student' },
        { bookingId: 12, amount: 12000, mpesaCode: 'QWERTY1234', verified: true }
    );

    assert.equal(result.status, 403);
});
