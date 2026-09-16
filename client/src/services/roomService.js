import api from '../utils/api';

const roomService = {
    getAllRooms: () => api.get('/rooms'),
    getRoomById: (id) => api.get(`/rooms/${id}`),
    getRoomBeds: (roomId) => api.get(`/rooms/${roomId}/beds`),
};

export default roomService;
