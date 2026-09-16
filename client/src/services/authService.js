import api from '../utils/api';

const authService = {
    login: (email, password) => api.post('/auth/login', { email, password }),
    register: (data) => api.post('/auth/register', data),
    sendOtp: (phone) => api.post('/auth/send-otp', { phone }),
    verifyOtp: (phone, code) => api.post('/auth/verify-otp', { phone, code }),
    verifyToken: () => api.get('/auth/verify'),
    updateProfile: (full_name, course) => api.put('/auth/profile/info', { full_name, course }),
    changePassword: (currentPassword, newPassword) => api.put('/auth/profile', { currentPassword, newPassword }),
    forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
    resetPassword: (email, code, newPassword) => api.post('/auth/reset-password', { email, code, newPassword }),
};

export default authService;
