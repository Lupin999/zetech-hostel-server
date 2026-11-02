const test = require('node:test');
const assert = require('node:assert/strict');
const paymentModel = require('../models/paymentModel');
const mpesa = require('../utils/mpesa');
const { normalizeMpesaPhone } = require('../utils/phone');

const servicePath = require.resolve('../services/paymentService');
const originalStkPush = mpesa.stkPush;
const originalMethods = {
    getApprovedBookingForPayment: paymentModel.getApprovedBookingForPayment,
    getPaymentsByBookingId: paymentModel.getPaymentsByBookingId,
    createPayment: paymentModel.createPayment,
};
let stkPushArguments;
let stkPushError;

mpesa.stkPush = async (...args) => {
    if (stkPushError) throw stkPushError;
    stkPushArguments = args;
    return { ResponseCode: '0', CheckoutRequestID: 'ws_CO_test' };
};
delete require.cache[servicePath];
const paymentService = require('../services/paymentService');

test.afterEach(() => {
    paymentModel.getApprovedBookingForPayment = originalMethods.getApprovedBookingForPayment;
    paymentModel.getPaymentsByBookingId = originalMethods.getPaymentsByBookingId;
    paymentModel.createPayment = originalMethods.createPayment;
    stkPushArguments = undefined;
    stkPushError = undefined;
});

test.after(() => {
    mpesa.stkPush = originalStkPush;
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
