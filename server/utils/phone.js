const normalizePhone = (value) => {
    if (typeof value !== 'string') return null;
    const compact = value.trim().replace(/[\s()-]/g, '');
    let digits;

    if (/^\+\d+$/.test(compact)) {
        digits = compact.slice(1);
    } else if (/^0\d+$/.test(compact)) {
        digits = `254${compact.slice(1)}`;
    } else if (/^\d+$/.test(compact)) {
        digits = compact;
    } else {
        return null;
    }

    if (!/^[1-9]\d{9,14}$/.test(digits)) return null;
    return `+${digits}`;
};

const normalizeMpesaPhone = (value) => {
    const normalized = normalizePhone(value);
    if (!normalized || !/^\+254[17]\d{8}$/.test(normalized)) return null;
    return normalized.slice(1);
};

module.exports = { normalizePhone, normalizeMpesaPhone };
