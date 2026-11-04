const test = require('node:test');
const assert = require('node:assert/strict');
const UserModel = require('../models/userModel');
const OtpModel = require('../models/otpModel');
const brevoEmailService = require('../services/brevoEmailService');
const authService = require('../services/authService');

const originalFindByPhone = UserModel.findByPhone;
const originalInvalidateExisting = OtpModel.invalidateExisting;
const originalCreateOtp = OtpModel.createOtp;
const originalSendOtpEmail = brevoEmailService.sendOtpEmail;

test.afterEach(() => {
    UserModel.findByPhone = originalFindByPhone;
    OtpModel.invalidateExisting = originalInvalidateExisting;
    OtpModel.createOtp = originalCreateOtp;
    brevoEmailService.sendOtpEmail = originalSendOtpEmail;
});

const setup = (sendEmail) => {
    const invalidations = [];
    let savedOtp;
    UserModel.findByPhone = async () => [[{
        id: 1,
        phone: '+254712345678',
        email: 'student@example.com',
        full_name: 'Student',
        role: 'student',
    }]];
    OtpModel.invalidateExisting = async (phone) => {
        invalidations.push(phone);
    };
    OtpModel.createOtp = async (phone, code, expiresAt) => {
        savedOtp = { phone, code, expiresAt };
    };
    brevoEmailService.sendOtpEmail = sendEmail;
    return { invalidations, getSavedOtp: () => savedOtp };
};

test('phone login OTP is sent through Brevo to the account email', async () => {
    let sent;
    const state = setup(async (message) => { sent = message; });

    const result = await authService.sendOtp('+254712345678');

    assert.match(result.message, /st\*\*\*@example\.com/);
    assert.deepEqual(sent, {
        email: 'student@example.com',
        fullName: 'Student',
        code: state.getSavedOtp().code,
    });
    assert.match(state.getSavedOtp().code, /^\d{6}$/);
    assert.equal(state.invalidations.length, 1);
});

test('failed Brevo OTP send invalidates the code and returns a service error', async () => {
    const state = setup(async () => {
        throw new Error('Brevo request failed');
    });

    const result = await authService.sendOtp('+254712345678');

    assert.equal(result.status, 503);
    assert.match(result.error, /Could not send the login code email/);
    assert.equal(state.invalidations.length, 2);
});

test('Brevo timeout returns a clear retry message and invalidates the code', async () => {
    const state = setup(async () => {
        const error = new Error('Request timed out');
        error.code = 'ECONNABORTED';
        throw error;
    });

    const result = await authService.sendOtp('+254712345678');

    assert.equal(result.status, 503);
    assert.equal(result.error, 'The login code email timed out. Please try again.');
    assert.equal(state.invalidations.length, 2);
});
