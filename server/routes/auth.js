const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const pool = require('../config/db');
const authService = require('../services/authService');
const { authenticateToken } = require('../middleware/auth');

const registerValidation = [
    body('reg_no').trim().notEmpty().withMessage('Reg number is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('full_name').trim().notEmpty().withMessage('Full name is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
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

// Send OTP to phone (delivers code via email)
router.post('/send-otp', async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone) return res.status(400).json({ error: 'Phone number is required', field: 'phone' });

        const digitsOnly = phone.replace(/\D/g, '');
        if (digitsOnly.length < 10) return res.status(400).json({ error: 'Phone number is too short — must be at least 10 digits', field: 'phone' });
        if (digitsOnly.length > 15) return res.status(400).json({ error: 'Phone number is too long', field: 'phone' });

        const result = await authService.sendOtp(phone);
        if (result.error) return res.status(result.status || 400).json({ error: result.error, field: result.field });
        res.json(result);
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

        const result = await authService.verifyOtp(phone, code);
        if (result.error) return res.status(result.status || 400).json({ error: result.error, field: result.field });
        res.json(result);
    } catch (error) {
        console.log('VERIFY OTP ERROR:', error);
        res.status(500).json({ error: error.message || 'Server error' });
    }
});

// Middleware to verify JWT token — imported from shared middleware
// (No local re-declaration needed; authenticateToken is imported at the top)

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

// Forgot password
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email is required' });
        const result = await authService.forgotPassword(email);
        if (result.error) return res.status(result.status || 400).json({ error: result.error });
        res.json(result);
    } catch (error) {
        console.log('FORGOT PASSWORD ERROR:', error);
        res.status(500).json({ error: error.message || 'Server error' });
    }
});

// Reset password
router.post('/reset-password', async (req, res) => {
    try {
        const { email, code, newPassword } = req.body;
        if (!email || !code || !newPassword) return res.status(400).json({ error: 'All fields are required' });
        if (newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
        const result = await authService.resetPassword(email, code, newPassword);
        if (result.error) return res.status(result.status || 400).json({ error: result.error });
        res.json(result);
    } catch (error) {
        console.log('RESET PASSWORD ERROR:', error);
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
