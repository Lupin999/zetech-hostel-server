const NotificationModel = require('../models/notificationModel');
const UserModel = require('../models/userModel');

const sendNotification = async (userId, message, type = 'general') => {
    await NotificationModel.createNotification(userId, message, type);
};

const sendToRole = async (roles, message, type = 'general') => {
    const [users] = await UserModel.findByRole(...roles);
    for (const u of users) {
        await NotificationModel.createNotification(u.id, message, type);
    }
};

const getNotifications = async (userId) => {
    const [notifications] = await NotificationModel.getUserNotifications(userId);
    return notifications;
};

const markAllRead = async (userId) => {
    await NotificationModel.markAllRead(userId);
};

const sendMessage = async (userId, message) => {
    await NotificationModel.createNotification(userId, message, 'message');
};

module.exports = { sendNotification, sendToRole, getNotifications, markAllRead, sendMessage };
