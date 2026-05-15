const pool = require('../config/db');

const getHealthProfile = (userId) => {
    return pool.query('SELECT * FROM health_profile WHERE user_id = ?', [userId]);
};

const upsertHealthProfile = (userId, medicalConditions, dietaryRestrictions) => {
    return pool.query(
        `INSERT INTO health_profile (user_id, medical_conditions, dietary_restrictions)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE medical_conditions = VALUES(medical_conditions), dietary_restrictions = VALUES(dietary_restrictions)`,
        [userId, medicalConditions || null, dietaryRestrictions || null]
    );
};

module.exports = { getHealthProfile, upsertHealthProfile };
