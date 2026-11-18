const logger = require('./logger');

/**
 * Send an email through the Brevo HTTP API.
 * @param {{ to: string, subject: string, html?: string, text?: string }} opts
 */
const sendEmail = async ({ to, subject, html, text }) => {
    // Always ensure both htmlContent and textContent are non-empty strings
    const htmlContent = html
        ? String(html)
        : `<html><body>${String(text ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/\r\n|\r|\n/g, '<br>')}</body></html>`;

    const textContent = text
        ? String(text)
        : String(html ?? '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

    // Sender email: prefer BREVO_SENDER_EMAIL, fall back to EMAIL_FROM domain part
    const senderEmail = process.env.BREVO_SENDER_EMAIL
        || (process.env.EMAIL_FROM || '').match(/<(.+)>/)?.[1]
        || process.env.SMTP_EMAIL
        || 'zetechhostel@gmail.com';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    try {
        let response;
        let failureLogged = false;

        try {
            response = await fetch('https://api.brevo.com/v3/smtp/email', {
                method: 'POST',
                headers: {
                    'api-key': process.env.BREVO_API_KEY,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sender: {
                        name: 'Zetech Hostel',
                        email: senderEmail,
                    },
                    to: [{ email: to }],
                    subject,
                    htmlContent,
                    textContent,
                }),
                signal: controller.signal,
            });

            if (!response.ok) {
                const responseBody = await response.text();
                logger.error('[EMAIL] Brevo API error', {
                    status: response.status,
                    responseBody,
                });
                failureLogged = true;
                throw new Error(`Brevo API request failed with status ${response.status}`);
            }

            logger.info('[EMAIL] Sent via Brevo API');
        } catch (error) {
            if (failureLogged) throw error;

            const failure = controller.signal.aborted
                ? Object.assign(new Error('Brevo API request timed out'), { code: 'ETIMEDOUT' })
                : error;
            logger.error('[EMAIL] Brevo API error', {
                status: response ? response.status : null,
                responseBody: failure.message,
            });
            throw failure;
        }
    } finally {
        clearTimeout(timeout);
    }
};

module.exports = { sendEmail };
