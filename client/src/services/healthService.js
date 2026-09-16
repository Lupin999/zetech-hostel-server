import api from '../utils/api';

const healthService = {
    getHealthProfile: () => api.get('/health'),
    saveHealthProfile: (data) => api.post('/health', data),
};

export default healthService;
