const logger = require('./logger');

/**
 * Send an email through the Brevo HTTP API.
 * @param {{ to: string, subject: string, html: string, text?: string }} opts
 */
const sendEmail = async ({ to, subject, html, text }) => {
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
                        email: process.env.BREVO_SENDER_EMAIL,
                    },
                    to: [{ email: to }],
                    subject,
                    htmlContent: html,
                    textContent: text || '',
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
