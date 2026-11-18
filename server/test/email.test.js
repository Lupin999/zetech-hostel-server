/**
 * Unit tests for server/utils/email.js
 * Covers: html-only, text-only, and both-fields callers.
 * Uses Node's built-in test runner (node --test).
 */

'use strict';

const { test, mock } = require('node:test');
const assert = require('node:assert/strict');

// ── Minimal process.env setup ────────────────────────────────────────────────
process.env.BREVO_API_KEY = 'test-key';
process.env.BREVO_SENDER_EMAIL = 'test@example.com';

// Capture the last fetch call body
let lastRequestBody = null;

// Stub global fetch before requiring the module under test
global.fetch = mock.fn(async () => {
    return {
        ok: true,
        status: 200,
        text: async () => '',
    };
});

// Record what was sent
const originalFetch = global.fetch;
global.fetch = async (url, opts) => {
    lastRequestBody = JSON.parse(opts.body);
    return originalFetch(url, opts);
};

const { sendEmail } = require('../utils/email');

// ── Helper ───────────────────────────────────────────────────────────────────
const send = (opts) => sendEmail({ to: 'recipient@example.com', subject: 'Test', ...opts });

// ── Tests ────────────────────────────────────────────────────────────────────

test('html-only call: textContent is derived from html by stripping tags', async () => {
    await send({ html: '<p>Hello <b>World</b></p>' });

    assert.ok(lastRequestBody.htmlContent.includes('<p>Hello'), 'htmlContent preserved');
    assert.ok(lastRequestBody.textContent.length > 0, 'textContent is non-empty');
    assert.ok(!lastRequestBody.textContent.includes('<'), 'textContent has no HTML tags');
    assert.ok(lastRequestBody.textContent.includes('Hello'), 'textContent contains the text');
});

test('text-only call: htmlContent is generated from plain text', async () => {
    await send({ text: 'Your code is 123456.\nExpires in 5 minutes.' });

    assert.ok(lastRequestBody.textContent.includes('123456'), 'textContent has code');
    assert.ok(lastRequestBody.htmlContent.includes('123456'), 'htmlContent has code');
    assert.ok(lastRequestBody.htmlContent.includes('<br>'), 'line breaks converted to <br>');
    assert.ok(!lastRequestBody.textContent.includes('<'), 'textContent is plain text');
});

test('both html and text: both are passed through unchanged', async () => {
    await send({
        html: '<p>Reset code: <b>654321</b></p>',
        text: 'Reset code: 654321',
    });

    assert.ok(lastRequestBody.htmlContent.includes('<b>654321</b>'), 'html preserved as-is');
    assert.equal(lastRequestBody.textContent, 'Reset code: 654321', 'text preserved as-is');
});

test('neither html nor text: sends empty strings without throwing', async () => {
    await send({});

    assert.equal(typeof lastRequestBody.htmlContent, 'string', 'htmlContent is string');
    assert.equal(typeof lastRequestBody.textContent, 'string', 'textContent is string');
});
