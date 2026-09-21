const test = require('node:test');
const assert = require('node:assert/strict');

const envModule = require('../config/env');

test('required env keys include the admin secret and core database settings', () => {
  assert.ok(Array.isArray(envModule.requiredEnvKeys));
  assert.ok(envModule.requiredEnvKeys.includes('DB_HOST'));
  assert.ok(envModule.requiredEnvKeys.includes('DB_NAME'));
  assert.ok(envModule.requiredEnvKeys.includes('JWT_SECRET'));
  assert.ok(envModule.requiredEnvKeys.includes('ADMIN_SECRET'));
});
