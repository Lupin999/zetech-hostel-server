const BookingModel = require('../models/bookingModel');
const RoomModel = require('../models/roomModel');
const UserModel = require('../models/userModel');
const { sendNotification, sendToRole } = require('./notificationService');

const getActiveBooking = async (userId) => {
    const [bookings] = await BookingModel.getActiveBooking(userId);
    return bookings[0] || null;
};

const getMyBookings = async (userId) => {
    const [bookings] = await BookingModel.getStudentBookings(userId);
    return bookings;
};

const getAllBookings = async () => {
    const [bookings] = await BookingModel.getAllBookings();
    return bookings;
};

const getBookingStatus = async () => {
    const [rows] = await BookingModel.getBookingStatus();
    return { open: !rows.length || rows[0].message !== 'closed' };
};

const toggleBookings = async (open, userId) => {
    await BookingModel.setBookingStatus(open, userId);
    return { open, message: `Booking ${open ? 'opened' : 'closed'}` };
};

const createBooking = async (userId, { room_id, bed_id, semester, arrival_date }) => {
    // Check if booking is open
    const [statusRows] = await BookingModel.getBookingStatus();
    if (statusRows.length && statusRows[0].message === 'closed') {
        return { error: 'Booking is currently closed by admin.', status: 400 };
    }

    // Check existing booking
    const [existing] = await BookingModel.checkExistingBooking(userId);
    if (existing.length) return { error: 'You already have an active booking', status: 400 };

    // Check room
    const [room] = await RoomModel.getRoomById(room_id);
    if (!room.length) return { error: 'Room not found', status: 404 };
    if (room[0].status !== 'available') return { error: 'Room not available', status: 400 };

    // Check bed
    if (bed_id) {
        const [bed] = await RoomModel.getBedById(bed_id, room_id);
        if (!bed.length) return { error: 'Bed not available', status: 400 };
    }

    await BookingModel.createBooking(userId, room_id, bed_id, semester, arrival_date);

    if (bed_id) {
        await RoomModel.updateBedStatus(bed_id, 'occupied');
    }

    // Notifications
    const [student] = await UserModel.findNameById(userId);
    const [roomBeds] = bed_id ? await RoomModel.getRoomBeds(room_id) : [[]];
    const bedInfo = roomBeds.find(b => b.id === bed_id);
    const sName = student[0]?.full_name || 'A student';
    const sReg = student[0]?.reg_no || '';
    const rNum = room[0]?.room_number || '';
    const rHostel = room[0]?.hostel || '';
    const bedStr = bedInfo ? ` Bed ${bedInfo.bed_number} (${bedInfo.position})` : '';

    await sendToRole(['admin', 'warden'], `New booking request: ${sName} (${sReg}) wants Room ${rNum}${bedStr} at ${rHostel} Hostel. Please review.`, 'booking');
    await sendNotification(userId, `Your booking request for Room ${rNum}${bedStr} at ${rHostel} Hostel has been submitted and is pending admin approval.`, 'booking');

    return { message: 'Booking request submitted' };
};

const approveBooking = async (bookingId) => {
    const [booking] = await BookingModel.getBookingById(bookingId);
    if (!booking.length) return { error: 'Booking not found', status: 404 };

    const [room] = await RoomModel.getRoomById(booking[0].room_id);
    const [occupied] = await BookingModel.getApprovedCount(booking[0].room_id);
    if (occupied[0].count >= room[0].capacity) {
        return { error: 'Room is already full', status: 400 };
    }

    await BookingModel.updateBookingStatus(bookingId, 'approved');

    const b = booking[0];
    const arrDate = b.arrival_date ? new Date(b.arrival_date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'TBD';
    await sendNotification(b.user_id,
        `Congratulations! Your booking for Room ${b.room_number}${b.bed_number ? ` Bed ${b.bed_number}` : ''} has been approved. Your arrival date is ${arrDate}. Booking fee is KES 30,000 (minimum deposit KES 12,000). Please pay before arrival.`,
        'booking'
    );

    return { message: 'Booking approved' };
};

const rejectBooking = async (bookingId) => {
    const [booking] = await BookingModel.getBookingById(bookingId);
    if (!booking.length) return { error: 'Booking not found', status: 404 };

    await BookingModel.updateBookingStatus(bookingId, 'rejected');

    const b = booking[0];
    await sendNotification(b.user_id,
        `Sorry, your booking for Room ${b.room_number} has been rejected. Please contact the hostel office for more information.`,
        'booking'
    );
    if (b.bed_id) {
        await RoomModel.updateBedStatus(b.bed_id, 'available');
    }

    return { message: 'Booking rejected' };
};

const suspendBooking = async (bookingId, suspended, reason) => {
    const [booking] = await BookingModel.getApprovedBookingWithDetails(bookingId);
    if (!booking.length) return { error: 'Approved booking not found', status: 404 };

    await BookingModel.suspendBooking(bookingId, suspended, reason);

    const b = booking[0];
    if (suspended) {
        await sendNotification(b.user_id,
            `⚠️ Your booking for Room ${b.room_number} has been SUSPENDED by admin.${reason ? ` Reason: ${reason}` : ''} Contact the hostel office.`,
            'booking'
        );
    } else {
        await sendNotification(b.user_id,
            `✅ Your booking for Room ${b.room_number} has been reactivated. You can now access your portal normally.`,
            'booking'
        );
    }

    return { message: `Booking ${suspended ? 'suspended' : 'unsuspended'}` };
};

const cancelBooking = async (bookingId, userId) => {
    const [booking] = await BookingModel.getBookingByIdAndUser(bookingId, userId);
    if (!booking.length) return { error: 'Booking not found', status: 404 };
    if (booking[0].status !== 'pending') return { error: 'Only pending bookings can be cancelled', status: 400 };

    if (booking[0].bed_id) {
        await RoomModel.updateBedStatus(booking[0].bed_id, 'available');
    }
    await BookingModel.deleteBooking(bookingId);
    return { message: 'Booking cancelled' };
};

module.exports = { getActiveBooking, getMyBookings, getAllBookings, getBookingStatus, toggleBookings, createBooking, approveBooking, rejectBooking, suspendBooking, cancelBooking };
