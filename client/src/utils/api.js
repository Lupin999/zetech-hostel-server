import axios from 'axios';

// Use VITE_API_URL env variable for all environments.
// For local dev: create client/.env with  VITE_API_URL=http://localhost:5000/api
// For production: set VITE_API_URL=https://your-backend.onrender.com/api in your build env
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api' });

// Attach JWT token to every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// Global response interceptor — handle expired/invalid tokens once, centrally.
// When the server returns 401 the token is gone or expired: clear storage and
// redirect to login so the user isn't left seeing raw "Access token required" errors.
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Don't redirect when the user is already on an auth page
            const publicPaths = ['/login', '/register', '/forgot-password'];
            const isAuthPage = publicPaths.some(p => window.location.pathname.startsWith(p));
            if (!isAuthPage) {
                localStorage.removeItem('token');
                // Use replace so the browser back button doesn't loop back to the
                // protected page and immediately trigger another 401
                window.location.replace('/login');
            }
        }
        return Promise.reject(error);
    }
);

export default api;
