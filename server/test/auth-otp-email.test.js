const test = require('node:test');
const assert = require('node:assert/strict');
const UserModel = require('../models/userModel');
const OtpModel = require('../models/otpModel');

const originalFindByPhone = UserModel.findByPhone;
const originalInvalidateExisting = OtpModel.invalidateExisting;
const originalCreateOtp = OtpModel.createOtp;
const originalFetch = global.fetch;
const originalApiKey = process.env.BREVO_API_KEY;
const originalSenderEmail = process.env.BREVO_SENDER_EMAIL;
let sendEmail;

const authService = require('../services/authService');

test.afterEach(() => {
    UserModel.findByPhone = originalFindByPhone;
    OtpModel.invalidateExisting = originalInvalidateExisting;
    OtpModel.createOtp = originalCreateOtp;
    global.fetch = originalFetch;
    if (originalApiKey === undefined) delete process.env.BREVO_API_KEY;
    else process.env.BREVO_API_KEY = originalApiKey;
    if (originalSenderEmail === undefined) delete process.env.BREVO_SENDER_EMAIL;
    else process.env.BREVO_SENDER_EMAIL = originalSenderEmail;
    sendEmail = async () => {};
});

const setup = (sendEmailHandler) => {
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
    process.env.BREVO_API_KEY = 'test-api-key';
    process.env.BREVO_SENDER_EMAIL = 'sender@example.com';
    sendEmail = sendEmailHandler;
    global.fetch = async (url, options) => {
        assert.equal(url, 'https://api.brevo.com/v3/smtp/email');
        const request = JSON.parse(options.body);
        await sendEmail({
            to: request.to[0].email,
            subject: request.subject,
            html: request.htmlContent,
            text: request.textContent,
        });
        return { ok: true, status: 201 };
    };
    return { invalidations, getSavedOtp: () => savedOtp };
};

test('phone login OTP is sent through Brevo to the account email', async () => {
    let sent;
    const state = setup(async (message) => { sent = message; });

    const result = await authService.sendOtp('+254712345678');

    assert.match(result.message, /st\*\*\*@example\.com/);
    assert.equal(sent.to, 'student@example.com');
    assert.equal(sent.subject, 'Your Zetech Hostel Login Code');
    assert.match(sent.text, new RegExp(state.getSavedOtp().code));
    assert.match(sent.html, new RegExp(state.getSavedOtp().code));
    assert.match(state.getSavedOtp().code, /^\d{6}$/);
    assert.equal(state.invalidations.length, 1);
});

test('failed Brevo OTP send invalidates the code and returns a service error', async () => {
    const state = setup(async () => {
        throw new Error('Brevo API request failed');
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
