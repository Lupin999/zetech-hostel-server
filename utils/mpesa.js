const axios = require('axios');

const BASE_URL = 'https://sandbox.safaricom.co.ke';

async function getAccessToken() {
    const auth = Buffer.from(`${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`).toString('base64');
    const res = await axios.get(`${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
        headers: { Authorization: `Basic ${auth}` },
    });
    return res.data.access_token;
}

function getTimestamp() {
    // Daraja expects YYYYMMDDHHmmss in EAT (UTC+3)
    const now = new Date();
    const eat = new Date(now.getTime() + 3 * 60 * 60 * 1000);
    const y = eat.getUTCFullYear();
    const m = String(eat.getUTCMonth() + 1).padStart(2, '0');
    const d = String(eat.getUTCDate()).padStart(2, '0');
    const h = String(eat.getUTCHours()).padStart(2, '0');
    const mi = String(eat.getUTCMinutes()).padStart(2, '0');
    const s = String(eat.getUTCSeconds()).padStart(2, '0');
    return `${y}${m}${d}${h}${mi}${s}`;
}

async function stkPush(phone, amount, reference) {
    const token = await getAccessToken();
    const timestamp = getTimestamp();
    const shortcode = process.env.MPESA_SHORTCODE;
    const passkey = process.env.MPESA_PASSKEY;
    const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');

    const res = await axios.post(`${BASE_URL}/mpesa/stkpush/v1/processrequest`, {
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: amount,
        PartyA: phone,
        PartyB: shortcode,
        PhoneNumber: phone,
        CallBackURL: process.env.MPESA_CALLBACK_URL,
        AccountReference: reference,
        TransactionDesc: `Hostel Payment - ${reference}`,
    }, {
        headers: { Authorization: `Bearer ${token}` },
    });

    return res.data;
}

async function stkQuery(checkoutRequestId) {
    const token = await getAccessToken();
    const timestamp = getTimestamp();
    const shortcode = process.env.MPESA_SHORTCODE;
    const passkey = process.env.MPESA_PASSKEY;
    const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');

    const res = await axios.post(`${BASE_URL}/mpesa/stkpushquery/v1/query`, {
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId,
    }, {
        headers: { Authorization: `Bearer ${token}` },
    });

    return res.data;
}

module.exports = { getAccessToken, stkPush, stkQuery };
