const crypto = require('crypto');
const path = require('path');
const bcrypt = require('bcryptjs');

require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const pool = require('./config/db');

const localHosts = new Set(['localhost', '127.0.0.1', '::1']);

async function seedLocalAccounts() {
    const dbHost = (process.env.DB_HOST || '').toLowerCase();
    if (process.env.NODE_ENV === 'production' || !localHosts.has(dbHost)) {
        throw new Error('Sample accounts can only be created on a local, non-production database.');
    }

    const suffix = crypto.randomBytes(5).toString('hex');
    const accounts = [
        { label: 'Admin 1', role: 'admin', gender: null, hostel: null },
        { label: 'Admin 2', role: 'admin', gender: null, hostel: null },
        { label: 'Student 1', role: 'student', gender: 'Male', hostel: 'Boys' },
        { label: 'Student 2', role: 'student', gender: 'Female', hostel: 'Girls' },
    ];
    const credentials = [];

    for (const [index, account] of accounts.entries()) {
        const email = `local-${account.role}-${suffix}-${account.label.endsWith('1') ? '1' : '2'}@example.test`;
        const password = `Local${crypto.randomBytes(12).toString('hex')}A9`;
        const passwordHash = await bcrypt.hash(password, 10);

        await pool.query(
            `INSERT INTO users
                (reg_no, email, full_name, password_hash, role, campus, gender, hostel_preference)
             VALUES (?, ?, ?, ?, ?, 'Zetech', ?, ?)`,
            [`TEST-${suffix}-${index + 1}`, email, `Local Test ${account.label}`, passwordHash, account.role, account.gender, account.hostel]
        );
        credentials.push({ label: account.label, email, password });
    }

    console.log('Created four local-only test accounts. Save these generated passwords now:');
    for (const credential of credentials) {
        console.log(`${credential.label}: ${credential.email} | ${credential.password}`);
    }
}

seedLocalAccounts()
    .catch((error) => {
        console.error(`Local account seed failed: ${error.message}`);
        process.exitCode = 1;
    })
    .finally(() => pool.end());
