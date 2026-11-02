import api from '../utils/api';

const paymentService = {
    getMyPayments: () => api.get('/payments/my'),
    getAllPayments: () => api.get('/payments/all'),
    stkPush: (phone, booking_id) => api.post('/payments/stk-push', { phone, booking_id }),
    stkQuery: (checkout_request_id) => api.post('/payments/stk-query', { checkout_request_id }),
};

export default paymentService;
