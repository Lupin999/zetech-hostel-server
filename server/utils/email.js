/**
 * Email utility — sends via Resend (API key, never expires).
 * Falls back to nodemailer + Gmail SMTP if RESEND_API_KEY is not set,
 * so local dev still works without a Resend account.
 *
 * Production: set RESEND_API_KEY in Render environment variables.
 * Local dev:  set SMTP_EMAIL + SMTP_PASSWORD in server/.env as before.
 */

const logger = require('./logger');

// ── Resend sender ────────────────────────────────────────────────────────────
let _resend = null;
const getResend = () => {
    if (!_resend) {
        const { Resend } = require('resend');
        _resend = new Resend(process.env.RESEND_API_KEY);
    }
    return _resend;
};

// ── Nodemailer sender (fallback) ─────────────────────────────────────────────
let _transporter = null;
const getTransporter = () => {
    if (!_transporter) {
        const nodemailer = require('nodemailer');
        _transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: process.env.SMTP_EMAIL, pass: process.env.SMTP_PASSWORD },
        });
    }
    return _transporter;
};

/**
 * Send an email.
 * @param {{ to: string, subject: string, html: string, text?: string }} opts
 * @returns {Promise<void>} — throws on failure
 */
const sendEmail = async ({ to, subject, html, text }) => {
    const from = process.env.EMAIL_FROM || `"Zetech Hostel" <noreply@zetechhostel.co.ke>`;

    if (process.env.RESEND_API_KEY) {
        // ── Resend path ─────────────────────────────────────────────────────
        const { data, error } = await getResend().emails.send({
            from,
            to,
            subject,
            html,
            text: text || '',
        });

        if (error) {
            logger.error('[EMAIL] Resend error', { message: error.message, name: error.name });
            throw Object.assign(new Error(error.message), { code: 'RESEND_ERROR' });
        }

        logger.info('[EMAIL] Sent via Resend', { id: data?.id, to });
    } else {
        // ── Nodemailer fallback (local dev / legacy) ─────────────────────────
        await getTransporter().sendMail({ from, to, subject, html, text });
        logger.info('[EMAIL] Sent via SMTP', { to });
    }
};

module.exports = { sendEmail };
