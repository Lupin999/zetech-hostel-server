const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

const originalLoad = Module._load;
const originalNodeEnv = process.env.NODE_ENV;
const originalDbSsl = process.env.DB_SSL;
let poolOptions;

test.before(() => {
    Module._load = function (request, parent, isMain) {
        if (request === 'mysql2/promise') {
            return { createPool: (options) => { poolOptions = options; return {}; } };
        }
        return originalLoad.call(this, request, parent, isMain);
    };
});

test.after(() => {
    Module._load = originalLoad;
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    if (originalDbSsl === undefined) delete process.env.DB_SSL;
    else process.env.DB_SSL = originalDbSsl;
    delete require.cache[require.resolve('../config/db')];
});

const loadDatabaseConfig = (nodeEnv, dbSsl) => {
    process.env.NODE_ENV = nodeEnv;
    if (dbSsl === undefined) delete process.env.DB_SSL;
    else process.env.DB_SSL = dbSsl;
    delete require.cache[require.resolve('../config/db')];
    require('../config/db');
    return poolOptions.ssl;
};

test('production enables verified TLS by default', () => {
    assert.deepEqual(loadDatabaseConfig('production'), { rejectUnauthorized: true });
});

test('development keeps TLS opt-in', () => {
    assert.equal(loadDatabaseConfig('development'), false);
    assert.deepEqual(loadDatabaseConfig('development', 'true'), { rejectUnauthorized: true });
});

test('explicit DB_SSL=false disables TLS', () => {
    assert.equal(loadDatabaseConfig('production', 'false'), false);
});
