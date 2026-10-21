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

const ensureRoomBeds = async (roomId, capacity = 4) => {
    const totalBeds = Number(capacity) || 4;
    const [existingBeds] = await pool.query('SELECT bed_number, position FROM beds WHERE room_id = ? ORDER BY bed_number', [roomId]);
    const existingMap = new Map(existingBeds.map((bed) => [bed.bed_number, bed.position]));
    const neededBeds = [];

    for (let i = 1; i <= totalBeds; i++) {
        const bedNumber = `B${i}`;
        if (!existingMap.has(bedNumber)) {
            const position = i <= Math.ceil(totalBeds / 2) ? 'lower' : 'upper';
            neededBeds.push([roomId, bedNumber, position, 'available']);
        }
    }

    if (neededBeds.length) {
        await Promise.all(
            neededBeds.map(([room_id, bed_number, position, status]) =>
                pool.query('INSERT INTO beds (room_id, bed_number, position, status) VALUES (?, ?, ?, ?)', [room_id, bed_number, position, status])
            )
        );
    }

    return true;
};

const getRoomBeds = async (roomId) => {
    await ensureRoomBeds(roomId);
    return pool.query('SELECT * FROM beds WHERE room_id = ? ORDER BY bed_number', [roomId]);
};

const createRoom = async (room_number, hostel, campus, room_type, capacity, price) => {
    const [result] = await pool.query(
        'INSERT INTO rooms (room_number, hostel, campus, room_type, capacity, price) VALUES (?, ?, ?, ?, ?, ?)',
        [room_number, hostel, campus, room_type || 'quad', capacity || 4, price]
    );

    await ensureRoomBeds(result.insertId, capacity || 4);
    return result;
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

module.exports = { getAllRooms, getRoomById, getRoomBeds, ensureRoomBeds, createRoom, updateRoom, deleteRoom, checkActiveBookings, getBedById, updateBedStatus };
