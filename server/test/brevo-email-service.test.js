const test = require('node:test');
const assert = require('node:assert/strict');
const axios = require('axios');
const { sendOtpEmail } = require('../services/brevoEmailService');

const originalPost = axios.post;
const originalApiKey = process.env.BREVO_API_KEY;
const originalSenderEmail = process.env.BREVO_SENDER_EMAIL;
const originalSenderName = process.env.BREVO_SENDER_NAME;

test.afterEach(() => {
    axios.post = originalPost;
    if (originalApiKey === undefined) delete process.env.BREVO_API_KEY;
    else process.env.BREVO_API_KEY = originalApiKey;
    if (originalSenderEmail === undefined) delete process.env.BREVO_SENDER_EMAIL;
    else process.env.BREVO_SENDER_EMAIL = originalSenderEmail;
    if (originalSenderName === undefined) delete process.env.BREVO_SENDER_NAME;
    else process.env.BREVO_SENDER_NAME = originalSenderName;
});

test('Brevo OTP email uses the configured sender, API key, recipient, and escaped content', async () => {
    process.env.BREVO_API_KEY = 'test-key';
    process.env.BREVO_SENDER_EMAIL = 'verified@example.com';
    process.env.BREVO_SENDER_NAME = 'Hostel <Support>';
    let request;
    axios.post = async (...args) => {
        request = args;
        return { status: 201, data: { messageId: 'message-id' } };
    };

    await sendOtpEmail({
        email: 'student@example.com',
        fullName: '<Student>',
        code: '123456',
    });

    assert.equal(request[0], 'https://api.brevo.com/v3/smtp/email');
    assert.deepEqual(request[1].sender, {
        name: 'Hostel <Support>',
        email: 'verified@example.com',
    });
    assert.deepEqual(request[1].to, [{ email: 'student@example.com', name: '<Student>' }]);
    assert.match(request[1].htmlContent, /&lt;Student&gt;/);
    assert.equal(request[2].headers['api-key'], 'test-key');
    assert.equal(request[2].timeout, 10000);
});

test('Brevo OTP email fails explicitly when required configuration is missing', async () => {
    delete process.env.BREVO_API_KEY;
    process.env.BREVO_SENDER_EMAIL = 'verified@example.com';
    axios.post = async () => {
        assert.fail('Brevo must not be called without an API key');
    };

    await assert.rejects(
        sendOtpEmail({ email: 'student@example.com', fullName: 'Student', code: '123456' }),
        /BREVO_API_KEY is not configured/,
    );
});
