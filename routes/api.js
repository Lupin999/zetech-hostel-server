const express = require('express');
const router = express.Router();
const pool = require('../config/db');

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
            auth: {
                'POST /api/auth/register': {
                    description: 'Register a new student account',
                    body: { reg_no: 'string (required)', email: 'string (required)', full_name: 'string (required)', password: 'string (min 6, alphanumeric, 1 capital)', campus: 'string (required)', phone: 'string (optional, with country code e.g. +254712345678)' },
                    response: { message: 'User registered successfully' }
                },
                'POST /api/auth/login': {
                    description: 'Login with email and password',
                    body: { email: 'string (required)', password: 'string (required)' },
                    response: { token: 'JWT token', user: 'user object' }
                },
                'POST /api/auth/send-otp': {
                    description: 'Send OTP code to email linked to phone number',
                    body: { phone: 'string (required, with country code)' },
                    response: { message: 'OTP sent to ma***@gmail.com', maskedEmail: 'string' }
                },
                'POST /api/auth/verify-otp': {
                    description: 'Verify OTP and login',
                    body: { phone: 'string (required)', code: 'string (6 digits)' },
                    response: { token: 'JWT token', user: 'user object' }
                },
                'GET /api/auth/verify': {
                    description: 'Verify current token and get user info',
                    auth: 'required',
                    response: { user: 'user object' }
                },
                'PUT /api/auth/profile/info': {
                    description: 'Update profile name and course',
                    auth: 'required',
                    body: { full_name: 'string (required)', course: 'string (optional)' },
                    response: { message: 'Profile updated', user: 'user object' }
                },
                'PUT /api/auth/profile': {
                    description: 'Change password',
                    auth: 'required',
                    body: { currentPassword: 'string', newPassword: 'string (min 6)' },
                    response: { message: 'Password updated successfully' }
                },
                'POST /api/auth/create-admin': {
                    description: 'Create admin account (requires admin secret)',
                    body: { reg_no: 'string', email: 'string', full_name: 'string', password: 'string', campus: 'string', adminSecret: 'string' },
                    response: { message: 'Admin account created successfully' }
                }
            },
            rooms: {
                'GET /api/rooms': {
                    description: 'Get all rooms',
                    auth: 'required',
                    response: '[array of room objects]'
                },
                'POST /api/rooms': {
                    description: 'Add a new room (admin only)',
                    auth: 'required (admin)',
                    body: { room_number: 'string', hostel: 'Boys|Girls', campus: 'string', room_type: 'single|double|quad', capacity: 'number', price: 'number' },
                    response: { message: 'Room added' }
                },
                'PUT /api/rooms/:id': {
                    description: 'Update a room (admin only)',
                    auth: 'required (admin)',
                    response: { message: 'Room updated' }
                },
                'DELETE /api/rooms/:id': {
                    description: 'Delete a room (admin only)',
                    auth: 'required (admin)',
                    response: { message: 'Room deleted' }
                },
                'GET /api/rooms/:id/beds': {
                    description: 'Get beds for a room',
                    auth: 'required',
                    response: '[array of bed objects]'
                }
            },
            bookings: {
                'GET /api/bookings/active': {
                    description: 'Get current user active booking',
                    auth: 'required',
                    response: 'booking object or null'
                },
                'GET /api/bookings/status': {
                    description: 'Check if booking is open/closed',
                    auth: 'required',
                    response: { open: 'boolean' }
                },
                'POST /api/bookings': {
                    description: 'Create a new booking',
                    auth: 'required',
                    body: { room_id: 'number', bed_id: 'number (optional)', semester: 'string', arrival_date: 'date (optional)' },
                    response: { message: 'Booking request submitted' }
                },
                'GET /api/bookings/my': {
                    description: 'Get all my bookings',
                    auth: 'required',
                    response: '[array of booking objects]'
                },
                'GET /api/bookings/all': {
                    description: 'Get all bookings (admin only)',
                    auth: 'required (admin)',
                    response: '[array of booking objects]'
                },
                'PUT /api/bookings/:id/status': {
                    description: 'Approve or reject booking (admin only)',
                    auth: 'required (admin)',
                    body: { status: 'approved|rejected' },
                    response: { message: 'Booking approved/rejected' }
                },
                'PUT /api/bookings/:id/suspend': {
                    description: 'Suspend or unsuspend booking (admin only)',
                    auth: 'required (admin)',
                    body: { suspended: 'boolean', reason: 'string (optional)' },
                    response: { message: 'Booking suspended/unsuspended' }
                },
                'PUT /api/bookings/toggle': {
                    description: 'Open or close bookings (admin only)',
                    auth: 'required (admin)',
                    body: { open: 'boolean' },
                    response: { open: 'boolean', message: 'string' }
                },
                'DELETE /api/bookings/:id': {
                    description: 'Cancel a pending booking',
                    auth: 'required',
                    response: { message: 'Booking cancelled' }
                }
            },
            payments: {
                'POST /api/payments/stk-push': {
                    description: 'Initiate M-Pesa STK push payment',
                    auth: 'required',
                    body: { phone: 'string (254...)', booking_id: 'number' },
                    response: { CheckoutRequestID: 'string', message: 'string' }
                },
                'POST /api/payments/stk-query': {
                    description: 'Check STK push payment status',
                    auth: 'required',
                    body: { checkout_request_id: 'string' },
                    response: { status: 'string' }
                },
                'POST /api/payments': {
                    description: 'Submit manual payment record',
                    auth: 'required',
                    body: { booking_id: 'number', amount: 'number (min 12000)', payment_method: 'mpesa|cash', mpesa_code: 'string (optional)' },
                    response: { message: 'Payment submitted' }
                },
                'GET /api/payments/my': {
                    description: 'Get my payments',
                    auth: 'required',
                    response: '[array of payment objects]'
                },
                'GET /api/payments/all': {
                    description: 'Get all payments (admin only)',
                    auth: 'required (admin)',
                    response: '[array of payment objects]'
                },
                'PATCH /api/payments/:id/confirm': {
                    description: 'Confirm a payment (admin only)',
                    auth: 'required (admin)',
                    response: { message: 'Payment confirmed' }
                }
            },
            notices: {
                'GET /api/notices': {
                    description: 'Get all notices',
                    auth: 'required',
                    response: '[array of notice objects]'
                },
                'POST /api/notices': {
                    description: 'Create a notice (admin only)',
                    auth: 'required (admin)',
                    body: { title: 'string', message: 'string' },
                    response: { message: 'Notice created' }
                }
            },
            notifications: {
                'GET /api/notifications': {
                    description: 'Get my notifications',
                    auth: 'required',
                    response: '[array of notification objects]'
                },
                'PUT /api/notifications/read-all': {
                    description: 'Mark all notifications as read',
                    auth: 'required',
                    response: { message: 'All marked as read' }
                }
            },
            health: {
                'GET /api/health': {
                    description: 'Get my health profile',
                    auth: 'required',
                    response: 'health profile object'
                },
                'POST /api/health': {
                    description: 'Save/update health profile',
                    auth: 'required',
                    body: { medical_conditions: 'string', dietary_restrictions: 'string' },
                    response: { message: 'Health profile saved' }
                }
            }
        }
    };

    res.json(docs);
});

module.exports = router;
