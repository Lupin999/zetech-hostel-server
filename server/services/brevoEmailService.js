const axios = require('axios');

const escapeHtml = (value) => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const sendOtpEmail = async ({ email, fullName, code }) => {
    const apiKey = process.env.BREVO_API_KEY;
    const senderEmail = process.env.BREVO_SENDER_EMAIL;
    if (!apiKey) throw new Error('BREVO_API_KEY is not configured');
    if (!senderEmail) throw new Error('BREVO_SENDER_EMAIL is not configured');

    return axios.post('https://api.brevo.com/v3/smtp/email', {
        sender: {
            name: process.env.BREVO_SENDER_NAME || 'Zetech Hostel',
            email: senderEmail,
        },
        to: [{ email, name: fullName }],
        subject: 'Your Zetech Hostel Login Code',
        htmlContent: `
            <div style="font-family:Arial,sans-serif;max-width:400px;margin:0 auto;padding:20px;border:1px solid #e0e0e0;border-radius:8px">
                <h2 style="color:#1a237e;text-align:center">Zetech Hostel</h2>
                <p>Hi <b>${escapeHtml(fullName)}</b>,</p>
                <p>Your login verification code is:</p>
                <div style="text-align:center;margin:20px 0">
                    <span style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#1a237e">${escapeHtml(code)}</span>
                </div>
                <p style="color:#666;font-size:13px">This code expires in 5 minutes. Do not share it with anyone.</p>
            </div>
        `,
        textContent: `Hi ${fullName}, your Zetech Hostel login code is ${code}. It expires in 5 minutes. Do not share it with anyone.`,
        tags: ['login-otp'],
    }, {
        headers: {
            'api-key': apiKey,
            'Content-Type': 'application/json',
            accept: 'application/json',
        },
        timeout: 10000,
    });
};

module.exports = { sendOtpEmail };
