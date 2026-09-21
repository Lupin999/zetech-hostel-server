const PaymentModel = require('../models/paymentModel');
const UserModel = require('../models/userModel');
const { stkPush, stkQuery } = require('../utils/mpesa');
const { sendNotification, sendToRole } = require('./notificationService');

const initiateStkPush = async (userId, phone, bookingId) => {
    const [booking] = await PaymentModel.getApprovedBookingForPayment(bookingId, userId);
    if (!booking.length) return { error: 'No approved booking found', status: 400 };

    const [existing] = await PaymentModel.getPaymentsByBookingId(bookingId);
    if (existing.find(p => p.status === 'confirmed')) return { error: 'Payment already confirmed', status: 400 };

    if (existing.length) {
        await PaymentModel.deletePendingByBookingId(bookingId);
    }

    // Format phone
    let formatted = phone.replace(/\s/g, '');
    if (formatted.startsWith('0')) formatted = '254' + formatted.slice(1);
    if (formatted.startsWith('+')) formatted = formatted.slice(1);

    const amount = Number(booking[0].price) || 30000;
    const reference = `ZH-${booking[0].room_number}-${bookingId}`;

    const mpesaRes = await stkPush(formatted, amount, reference);

    if (mpesaRes.ResponseCode === '0') {
        await PaymentModel.createPayment(bookingId, amount, 'mpesa', mpesaRes.CheckoutRequestID);
        return { message: 'STK push sent', checkoutRequestId: mpesaRes.CheckoutRequestID };
    }
    return { error: mpesaRes.ResponseDescription || 'STK push failed', status: 400 };
};

const queryStkStatus = async (checkoutRequestId) => {
    // Check if already confirmed in DB
    const [payment] = await PaymentModel.findPaymentByCheckoutId(checkoutRequestId);
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

const submitPayment = async (userId, { booking_id, amount, payment_method, mpesa_code }) => {
    const [booking] = await PaymentModel.getApprovedBookingForPayment(booking_id, userId);
    if (!booking.length) return { error: 'No approved booking found', status: 400 };

    const [existing] = await PaymentModel.getPaymentsByBookingId(booking_id);
    if (existing.find(p => p.status === 'confirmed')) return { error: 'Payment already confirmed for this booking', status: 400 };

    if (existing.length) {
        await PaymentModel.deletePendingByBookingId(booking_id);
    }

    if (payment_method === 'mpesa' && !mpesa_code?.trim()) {
        return { error: 'M-Pesa code is required for M-Pesa payments', status: 400 };
    }

    await PaymentModel.createPayment(booking_id, amount, payment_method, mpesa_code);

    // Notifications
    const [student] = await UserModel.findNameById(userId);
    const [room] = await PaymentModel.getRoomNumberByBookingId(booking_id);
    const sName = student[0]?.full_name || 'A student';
    const sReg = student[0]?.reg_no || '';
    const rNum = room[0]?.room_number || '';

    await sendToRole(['accounts', 'admin'], `${sName} (${sReg}) has submitted ${payment_method} payment of KES ${Number(amount).toLocaleString()} for Room ${rNum}. Awaiting confirmation.`, 'payment');
    await sendNotification(userId, `Your ${payment_method} payment of KES ${Number(amount).toLocaleString()} for Room ${rNum} has been submitted and is awaiting admin confirmation.`, 'payment');

    return { message: 'Payment submitted' };
};

const confirmPayment = async (paymentId) => {
    await PaymentModel.updatePaymentStatus(paymentId, 'confirmed');

    const [payment] = await PaymentModel.findPaymentWithDetails(paymentId);
    if (payment.length) {
        await sendNotification(payment[0].user_id,
            `Your payment of KES ${Number(payment[0].amount).toLocaleString()} for Room ${payment[0].room_number} has been confirmed. Welcome to Zetech Hostel!`,
            'payment'
        );
    }
    return { message: 'Payment confirmed' };
};

const getMyPayments = async (userId) => {
    const [payments] = await PaymentModel.getStudentPayments(userId);
    return payments;
};

const getAllPayments = async () => {
    const [payments] = await PaymentModel.getAllPayments();
    return payments;
};

module.exports = { initiateStkPush, queryStkStatus, handleCallback, submitPayment, confirmPayment, getMyPayments, getAllPayments };
