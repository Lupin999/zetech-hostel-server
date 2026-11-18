const test = require('node:test');
const assert = require('node:assert/strict');
const logger = require('../utils/logger');
const { sendEmail } = require('../utils/email');

const originalFetch = global.fetch;
const originalSetTimeout = global.setTimeout;
const originalInfo = logger.info;
const originalError = logger.error;
const originalApiKey = process.env.BREVO_API_KEY;
const originalSenderEmail = process.env.BREVO_SENDER_EMAIL;

test.beforeEach(() => {
    process.env.BREVO_API_KEY = 'test-api-key';
    process.env.BREVO_SENDER_EMAIL = 'sender@example.com';
});

test.afterEach(() => {
    global.fetch = originalFetch;
    global.setTimeout = originalSetTimeout;
    logger.info = originalInfo;
    logger.error = originalError;
    if (originalApiKey === undefined) delete process.env.BREVO_API_KEY;
    else process.env.BREVO_API_KEY = originalApiKey;
    if (originalSenderEmail === undefined) delete process.env.BREVO_SENDER_EMAIL;
    else process.env.BREVO_SENDER_EMAIL = originalSenderEmail;
});

test('sends email using the Brevo API with a ten-second timeout', async () => {
    let request;
    let timeoutMs;
    let successLog;
    global.setTimeout = (callback, delay) => {
        timeoutMs = delay;
        return originalSetTimeout(callback, delay);
    };
    global.fetch = async (url, options) => {
        request = { url, options };
        return { ok: true, status: 201 };
    };
    logger.info = (...args) => { successLog = args; };

    await sendEmail({
        to: 'recipient@example.com',
        subject: 'Your code',
        html: '<p>123456</p>',
    });

    assert.equal(timeoutMs, 10_000);
    assert.equal(request.url, 'https://api.brevo.com/v3/smtp/email');
    assert.equal(request.options.method, 'POST');
    assert.equal(request.options.headers['api-key'], 'test-api-key');
    assert.equal(request.options.headers['Content-Type'], 'application/json');
    assert.deepEqual(JSON.parse(request.options.body), {
        sender: { name: 'Zetech Hostel', email: 'sender@example.com' },
        to: [{ email: 'recipient@example.com' }],
        subject: 'Your code',
        htmlContent: '<p>123456</p>',
        textContent: '',
    });
    assert.equal(request.options.signal instanceof AbortSignal, true);
    assert.deepEqual(successLog, ['[EMAIL] Sent via Brevo API']);
});

test('logs the status and response body when Brevo rejects an email', async () => {
    let errorLog;
    global.fetch = async () => ({
        ok: false,
        status: 401,
        text: async () => '{"message":"Invalid API key"}',
    });
    logger.error = (...args) => { errorLog = args; };

    await assert.rejects(
        sendEmail({ to: 'recipient@example.com', subject: 'Your code', html: '<p>123456</p>' }),
        /status 401/,
    );

    assert.deepEqual(errorLog, [
        '[EMAIL] Brevo API error',
        { status: 401, responseBody: '{"message":"Invalid API key"}' },
    ]);
});

test('aborts the Brevo request after ten seconds and reports a timeout', async () => {
    let abort;
    let timeoutMs;
    let errorLog;
    global.setTimeout = (callback, delay) => {
        abort = callback;
        timeoutMs = delay;
        return originalSetTimeout(callback, delay);
    };
    global.fetch = async (_url, { signal }) => {
        abort();
        assert.equal(signal.aborted, true);
        const error = new Error('The operation was aborted');
        error.name = 'AbortError';
        throw error;
    };
    logger.error = (...args) => { errorLog = args; };

    await assert.rejects(
        sendEmail({ to: 'recipient@example.com', subject: 'Your code', html: '<p>123456</p>' }),
        (error) => error.code === 'ETIMEDOUT',
    );

    assert.equal(timeoutMs, 10_000);
    assert.deepEqual(errorLog, [
        '[EMAIL] Brevo API error',
        { status: null, responseBody: 'Brevo API request timed out' },
    ]);
});
