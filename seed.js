require('dotenv').config();
const pool = require('./config/db');

(async () => {

    try {
        console.log('Seeding rooms 1-12 with 4 beds each...\n');

        for (let i = 1; i <= 12; i++) {
            const roomNum = String(i);
            const hostel = i <= 6 ? 'Boys' : 'Girls';
            const [existing] = await pool.query('SELECT id FROM rooms WHERE room_number = ? AND hostel = ?', [roomNum, hostel]);

            let roomId;
            if (existing.length) {
                roomId = existing[0].id;
                console.log(`Room ${roomNum} (${hostel}) already exists, skipping...`);
            } else {
                const [result] = await pool.query(
                    'INSERT INTO rooms (room_number, hostel, campus, room_type, capacity, price) VALUES (?, ?, ?, ?, ?, ?)',
                    [roomNum, hostel, 'Main Campus', 'quad', 4, 30000]
                );
                roomId = result.insertId;
                console.log(`Created Room ${roomNum} (${hostel})`);
            }

            // 4 beds: B1 lower, B2 lower, B3 upper, B4 upper
            const bedConfig = [
                { num: 'B1', pos: 'lower' },
                { num: 'B2', pos: 'lower' },
                { num: 'B3', pos: 'upper' },
                { num: 'B4', pos: 'upper' },
            ];
            for (const bed of bedConfig) {
                const [bedExists] = await pool.query('SELECT id FROM beds WHERE room_id = ? AND bed_number = ?', [roomId, bed.num]);
                if (!bedExists.length) {
                    await pool.query(
                        'INSERT INTO beds (room_id, bed_number, position, status) VALUES (?, ?, ?, ?)',
                        [roomId, bed.num, bed.pos, 'available']
                    );
                }
            }
            console.log(`  -> 4 beds (B1-B2 lower, B3-B4 upper)`);
        }

        // Add booking deadline notice
        const [admins] = await pool.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
        if (admins.length) {
            const [noticeExists] = await pool.query("SELECT id FROM notices WHERE title LIKE '%Booking Deadline%'");
            if (!noticeExists.length) {
                await pool.query(
                    'INSERT INTO notices (title, message, created_by) VALUES (?, ?, ?)',
                    ['Booking Deadline - April 10, 2026', 'All hostel bookings must be completed by April 10, 2026. Booking fee is KES 30,000 (minimum deposit KES 12,000). Late bookings will not be accepted. Please book early to secure your preferred room and bed.', admins[0].id]
                );
                console.log('\nBooking deadline notice created.');
            }
        }

        console.log('\nDone! 12 rooms (1-12) and 48 beds seeded.');
        console.log('Rooms 1-6: Boys Hostel');
        console.log('Rooms 7-12: Girls Hostel');
        console.log('Each room: 4 beds (B1-B2 lower, B3-B4 upper)');
        console.log('Price: KES 30,000 per room');
        console.log('Booking deadline: April 10, 2026');
        process.exit(0);
    } catch (error) {
        console.error('Seed error:', error.message);
        process.exit(1);
    }
})();
