import api from '../utils/api';

const notificationService = {
    getNotifications: () => api.get('/notifications'),
    // Server route: PATCH /notifications/read
    markAllRead: () => api.patch('/notifications/read'),
    // Server route: POST /notifications/send  (body: { user_id, message })
    sendMessage: (userId, message, type) => api.post('/notifications/send', { user_id: userId, message, type }),
};

export default notificationService;
