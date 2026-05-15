const NoticeModel = require('../models/noticeModel');
const BookingModel = require('../models/bookingModel');
const UserModel = require('../models/userModel');

const getNotices = async (userId) => {
    const [user] = await UserModel.findById(userId);
    const isAdmin = ['admin', 'accounts', 'warden'].includes(user[0]?.role);

    if (isAdmin) {
        const [notices] = await NoticeModel.getAllNotices();
        return notices;
    }

    // For students: find their hostel from active booking
    const [booking] = await BookingModel.getStudentHostel(userId);
    const hostel = booking[0]?.hostel?.toLowerCase();

    const [notices] = await NoticeModel.getNoticesByTarget(hostel);
    return notices;
};

const createNotice = async (title, message, target, userId) => {
    const t = ['all', 'boys', 'girls'].includes(target) ? target : 'all';
    await NoticeModel.createNotice(title, message, t, userId);
    return { message: 'Notice posted' };
};

const deleteNotice = async (id) => {
    await NoticeModel.deleteNotice(id);
    return { message: 'Notice deleted' };
};

module.exports = { getNotices, createNotice, deleteNotice };
