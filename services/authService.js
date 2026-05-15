const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const UserModel = require('../models/userModel');
const OtpModel = require('../models/otpModel');

// OTP brute-force protection: max 3 wrong attempts per phone, locked 15 min
const otpAttempts = new Map();
const OTP_MAX_ATTEMPTS = 3;
const OTP_LOCKOUT_MS = 15 * 60 * 1000;

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.SMTP_EMAIL, pass: process.env.SMTP_PASSWORD }
});

const formatUser = (u) => ({
    id: u.id, reg_no: u.reg_no, email: u.email, phone: u.phone,
    full_name: u.full_name, role: u.role, campus: u.campus, course: u.course
});

const createToken = (user) => {
    return jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '24h' });
};

const registerUser = async ({ reg_no, email, phone, full_name, password, campus }) => {
    const hashedPassword = await bcrypt.hash(password, 10);
    await UserModel.createUser(reg_no, email, phone, full_name, hashedPassword, campus);
    return { message: 'User registered successfully' };
};

const registerAdmin = async ({ reg_no, email, full_name, password, campus, phone }) => {
    const hashedPassword = await bcrypt.hash(password, 10);
    await UserModel.createUser(reg_no, email, phone || null, full_name, hashedPassword, campus, 'admin');
    return { message: 'Admin account created successfully' };
};

const loginUser = async (email, password) => {
    const [users] = await UserModel.findByEmail(email);
    if (!users.length) return { error: 'No account found with this email', field: 'email', status: 401 };

    const user = users[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return { error: 'Incorrect password', field: 'password', status: 401 };

    const token = createToken(user);
    return { token, user: formatUser(user) };
};

const sendOtp = async (phone) => {
    const [users] = await UserModel.findByPhone(phone);
    if (!users.length) return { error: 'No account found with this phone number', field: 'phone', status: 404 };

    const user = users[0];
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await OtpModel.invalidateExisting(phone);
    await OtpModel.createOtp(phone, code, expiresAt);

    // Send OTP via email
    const maskedEmail = user.email.replace(/(.{2})(.*)(@.*)/, '$1***$3');
    try {
        await transporter.sendMail({
            from: `"Zetech Hostel" <${process.env.SMTP_EMAIL}>`,
            to: user.email,
            subject: 'Your Zetech Hostel Login Code',
            html: `
                <div style="font-family:Arial,sans-serif;max-width:400px;margin:0 auto;padding:20px;border:1px solid #e0e0e0;border-radius:8px">
                    <h2 style="color:#1a237e;text-align:center">Zetech Hostel</h2>
                    <p>Hi <b>${user.full_name}</b>,</p>
                    <p>Your login verification code is:</p>
                    <div style="text-align:center;margin:20px 0">
                        <span style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#1a237e">${code}</span>
                    </div>
                    <p style="color:#666;font-size:13px">This code expires in 5 minutes. Do not share it with anyone.</p>
                </div>
            `
        });
    } catch (emailErr) {
        console.log('[EMAIL ERROR]', emailErr.message);
        console.log(`[OTP FALLBACK] Code for ${phone}: ${code}`);
    }

    return { message: `OTP sent to ${maskedEmail}`, maskedEmail };
};

const verifyOtp = async (phone, code) => {
    // Check if locked out
    const attempts = otpAttempts.get(phone);
    if (attempts && attempts.count >= OTP_MAX_ATTEMPTS) {
        const elapsed = Date.now() - attempts.lastAttempt;
        if (elapsed < OTP_LOCKOUT_MS) {
            const minsLeft = Math.ceil((OTP_LOCKOUT_MS - elapsed) / 60000);
            return { error: `Too many failed attempts. Try again in ${minsLeft} minutes`, field: 'code', status: 429 };
        }
        otpAttempts.delete(phone);
    }

    const [otps] = await OtpModel.findValidOtp(phone, code);
    if (!otps.length) {
        // Track failed attempt
        const current = otpAttempts.get(phone) || { count: 0, lastAttempt: 0 };
        current.count++;
        current.lastAttempt = Date.now();
        otpAttempts.set(phone, current);
        const remaining = OTP_MAX_ATTEMPTS - current.count;
        const msg = remaining > 0 ? `Invalid or expired OTP code. ${remaining} attempts remaining` : 'Too many failed attempts. Locked for 15 minutes';
        return { error: msg, field: 'code', status: 401 };
    }

    // Success — clear attempts
    otpAttempts.delete(phone);
    await OtpModel.markUsed(otps[0].id);

    const [users] = await UserModel.findByPhone(phone);
    if (!users.length) return { error: 'No account found with this phone number', status: 404 };

    const user = users[0];
    const token = createToken(user);
    return { token, user: formatUser(user) };
};

const verifyToken = async (userId) => {
    const [users] = await UserModel.findById(userId);
    if (!users.length) return { error: 'User not found', status: 401 };
    return { user: users[0] };
};

const updateProfile = async (userId, full_name, course, phone, email) => {
    if (phone?.trim()) {
        const [existing] = await UserModel.findByPhone(phone.trim());
        if (existing.length && existing[0].id !== userId) {
            return { error: 'Phone number already used by another account', status: 400 };
        }
    }
    if (email?.trim()) {
        const [existing] = await UserModel.findByEmail(email.trim());
        if (existing.length && existing[0].id !== userId) {
            return { error: 'Email already used by another account', status: 400 };
        }
    }
    await UserModel.updateProfile(userId, full_name.trim(), course?.trim(), phone?.trim(), email?.trim());
    const [users] = await UserModel.findById(userId);
    return { message: 'Profile updated', user: users[0] };
};

const changePassword = async (userId, currentPassword, newPassword) => {
    const [userInfo] = await UserModel.findById(userId);
    if (!userInfo.length) return { error: 'User not found', status: 404 };

    const [users] = await UserModel.findByEmail(userInfo[0].email);
    if (!users.length) return { error: 'User not found', status: 404 };

    const valid = await bcrypt.compare(currentPassword, users[0].password_hash);
    if (!valid) return { error: 'Current password is incorrect', status: 400 };

    const hashed = await bcrypt.hash(newPassword, 10);
    await UserModel.updatePassword(userId, hashed);
    return { message: 'Password updated successfully' };
};

const forgotPassword = async (email) => {
    const [users] = await UserModel.findByEmail(email);
    if (!users.length) return { error: 'No account found with this email', status: 404 };

    const user = users[0];
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Store reset code using OTP table (use email as key)
    await OtpModel.invalidateExisting(email);
    await OtpModel.createOtp(email, code, expiresAt);

    try {
        await transporter.sendMail({
            from: `"Zetech Hostel" <${process.env.SMTP_EMAIL}>`,
            to: email,
            subject: 'Password Reset Code - Zetech Hostel',
            html: `
                <div style="font-family:Arial,sans-serif;max-width:400px;margin:0 auto;padding:20px;border:1px solid #e0e0e0;border-radius:8px">
                    <h2 style="color:#1a237e;text-align:center">Zetech Hostel</h2>
                    <p>Hi <b>${user.full_name}</b>,</p>
                    <p>You requested a password reset. Your code is:</p>
                    <div style="text-align:center;margin:20px 0">
                        <span style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#e53935">${code}</span>
                    </div>
                    <p style="color:#666;font-size:13px">This code expires in 10 minutes. If you didn't request this, ignore this email.</p>
                </div>
            `
        });
    } catch (emailErr) {
        console.log('[EMAIL ERROR]', emailErr.message);
        console.log(`[RESET FALLBACK] Code for ${email}: ${code}`);
    }

    const maskedEmail = email.replace(/(.{2})(.*)(@.*)/, '$1***$3');
    return { message: `Reset code sent to ${maskedEmail}`, maskedEmail };
};

const resetPassword = async (email, code, newPassword) => {
    const [otps] = await OtpModel.findValidOtp(email, code);
    if (!otps.length) return { error: 'Invalid or expired reset code', status: 401 };

    await OtpModel.markUsed(otps[0].id);

    const [users] = await UserModel.findByEmail(email);
    if (!users.length) return { error: 'User not found', status: 404 };

    const hashed = await bcrypt.hash(newPassword, 10);
    await UserModel.updatePassword(users[0].id, hashed);
    return { message: 'Password reset successfully. You can now login with your new password.' };
};

module.exports = { registerUser, registerAdmin, loginUser, sendOtp, verifyOtp, verifyToken, updateProfile, changePassword, forgotPassword, resetPassword };
