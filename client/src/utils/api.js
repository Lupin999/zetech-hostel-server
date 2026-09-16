import axios from 'axios';

// Use VITE_API_URL env variable for all environments.
// For local dev: create client/.env with  VITE_API_URL=http://localhost:5000/api
// For production: set VITE_API_URL=https://your-backend.onrender.com/api in your build env
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api' });

// Automatically attach the JWT token to every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

export default api;
