const RoomModel = require('../models/roomModel');

const getRooms = async () => {
    const [rooms] = await RoomModel.getAllRooms();
    // Run ensureRoomBeds concurrently instead of sequentially to avoid N×DB-queries per request
    await Promise.all(rooms.map(room => RoomModel.ensureRoomBeds(room.id, room.capacity || 4)));
    return rooms;
};

const getRoom = async (id) => {
    const [rooms] = await RoomModel.getRoomById(id);
    if (!rooms[0]) return null;
    await RoomModel.ensureRoomBeds(rooms[0].id, rooms[0].capacity || 4);
    return rooms[0];
};

const getBeds = async (roomId) => {
    const [beds] = await RoomModel.getRoomBeds(roomId);
    return beds;
};

const addRoom = async ({ room_number, hostel, campus, room_type, capacity, price }) => {
    await RoomModel.createRoom(room_number, hostel, campus, room_type, capacity, price);
    return { message: 'Room added' };
};

const editRoom = async (id, { room_number, hostel, campus, room_type, capacity, price, status }) => {
    await RoomModel.updateRoom(id, room_number, hostel, campus, room_type, capacity, price, status);
    return { message: 'Room updated' };
};

const removeRoom = async (id) => {
    const [active] = await RoomModel.checkActiveBookings(id);
    if (active[0].count > 0) {
        return { error: 'Cannot delete room with active bookings', status: 400 };
    }
    await RoomModel.deleteRoom(id);
    return { message: 'Room deleted' };
};

module.exports = { getRooms, getRoom, getBeds, addRoom, editRoom, removeRoom };
