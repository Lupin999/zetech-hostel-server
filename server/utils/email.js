/**
 * Email utility — priority order:
 *  1. Brevo (SMTP-relay, free 300/day, no domain verification needed)
 *     Set BREVO_API_KEY in Render environment variables.
 *  2. Resend (API, free 3000/month, needs domain verification for other recipients)
 *     Set RESEND_API_KEY in Render environment variables.
 *  3. Gmail SMTP fallback (local dev only)
 *     Set SMTP_EMAIL + SMTP_PASSWORD in server/.env
 */

const logger = require('./logger');

let _transporter = null;

const getTransporter = () => {
    if (_transporter) return _transporter;

    const nodemailer = require('nodemailer');

    if (process.env.BREVO_API_KEY) {
        // ── Brevo SMTP relay ─────────────────────────────────────────────────
        // Host: smtp-relay.brevo.com  Port: 587  User: your Brevo account email
        // Pass: your Brevo SMTP key (Settings → SMTP & API → SMTP)
        _transporter = nodemailer.createTransport({
            host: 'smtp-relay.brevo.com',
            port: 587,
            secure: false,
            auth: {
                user: process.env.BREVO_SMTP_USER,  // your Brevo login email
                pass: process.env.BREVO_API_KEY,     // Brevo SMTP key
            },
        });
    } else {
        // ── Gmail SMTP fallback (local dev) ──────────────────────────────────
        _transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.SMTP_EMAIL,
                pass: process.env.SMTP_PASSWORD,
            },
        });
    }

    return _transporter;
};

// ── Resend client (only used if RESEND_API_KEY set and BREVO_API_KEY not set) ─
let _resend = null;
const getResend = () => {
    if (!_resend) {
        const { Resend } = require('resend');
        _resend = new Resend(process.env.RESEND_API_KEY);
    }
    return _resend;
};

/**
 * Send an email.
 * @param {{ to: string, subject: string, html: string, text?: string }} opts
 */
const sendEmail = async ({ to, subject, html, text }) => {
    const from = process.env.EMAIL_FROM || `"Zetech Hostel" <zetechhostel@gmail.com>`;

    if (process.env.BREVO_API_KEY) {
        // ── Brevo path ───────────────────────────────────────────────────────
        await getTransporter().sendMail({ from, to, subject, html, text: text || '' });
        logger.info('[EMAIL] Sent via Brevo', { to });

    } else if (process.env.RESEND_API_KEY) {
        // ── Resend path ──────────────────────────────────────────────────────
        const { data, error } = await getResend().emails.send({
            from, to, subject, html, text: text || '',
        });
        if (error) {
            logger.error('[EMAIL] Resend error', { message: error.message, name: error.name });
            throw Object.assign(new Error(error.message), { code: 'RESEND_ERROR' });
        }
        logger.info('[EMAIL] Sent via Resend', { id: data?.id, to });

    } else {
        // ── Gmail SMTP fallback ──────────────────────────────────────────────
        await getTransporter().sendMail({ from, to, subject, html, text: text || '' });
        logger.info('[EMAIL] Sent via Gmail SMTP', { to });
    }
};

module.exports = { sendEmail };
