import api from '../utils/api';

const noticeService = {
    getAllNotices: () => api.get('/notices'),
    createNotice: (title, message) => api.post('/notices', { title, message }),
    deleteNotice: (id) => api.delete(`/notices/${id}`),
};

export default noticeService;
