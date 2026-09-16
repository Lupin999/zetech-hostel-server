export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
export const ASSETS_URL = import.meta.env.VITE_ASSETS_URL || 'http://localhost:5000/assets';

export const BOOKING_FEE = 30000;
export const MIN_DEPOSIT = 12000;

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const COUNTRY_CODES = [
    { code: '+254', label: '🇰🇪 +254' },
    { code: '+256', label: '🇺🇬 +256' },
    { code: '+255', label: '🇹🇿 +255' },
    { code: '+251', label: '🇪🇹 +251' },
    { code: '+250', label: '🇷🇼 +250' },
    { code: '+257', label: '🇧🇮 +257' },
    { code: '+252', label: '🇸🇴 +252' },
    { code: '+211', label: '🇸🇸 +211' },
    { code: '+243', label: '🇨🇩 +243' },
    { code: '+234', label: '🇳🇬 +234' },
    { code: '+233', label: '🇬🇭 +233' },
    { code: '+27', label: '🇿🇦 +27' },
    { code: '+44', label: '🇬🇧 +44' },
    { code: '+1', label: '🇺🇸 +1' },
    { code: '+91', label: '🇮🇳 +91' },
    { code: '+86', label: '🇨🇳 +86' },
    { code: '+971', label: '🇦🇪 +971' },
];

export const MENU_DATA = {
    Monday: { breakfast: { food: 'Bread & Tea', img: `${ASSETS_URL}/bread.jpg` }, supper: { food: 'Monday Special', img: `${ASSETS_URL}/monday.jpg` } },
    Tuesday: { breakfast: { food: 'Bread & Tea', img: `${ASSETS_URL}/bread.jpg` }, supper: { food: 'Cabbage & Ugali', img: `${ASSETS_URL}/cabba.jpg` } },
    Wednesday: { breakfast: { food: 'Bread & Tea', img: `${ASSETS_URL}/bread.jpg` }, supper: { food: 'Rice & Stew', img: `${ASSETS_URL}/rice.jpg` } },
    Thursday: { breakfast: { food: 'Bread & Tea', img: `${ASSETS_URL}/bread.jpg` }, supper: { food: 'Ugali & Sukuma', img: `${ASSETS_URL}/ugali.jpg` } },
    Friday: { breakfast: { food: 'Bread & Tea', img: `${ASSETS_URL}/bread.jpg` }, supper: { food: 'Rice & Beans', img: `${ASSETS_URL}/rice.jpg` } },
    Saturday: { breakfast: { food: 'Bread & Tea', img: `${ASSETS_URL}/bread.jpg` }, supper: { food: 'Chapati & Stew', img: `${ASSETS_URL}/chap.jpg` } },
    Sunday: { breakfast: { food: 'Bread & Tea', img: `${ASSETS_URL}/bread.jpg` }, supper: { food: 'Pilau', img: `${ASSETS_URL}/rice.jpg` } },
};

export const BOOKING_STATUSES = {
    pending: { color: 'warning', label: 'Pending' },
    approved: { color: 'success', label: 'Approved' },
    rejected: { color: 'error', label: 'Rejected' },
    cancelled: { color: 'default', label: 'Cancelled' },
};

export const PAYMENT_STATUSES = {
    pending: { color: 'warning', label: 'Pending' },
    confirmed: { color: 'success', label: 'Paid' },
};
