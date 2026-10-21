const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const pool = require('../config/db');
const authService = require('../services/authService');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');
const programmes = require('../data/programmes');

const registerValidation = [
    body('email').isEmail().withMessage('Valid email is required'),
    body('full_name').trim().notEmpty().withMessage('Full name is required'),
    body('course').trim().notEmpty().withMessage('Programme is required')
        .bail().isIn(programmes.map(programme => programme.name)).withMessage('Select a valid Zetech programme'),
    body('reg_no').exists({ checkFalsy: true }).withMessage('Reg number is required')
        .bail().isString().withMessage('Reg number must be text')
        .bail().trim().custom((value, { req }) => {
            const match = /^([A-Z]{2,10})-(\d{2})-(\d{4})\/(\d{4})$/i.exec(value);
            if (!match) throw new Error('Reg number must follow CODE-00-0000/YYYY');
            const programme = programmes.find(item => item.name === req.body.course);
            if (!programme || match[1].toUpperCase() !== programme.code) {
                throw new Error('Reg number code must match the selected programme');
            }
            return true;
        }),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('gender').optional().isIn(['Male', 'Female']).withMessage('Gender must be Male or Female'),
];

const adminRegistrationValidation = [
    body('email').isEmail().withMessage('Valid email is required'),
    body('full_name').trim().notEmpty().withMessage('Full name is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

// Register
router.post('/register', registerValidation, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
    try {
        const { email, full_name, password, phone, gender, hostel_preference, course } = req.body;
        const reg_no = req.body.reg_no.trim().toUpperCase();
        const normalizedGender = gender === 'Female' ? 'Female' : 'Male';
        const normalizedHostel = hostel_preference || (normalizedGender === 'Male' ? 'Boys' : 'Girls');
        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await pool.query(
            'INSERT INTO users (reg_no, email, phone, full_name, password_hash, campus, gender, hostel_preference, course) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [reg_no, email, phone || null, full_name, hashedPassword, 'Zetech', normalizedGender, normalizedHostel, course?.trim() || null]
        );
        const user = {
            id: result.insertId,
            reg_no,
            email,
            phone: phone || null,
            full_name,
            role: 'student',
            campus: 'Zetech',
            gender: normalizedGender,
            hostel_preference: normalizedHostel,
            course: course?.trim() || null,
        };
        const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '24h' });
        res.status(201).json({ message: 'User registered successfully', token, user });
    } catch (error) {
        logger.error('REGISTER ERROR', { message: error.message });
        if (error.code === 'ER_DUP_ENTRY') {
            if (error.message.includes('phone')) return res.status(400).json({ error: 'Phone number already registered' });
            return res.status(400).json({ error: 'User already exists' });
        }
        res.status(500).json({ error: 'Server error' });
    }
});

// Login with email + password (specific errors)
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !email.trim()) return res.status(400).json({ error: 'Email is required', field: 'email' });
        if (!/\S+@\S+\.\S+/.test(email)) return res.status(400).json({ error: 'Please enter a valid email address', field: 'email' });
        if (!password) return res.status(400).json({ error: 'Password is required', field: 'password' });
        // NOTE: do NOT validate password format at login — only at registration.
        // Users may have set passwords before any format rules existed.

        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (!users.length) return res.status(401).json({ error: 'No account found with this email', field: 'email' });

        const user = users[0];
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) return res.status(401).json({ error: 'Incorrect password', field: 'password' });

        const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '24h' });
        res.json({ token, user: { id: user.id, reg_no: user.reg_no, email: user.email, phone: user.phone, full_name: user.full_name, role: user.role, campus: user.campus, gender: user.gender, hostel_preference: user.hostel_preference, course: user.course } });
    } catch (error) {
        logger.error('LOGIN ERROR', { message: error.message });
        res.status(500).json({ error: 'Server error' });
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
        logger.error('SEND OTP ERROR', { message: error.message });
        res.status(500).json({ error: 'Server error' });
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
        logger.error('VERIFY OTP ERROR', { message: error.message });
        res.status(500).json({ error: 'Server error' });
    }
});

// Middleware to verify JWT token — imported from shared middleware
// (No local re-declaration needed; authenticateToken is imported at the top)

// Verify token
router.get('/verify', authenticateToken, async (req, res) => {
    try {
        const [users] = await pool.query(
            'SELECT id, reg_no, email, phone, full_name, role, campus, gender, hostel_preference, course FROM users WHERE id = ?',
            [req.user.id]
        );
        if (!users.length) return res.status(401).json({ error: 'User not found' });
        res.json({ user: users[0] });
    } catch (error) {
        logger.error('VERIFY ERROR', { message: error.message });
        res.status(500).json({ error: 'Server error' });
    }
});

// Update profile (name, course, email, phone)
router.put('/profile/info', authenticateToken, async (req, res) => {
    try {
        const { full_name, course, email, phone } = req.body;
        if (!full_name?.trim()) return res.status(400).json({ error: 'Name is required' });

        // Validate email format if provided
        if (email?.trim() && !/\S+@\S+\.\S+/.test(email.trim())) {
            return res.status(400).json({ error: 'Please enter a valid email address' });
        }

        // Validate phone format if provided
        if (phone?.trim()) {
            const digitsOnly = phone.trim().replace(/\D/g, '');
            if (digitsOnly.length < 10 || digitsOnly.length > 15) {
                return res.status(400).json({ error: 'Phone number must be 10–15 digits' });
            }
        }

        // Check email uniqueness (excluding current user)
        if (email?.trim()) {
            const [existing] = await pool.query('SELECT id FROM users WHERE email = ? AND id != ?', [email.trim(), req.user.id]);
            if (existing.length) return res.status(400).json({ error: 'Email already used by another account' });
        }

        // Check phone uniqueness (excluding current user)
        if (phone?.trim()) {
            const [existing] = await pool.query('SELECT id FROM users WHERE phone = ? AND id != ?', [phone.trim(), req.user.id]);
            if (existing.length) return res.status(400).json({ error: 'Phone number already used by another account' });
        }

        await pool.query(
            'UPDATE users SET full_name = ?, course = ?, email = COALESCE(NULLIF(?, \'\'), email), phone = COALESCE(NULLIF(?, \'\'), phone) WHERE id = ?',
            [full_name.trim(), course?.trim() || null, email?.trim() || '', phone?.trim() || '', req.user.id]
        );

        const [users] = await pool.query(
            'SELECT id, reg_no, email, phone, full_name, role, campus, gender, hostel_preference, course FROM users WHERE id = ?',
            [req.user.id]
        );
        res.json({ message: 'Profile updated', user: users[0] });
    } catch (error) {
        console.log('UPDATE PROFILE ERROR:', error);
        if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Email or phone already in use' });
        res.status(500).json({ error: 'Server error' });
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
        logger.error('CHANGE PASSWORD ERROR', { message: error.message });
        res.status(500).json({ error: 'Server error' });
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
        logger.error('FORGOT PASSWORD ERROR', { message: error.message });
        res.status(500).json({ error: 'Server error' });
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
        logger.error('RESET PASSWORD ERROR', { message: error.message });
        res.status(500).json({ error: 'Server error' });
    }
});

// Create admin (secret code required)
router.post('/create-admin', adminRegistrationValidation, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
    const { email, full_name, password, phone, adminSecret } = req.body;
    if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
        return res.status(403).json({ error: 'Invalid admin secret code' });
    }
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query(
            'INSERT INTO users (email, phone, full_name, password_hash, role, campus) VALUES (?, ?, ?, ?, ?, ?)',
            [email, phone || null, full_name, hashedPassword, 'admin', 'Zetech']
        );
        res.status(201).json({ message: 'Admin account created successfully' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'User already exists' });
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
