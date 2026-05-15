const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const pool = require('../config/db');
const AfricasTalking = require('africastalking');

let sms;
try {
  const at = AfricasTalking({ apiKey: process.env.AT_API_KEY || 'dummy', username: process.env.AT_USERNAME || 'sandbox' });
  sms = at.SMS;
} catch (_) {
  sms = { send: async () => ({ SMSMessageData: { Recipients: [] } }) };
}

const registerValidation = [
    body('reg_no').trim().notEmpty().withMessage('Reg number is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('full_name').trim().notEmpty().withMessage('Full name is required'),
    body('password').isLength({ main: 6 }).withMessage('Password must be at least 6 characters'),
    body('campus').trim().notEmpty().withMessage('Campus is required'),
];

// Register
router.post('/register', registerValidation, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
    try {
        const { reg_no, email, full_name, password, campus, phone } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query(
            'INSERT INTO users (reg_no, email, phone, full_name, password_hash, campus) VALUES (?, ?, ?, ?, ?, ?)',
            [reg_no, email, phone || null, full_name, hashedPassword, campus]
        );
        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        console.log('REGISTER ERROR:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            if (error.message.includes('phone')) return res.status(400).json({ error: 'Phone number already registered' });
            return res.status(400).json({ error: 'User already exists' });
        }
        res.status(500).json({ error: error.message || 'Server error' });
    }
});

// Login with email + password (specific errors)
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !email.trim()) return res.status(400).json({ error: 'Email is required', field: 'email' });
        if (!/\S+@\S+\.\S+/.test(email)) return res.status(400).json({ error: 'Please enter a valid email address', field: 'email' });
        if (!password) return res.status(400).json({ error: 'Password is required', field: 'password' });
        if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters', field: 'password' });
        if (!/^[a-zA-Z0-9]+$/.test(password)) {
            return res.status(400).json({ error: 'Password must contain only letters and numbers', field: 'password' });
        }
        if (!/[A-Z]/.test(password)) {
            return res.status(400).json({ error: 'Password must contain at least one capital letter', field: 'password' });
        }
        if (!/[0-9]/.test(password)) {
            return res.status(400).json({ error: 'Password must contain at least one number', field: 'password' });
        }

        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (!users.length) return res.status(401).json({ error: 'No account found with this email', field: 'email' });

        const user = users[0];
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) return res.status(401).json({ error: 'Incorrect password', field: 'password' });

        const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '24h' });
        res.json({ token, user: { id: user.id, reg_no: user.reg_no, email: user.email, phone: user.phone, full_name: user.full_name, role: user.role, campus: user.campus, course: user.course } });
    } catch (error) {
        console.log('LOGIN ERROR:', error);
        res.status(500).json({ error: error.message || 'Server error' });
    }
});

// Send OTP to phone
router.post('/send-otp', async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone) return res.status(400).json({ error: 'Phone number is required', field: 'phone' });

        const digitsOnly = phone.replace(/\D/g, '');
        if (digitsOnly.length < 10) return res.status(400).json({ error: 'Phone number is too short — must be at least 10 digits', field: 'phone' });
        if (digitsOnly.length > 15) return res.status(400).json({ error: 'Phone number is too long', field: 'phone' });

        const [users] = await pool.query('SELECT * FROM users WHERE phone = ?', [phone]);
        if (!users.length) return res.status(404).json({ error: 'No account found with this phone number', field: 'phone' });

        // Generate 6-digit OTP
        const code = String(Math.floor(100000 + Math.random() * 900000));
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min

        // Invalidate old codes
        await pool.query('UPDATE otp_codes SET used = TRUE WHERE phone = ? AND used = FALSE', [phone]);
        await pool.query('INSERT INTO otp_codes (phone, code, expires_at) VALUES (?, ?, ?)', [phone, code, expiresAt]);

        // Send SMS via Africa's Talking
        try {
            const smsOptions = { to: [phone], message: `Your Zetech Hostel login code is: ${code}. It expires in 5 minutes.` };
            if (process.env.AT_SENDER_ID) smsOptions.from = process.env.AT_SENDER_ID;
            await sms.send(smsOptions);
        } catch (smsErr) {
            console.log('[SMS ERROR]', smsErr.message);
            // Still allow login in dev with console fallback
            console.log(`[OTP FALLBACK] Code for ${phone}: ${code}`);
        }

        res.json({ message: 'OTP sent successfully', hint: process.env.NODE_ENV !== 'production' ? code : undefined });
    } catch (error) {
        console.log('SEND OTP ERROR:', error);
        res.status(500).json({ error: error.message || 'Server error' });
    }
});

// Verify OTP and login
router.post('/verify-otp', async (req, res) => {
    try {
        const { phone, code } = req.body;
        if (!phone || !code) return res.status(400).json({ error: 'Phone and OTP code are required' });

        const [otps] = await pool.query(
            'SELECT * FROM otp_codes WHERE phone = ? AND code = ? AND used = FALSE AND expires_at > NOW() ORDER BY id DESC LIMIT 1',
            [phone, code]
        );
        if (!otps.length) return res.status(401).json({ error: 'Invalid or expired OTP code', field: 'code' });

        // Mark used
        await pool.query('UPDATE otp_codes SET used = TRUE WHERE id = ?', [otps[0].id]);

        const [users] = await pool.query('SELECT * FROM users WHERE phone = ?', [phone]);
        if (!users.length) return res.status(404).json({ error: 'No account found with this phone number' });

        const user = users[0];
        const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '24h' });
        res.json({ token, user: { id: user.id, reg_no: user.reg_no, email: user.email, phone: user.phone, full_name: user.full_name, role: user.role, campus: user.campus, course: user.course } });
    } catch (error) {
        console.log('VERIFY OTP ERROR:', error);
        res.status(500).json({ error: error.message || 'Server error' });
    }
});

// Middleware to verify JWT token
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Access token required' });
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid or expired token' });
        req.user = user;
        next();
    });
}

// Verify token
router.get('/verify', authenticateToken, async (req, res) => {
    try {
        const [users] = await pool.query(
            'SELECT id, reg_no, email, phone, full_name, role, campus, course FROM users WHERE id = ?',
            [req.user.id]
        );
        if (!users.length) return res.status(401).json({ error: 'User not found' });
        res.json({ user: users[0] });
    } catch (error) {
        console.log('VERIFY ERROR:', error);
        res.status(500).json({ error: error.message || 'Server error' });
    }
});

// Update profile (name, course)
router.put('/profile/info', authenticateToken, async (req, res) => {
    try {
        const { full_name, course } = req.body;
        if (!full_name?.trim()) return res.status(400).json({ error: 'Name is required' });
        await pool.query('UPDATE users SET full_name = ?, course = ? WHERE id = ?', [full_name.trim(), course?.trim() || null, req.user.id]);
        const [users] = await pool.query('SELECT id, reg_no, email, phone, full_name, role, campus, course FROM users WHERE id = ?', [req.user.id]);
        res.json({ message: 'Profile updated', user: users[0] });
    } catch (error) {
        console.log('UPDATE PROFILE ERROR:', error);
        res.status(500).json({ error: error.message || 'Server error' });
    }
});

// Change password
router.put('/profile', authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Both passwords are required' });
        if (newPassword.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters' });

        const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
        if (!users.length) return res.status(404).json({ error: 'User not found' });

        const valid = await bcrypt.compare(currentPassword, users[0].password_hash);
        if (!valid) return res.status(400).json({ error: 'Current password is incorrect' });

        const hashed = await bcrypt.hash(newPassword, 10);
        await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [hashed, req.user.id]);
        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.log('CHANGE PASSWORD ERROR:', error);
        res.status(500).json({ error: error.message || 'Server error' });
    }
});

// Create admin (secret code required)
router.post('/create-admin', registerValidation, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
    const { reg_no, email, full_name, password, campus, adminSecret } = req.body;
    if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
        return res.status(403).json({ error: 'Invalid admin secret code' });
    }
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query(
            'INSERT INTO users (reg_no, email, full_name, password_hash, role, campus) VALUES (?, ?, ?, ?, ?, ?)',
            [reg_no, email, full_name, hashedPassword, 'admin', campus]
        );
        res.status(201).json({ message: 'Admin account created successfully' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'User already exists' });
        res.status(500).json({ error: error.message || 'Server error' });
    }
});

module.exports = router;
