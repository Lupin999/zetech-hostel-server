import { DateTime } from 'luxon';

export const formatDate = (d) => d ? DateTime.fromISO(d).toFormat('EEEE d MMMM yyyy') : '—';

export const formatDateShort = (d) => d ? DateTime.fromISO(d).toFormat('d MMM yyyy') : '—';

export const timeAgo = (d) => DateTime.fromISO(d).toRelative();

export const formatCurrency = (amount) => `KES ${Number(amount).toLocaleString()}`;

export const formatHostelName = (hostel) => {
    const normalized = String(hostel || '').trim().toLowerCase();
    if (normalized === 'boys' || normalized === 'male') return 'Male Hostel';
    if (normalized === 'girls' || normalized === 'female') return 'Female Hostel';
    return hostel || '—';
};

export const formatRoomNumber = (roomNumber) => {
    const value = String(roomNumber ?? '').trim();
    return value && value !== '0' && value.toLowerCase() !== 'null' ? value : '—';
};

export const isSuspended = (value) => value === true || value === 1 || value === '1';

export const formatPaymentMethod = (method) => {
    if (method === 'legacy_manual') return 'Legacy manual (historical)';
    if (method === 'mpesa') return 'M-Pesa';
    return method || '—';
};

export const getTodayName = () => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date().getDay()];
};

export const chipColor = (status) => {
    const map = { approved: 'success', rejected: 'error', pending: 'warning', confirmed: 'success' };
    return map[status] || 'default';
};

export const maskEmail = (email) => email ? email.replace(/(.{2})(.*)(@.*)/, '$1***$3') : '';

export const getMinDate = () => new Date().toISOString().split('T')[0];
