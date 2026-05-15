const pool = require('../config/db');

const getAllRooms = () => {
    return pool.query(
        `SELECT r.*, 
         (SELECT COUNT(*) FROM bookings b WHERE b.room_id = r.id AND b.status = 'approved') AS occupied
         FROM rooms r ORDER BY r.hostel, r.room_number`
    );
};

const getRoomById = (id) => {
    return pool.query('SELECT * FROM rooms WHERE id = ?', [id]);
};

const getRoomBeds = (roomId) => {
    return pool.query('SELECT * FROM beds WHERE room_id = ? ORDER BY bed_number', [roomId]);
};

const createRoom = (room_number, hostel, campus, room_type, capacity, price) => {
    return pool.query(
        'INSERT INTO rooms (room_number, hostel, campus, room_type, capacity, price) VALUES (?, ?, ?, ?, ?, ?)',
        [room_number, hostel, campus, room_type || 'quad', capacity || 4, price]
    );
};

const updateRoom = (id, room_number, hostel, campus, room_type, capacity, price, status) => {
    return pool.query(
        'UPDATE rooms SET room_number=?, hostel=?, campus=?, room_type=?, capacity=?, price=?, status=? WHERE id=?',
        [room_number, hostel, campus, room_type, capacity, price, status, id]
    );
};

const deleteRoom = (id) => {
    return pool.query('DELETE FROM rooms WHERE id = ?', [id]);
};

const checkActiveBookings = (roomId) => {
    return pool.query(
        "SELECT COUNT(*) AS count FROM bookings WHERE room_id = ? AND status IN ('pending','approved')",
        [roomId]
    );
};

const getBedById = (bedId, roomId) => {
    return pool.query('SELECT * FROM beds WHERE id = ? AND room_id = ? AND status = ?', [bedId, roomId, 'available']);
};

const updateBedStatus = (bedId, status) => {
    return pool.query('UPDATE beds SET status = ? WHERE id = ?', [status, bedId]);
};

module.exports = { getAllRooms, getRoomById, getRoomBeds, createRoom, updateRoom, deleteRoom, checkActiveBookings, getBedById, updateBedStatus };
