const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const programmes = require('../data/programmes');

// Public ping — used by keep-alive cron, no auth required
router.get('/ping', (req, res) => {
    res.json({ ok: true, ts: Date.now() });
});

router.get('/programmes', (req, res) => {
    res.json(programmes);
});

// API status check
router.get('/status', async (req, res) => {
    let dbStatus = 'disconnected';
    try {
        await pool.query('SELECT 1');
        dbStatus = 'connected';
    } catch (e) { dbStatus = 'error'; }

    res.json({
        status: 'running',
        version: '1.0.0',
        uptime: Math.floor(process.uptime()) + 's',
        database: dbStatus,
        timestamp: new Date().toISOString()
    });
});

// API documentation
router.get('/docs', (req, res) => {
    const docs = {
        name: 'Zetech Hostel API',
        version: '1.0.0',
        baseUrl: '/api',
        authentication: 'Bearer token in Authorization header',
        endpoints: {
            programmes: {
                'View programme options': {
                    description: 'Get the Zetech programme options used for student registration and profiles',
                    response: '[array of programme objects with level, code, and name]'
                }
            },
            auth: {
                'Create a student account': {
                    description: 'Register a new student account',
                    body: { reg_no: "BSE-01'0046/2024 (programme code, group, student number, and admission year)", email: 'string (required)', full_name: 'string (required)', course: 'Zetech programme (required)', password: 'string (min 6, alphanumeric, 1 capital)', phone: 'string (required, e.g. 0712345678 or +254712345678)' },
                    response: { message: 'User registered successfully', token: 'JWT token', user: 'Registered student profile' }
                },
                'Sign in with email and password': {
                    description: 'Login with email and password',
                    body: { email: 'string (required)', password: 'string (required)' },
                    response: { token: 'JWT token', user: 'user object' }
                },
                'Request a phone sign-in code': {
                    description: 'Send OTP code to email linked to phone number',
                    body: { phone: 'string (required, with country code)' },
                    response: { message: 'OTP sent to ma***@gmail.com', maskedEmail: 'string' }
                },
                'Sign in with a phone code': {
                    description: 'Verify OTP and login',
                    body: { phone: 'string (required)', code: 'string (6 digits)' },
                    response: { token: 'JWT token', user: 'user object' }
                },
                'Check the signed-in account': {
                    description: 'Verify current token and get user info',
                    auth: 'required',
                    response: { user: 'user object' }
                },
                'Update account details': {
                    description: 'Update profile name and course',
                    auth: 'required',
                    body: { full_name: 'string (required)', course: 'string (optional)' },
                    response: { message: 'Profile updated', user: 'user object' }
                },
                'Change account password': {
                    description: 'Change password',
                    auth: 'required',
                    body: { currentPassword: 'string', newPassword: 'string (min 6)' },
                    response: { message: 'Password updated successfully' }
                },
                'Delete the signed-in account': {
                    description: 'Permanently delete the signed-in account and linked records',
                    auth: 'required',
                    body: { currentPassword: 'string (required)' },
                    response: { message: 'Account and linked booking/payment records permanently deleted' }
                },
                'Create an administrator account': {
                    description: 'Create admin account (requires admin secret)',
                    body: { email: 'string (required)', full_name: 'string (required)', password: 'string (min 6)', phone: 'string (required)', adminSecret: 'string (required)' },
                    response: { message: 'Admin account created successfully' }
                }
            },
            rooms: {
                'View available rooms': {
                    description: 'Get all rooms',
                    auth: 'required',
                    response: '[array of room objects]'
                },
                'Add a room': {
                    description: 'Add a new room (admin only)',
                    auth: 'required (admin)',
                    body: { room_number: 'string', hostel: 'Boys|Girls', campus: 'string', room_type: 'single|double|quad', capacity: 'number', price: 'number' },
                    response: { message: 'Room added' }
                },
                'Update a room': {
                    description: 'Update a room (admin only)',
                    auth: 'required (admin)',
                    response: { message: 'Room updated' }
                },
                'Remove a room': {
                    description: 'Delete a room (admin only)',
                    auth: 'required (admin)',
                    response: { message: 'Room deleted' }
                },
                'View beds in a room': {
                    description: 'Get beds for a room',
                    auth: 'required',
                    response: '[array of bed objects]'
                }
            },
            bookings: {
                'View my current booking': {
                    description: 'Get current user active booking',
                    auth: 'required',
                    response: 'booking object or null'
                },
                'Check whether booking is open': {
                    description: 'Check if booking is open/closed',
                    auth: 'required',
                    response: { open: 'boolean' }
                },
                'Submit a room booking': {
                    description: 'Create a new booking',
                    auth: 'required',
                    body: { room_id: 'number', bed_id: 'number (optional)', semester: 'string', arrival_date: 'date (optional)' },
                    response: { message: 'Booking request submitted' }
                },
                'View my bookings': {
                    description: 'Get all my bookings',
                    auth: 'required',
                    response: '[array of booking objects]'
                },
                'Review all bookings': {
                    description: 'Get all bookings (admin only)',
                    auth: 'required (admin)',
                    response: '[array of booking objects]'
                },
                'Approve or reject a booking': {
                    description: 'Approve or reject booking (admin only)',
                    auth: 'required (admin)',
                    body: { status: 'approved|rejected', reason: 'required on rejection (5-500 characters)' },
                    response: { message: 'Booking approved/rejected', reason: 'rejection reason or null' }
                },
                'Suspend or unsuspend a booking': {
                    description: 'Suspend or unsuspend booking (admin only)',
                    auth: 'required (admin)',
                    body: { suspended: 'boolean', reason: 'string (optional)' },
                    response: { message: 'Booking suspended/unsuspended' }
                },
                'Open or close booking requests': {
                    description: 'Open or close bookings (admin only)',
                    auth: 'required (admin)',
                    body: { open: 'boolean' },
                    response: { open: 'boolean', message: 'string' }
                },
                'Cancel a pending booking': {
                    description: 'Cancel a pending booking',
                    auth: 'required',
                    response: { message: 'Booking cancelled' }
                }
            },
            payments: {
                'Request the M-Pesa deposit': {
                    description: 'Request the fixed KES 12,000 M-Pesa hostel deposit',
                    auth: 'required',
                    body: { phone: 'string (Kenyan 07... or 254...)', booking_id: 'number' },
                    response: { checkoutRequestId: 'string', amount: 12000, message: 'string' }
                },
                'Check M-Pesa payment status': {
                    description: 'Check STK push payment status',
                    auth: 'required',
                    body: { checkout_request_id: 'string' },
                    response: { status: 'string' }
                },
                'View my payments': {
                    description: 'Get my payments',
                    auth: 'required',
                    response: '[array of payment objects]'
                },
                'Review payment records': {
                    description: 'Get all payment records (admin only)',
                    auth: 'required (admin)',
                    response: '[array of payment objects]'
                }
            },
            notices: {
                'View hostel notices': {
                    description: 'Get all notices',
                    auth: 'required',
                    response: '[array of notice objects]'
                },
                'Post a hostel notice': {
                    description: 'Create a notice (admin only)',
                    auth: 'required (admin)',
                    body: { title: 'string', message: 'string' },
                    response: { message: 'Notice created' }
                }
            },
            notifications: {
                'View my notifications': {
                    description: 'Get my notifications',
                    auth: 'required',
                    response: '[array of notification objects]'
                },
                'Mark all notifications as read': {
                    description: 'Mark all notifications as read',
                    auth: 'required',
                    response: { message: 'All marked as read' }
                }
            },
            health: {
                'View my health profile': {
                    description: 'Get my health profile',
                    auth: 'required',
                    response: 'health profile object'
                },
                'Save my health profile': {
                    description: 'Save/update health profile',
                    auth: 'required',
                    body: { medical_conditions: 'string', dietary_restrictions: 'string' },
                    response: { message: 'Health profile saved' }
                }
            },
            operations: {
                description: 'Resident lifecycle, checkout approvals, hostel periods, maintenance requests, inspections, finance reporting, student administration, and audit workflows',
                basePath: '/api/operations',
                endpoints: [
                    'View and manage student roles (admin)',
                    'Review current stays and check residents in or out (admin)',
                    'Update resident stay dates and view stay history (admin)',
                    'Submit or review checkout requests (student scoped; admin review)',
                    'Create hostel periods (admin)',
                    'Submit maintenance requests or complaints (student scoped)',
                    'Review resident requests (admin)',
                    'Record room inspections and update room status (admin)',
                    'View a payment receipt or personal balance (owner or authorized staff)',
                    'View finance reports (admin)',
                    'Review audit history (admin)',
                ]
            }
        }
    };

    res.json(docs);
});

module.exports = router;
