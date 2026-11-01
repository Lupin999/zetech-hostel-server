const test = require('node:test');
const assert = require('node:assert/strict');
const { getAllowedOrigins } = require('../config/cors');

test('allows the production Netlify app with no environment configuration', () => {
    const origins = getAllowedOrigins('');

    assert.ok(origins.includes('https://zetechhostel.netlify.app'));
});

test('merges configured origins with defaults and removes duplicates', () => {
    const origins = getAllowedOrigins(
        'https://preview.example.net, https://zetechhostel.netlify.app,',
    );

    assert.ok(origins.includes('https://zetechhostel.netlify.app'));
    assert.ok(origins.includes('https://preview.example.net'));
    assert.equal(origins.filter((origin) => origin === 'https://zetechhostel.netlify.app').length, 1);
});
