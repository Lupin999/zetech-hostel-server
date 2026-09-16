import api from '../utils/api';

const paymentService = {
    getMyPayments: () => api.get('/payments/my'),
    getAllPayments: () => api.get('/payments/all'),
    submitPayment: (data) => api.post('/payments', data),
    stkPush: (phone, booking_id) => api.post('/payments/stk-push', { phone, booking_id }),
    stkQuery: (checkout_request_id) => api.post('/payments/stk-query', { checkout_request_id }),
    confirmPayment: (id) => api.patch(`/payments/${id}/confirm`),
};

export default paymentService;
