import api from '../utils/api';

const bookingService = {
    getActiveBooking: () => api.get('/bookings/active'),
    getBookingStatus: () => api.get('/bookings/status'),
    getMyBookings: () => api.get('/bookings/my'),
    getAllBookings: () => api.get('/bookings/all'),
    createBooking: (data) => api.post('/bookings', data),
    approveBooking: (id) => api.put(`/bookings/${id}/status`, { status: 'approved' }),
    rejectBooking: (id) => api.put(`/bookings/${id}/status`, { status: 'rejected' }),
    cancelBooking: (id) => api.delete(`/bookings/${id}`),
    toggleBookings: (open) => api.put('/bookings/toggle', { open }),
};

export default bookingService;
