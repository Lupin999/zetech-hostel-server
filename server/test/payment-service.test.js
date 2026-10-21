const test = require('node:test');
const assert = require('node:assert/strict');
const paymentModel = require('../models/paymentModel');
const paymentService = require('../services/paymentService');

const originalGetApprovedBookingForPayment = paymentModel.getApprovedBookingForPayment;

test.afterEach(() => {
    paymentModel.getApprovedBookingForPayment = originalGetApprovedBookingForPayment;
});

test('cash payment submissions are rejected before database access', async () => {
    paymentModel.getApprovedBookingForPayment = () => assert.fail('cash submission must not query bookings');

    const result = await paymentService.submitPayment(1, {
        booking_id: 2,
        amount: 30000,
        payment_method: 'cash',
    });

    assert.equal(result.status, 400);
    assert.match(result.error, /M-Pesa/);
});
