const PaymentModel = require('../models/paymentModel');
const { stkPush, stkQuery } = require('../utils/mpesa');
const { sendNotification, sendToRole } = require('./notificationService');
const { normalizeMpesaPhone } = require('../utils/phone');

const DEPOSIT_AMOUNT = 12000;

const initiateStkPush = async (userId, phone, bookingId) => {
    const [booking] = await PaymentModel.getApprovedBookingForPayment(bookingId, userId);
    if (!booking.length) return { error: 'No approved booking found', status: 400 };

    const formatted = normalizeMpesaPhone(phone);
    if (!formatted) return { error: 'Enter a valid Kenyan M-Pesa number, such as 0712345678', status: 400 };

    const [existing] = await PaymentModel.getPaymentsByBookingId(bookingId);
    if (existing.find(p => p.status === 'confirmed')) return { error: 'Payment already confirmed', status: 400 };

    if (existing.length) {
        await PaymentModel.deletePendingByBookingId(bookingId);
    }

    const reference = `ZH${bookingId}`;

    let mpesaRes;
    try {
        mpesaRes = await stkPush(formatted, DEPOSIT_AMOUNT, reference);
    } catch (error) {
        const providerError = new Error('M-Pesa STK push request failed');
        providerError.cause = error;
        providerError.stage = 'mpesa-stk-push';
        providerError.response = error?.response;
        providerError.code = error?.code;
        throw providerError;
    }

    if (mpesaRes.ResponseCode === '0' && mpesaRes.CheckoutRequestID) {
        await PaymentModel.createPayment(bookingId, DEPOSIT_AMOUNT, 'mpesa', mpesaRes.CheckoutRequestID);
        return { message: 'STK push sent', amount: DEPOSIT_AMOUNT, checkoutRequestId: mpesaRes.CheckoutRequestID };
    }
    return { error: mpesaRes.ResponseDescription || 'STK push failed', status: 400 };
};

const queryStkStatus = async (checkoutRequestId, userId) => {
    // Check if already confirmed in DB
    const [payment] = await PaymentModel.findPaymentByCheckoutId(checkoutRequestId, userId);
    if (!payment.length) return { error: 'Payment request not found', status: 404 };
    if (payment.length && payment[0].status === 'confirmed') {
        return { status: 'confirmed', message: 'Payment already confirmed' };
    }

    // Query Safaricom
    const queryRes = await stkQuery(checkoutRequestId);

    if (queryRes.ResultCode === '0' || queryRes.ResultCode === 0) {
        await PaymentModel.confirmByCheckoutId(checkoutRequestId);

        if (payment.length) {
            const p = payment[0];
            const [info] = await PaymentModel.getBookingInfoForNotification(p.booking_id);
            if (info.length) {
                await sendNotification(p.user_id,
                    `Your M-Pesa payment of KES ${Number(p.amount).toLocaleString()} for Room ${info[0].room_number} has been confirmed. Welcome to Zetech Hostel!`,
                    'payment'
                );
                await sendToRole(['accounts', 'admin'],
                    `${info[0].full_name} (${info[0].reg_no}) M-Pesa payment of KES ${Number(p.amount).toLocaleString()} for Room ${info[0].room_number} confirmed.`,
                    'payment'
                );
            }
        }
        return { status: 'confirmed', message: 'Payment confirmed by Safaricom' };
    }

    if (queryRes.ResultCode === '1032' || queryRes.ResultCode === 1032 ||
        queryRes.ResultCode === '1037' || queryRes.ResultCode === 1037) {
        await PaymentModel.deletePendingByCheckoutId(checkoutRequestId);
        return { status: 'failed', message: queryRes.ResultDesc || 'Payment was cancelled or timed out' };
    }

    return { status: 'pending', message: queryRes.ResultDesc || 'Payment is being processed' };
};

const handleCallback = async (body) => {
    const resultCode = body?.stkCallback?.ResultCode;
    const checkoutId = body?.stkCallback?.CheckoutRequestID;

    if (resultCode === 0 && checkoutId) {
        const items = body.stkCallback.CallbackMetadata?.Item || [];
        const receipt = items.find(i => i.Name === 'MpesaReceiptNumber')?.Value || checkoutId;

        await PaymentModel.updateMpesaCode(receipt, checkoutId);

        const [payment] = await PaymentModel.findPaymentWithFullDetails(receipt);
        if (payment.length) {
            const p = payment[0];
            await sendNotification(p.user_id,
                `Your M-Pesa payment of KES ${Number(p.amount).toLocaleString()} for Room ${p.room_number} has been confirmed. Receipt: ${receipt}. Welcome to Zetech Hostel!`,
                'payment'
            );
            await sendToRole(['accounts', 'admin'],
                `${p.full_name} (${p.reg_no}) M-Pesa payment of KES ${Number(p.amount).toLocaleString()} for Room ${p.room_number} confirmed. Receipt: ${receipt}`,
                'payment'
            );
        }
    } else if (checkoutId) {
        await PaymentModel.deletePendingByCheckoutId(checkoutId);
    }
};

const getMyPayments = async (userId) => {
    const [payments] = await PaymentModel.getStudentPayments(userId);
    return payments;
};

const getAllPayments = async () => {
    const [payments] = await PaymentModel.getAllPayments();
    return payments;
};

module.exports = { initiateStkPush, queryStkStatus, handleCallback, getMyPayments, getAllPayments, DEPOSIT_AMOUNT };
