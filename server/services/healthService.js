const HealthModel = require('../models/healthModel');
const UserModel = require('../models/userModel');
const { sendNotification } = require('./notificationService');

const getHealthProfile = async (userId) => {
    const [rows] = await HealthModel.getHealthProfile(userId);
    return rows[0] || null;
};

const saveHealthProfile = async (userId, { medical_conditions, dietary_restrictions }) => {
    await HealthModel.upsertHealthProfile(userId, medical_conditions, dietary_restrictions);

    // Notify administrators
    const [user] = await UserModel.findNameById(userId);
    const name = user[0]?.full_name || 'A student';
    const reg = user[0]?.reg_no || '';

    const [admins] = await UserModel.findByRole('admin');
    for (const admin of admins) {
        await sendNotification(admin.id, `${name} (${reg}) has updated their health profile.`, 'health');
    }

    return { message: 'Health profile saved' };
};

module.exports = { getHealthProfile, saveHealthProfile };
