const HealthModel = require('../models/healthModel');
const UserModel = require('../models/userModel');
const { sendNotification } = require('./notificationService');

const getHealthProfile = async (userId) => {
    const [rows] = await HealthModel.getHealthProfile(userId);
    return rows[0] || null;
};

const saveHealthProfile = async (userId, { medical_conditions, dietary_restrictions }) => {
    await HealthModel.upsertHealthProfile(userId, medical_conditions, dietary_restrictions);

    // Notify wardens
    const [user] = await UserModel.findNameById(userId);
    const name = user[0]?.full_name || 'A student';
    const reg = user[0]?.reg_no || '';

    const [wardens] = await UserModel.findByRole('warden');
    for (const w of wardens) {
        await sendNotification(w.id, `${name} (${reg}) has updated their health profile.`, 'health');
    }

    return { message: 'Health profile saved' };
};

module.exports = { getHealthProfile, saveHealthProfile };
