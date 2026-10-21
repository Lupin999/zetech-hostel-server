/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService';

const AuthContext = createContext();

export function AuthProvider({ children, onLoginSuccess }) {
    const [user, setUser] = useState(() => {
        try {
            const storedUser = localStorage.getItem('user');
            return storedUser ? JSON.parse(storedUser) : null;
        } catch {
            localStorage.removeItem('user');
            return null;
        }
    });
    const [loading, setLoading] = useState(true);

    const persistUser = (nextUser) => {
        setUser(nextUser);
        if (nextUser) {
            localStorage.setItem('user', JSON.stringify(nextUser));
        } else {
            localStorage.removeItem('user');
        }
    };

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            persistUser(null);
            setLoading(false);
            return;
        }

        authService.verifyToken()
            .then(res => {
                persistUser(res.data.user);
            })
            .catch(() => {
                localStorage.removeItem('token');
                persistUser(null);
            })
            .finally(() => setLoading(false));
    }, []);

    const login = async (email, password, { adminOnly = false } = {}) => {
        const res = await authService.login(email, password);
        const nextUser = res.data.user;
        if (adminOnly && !['admin', 'accounts', 'warden'].includes(nextUser?.role)) {
            throw new Error('This account does not have admin access.');
        }
        localStorage.setItem('token', res.data.token);
        persistUser(nextUser);
        onLoginSuccess?.();
        return nextUser;
    };

    const sendOtp = async (phone) => {
        const res = await authService.sendOtp(phone);
        return res.data;
    };

    const verifyOtp = async (phone, code) => {
        const res = await authService.verifyOtp(phone, code);
        localStorage.setItem('token', res.data.token);
        persistUser(res.data.user);
        onLoginSuccess?.();
        return res.data.user;
    };

    const register = async (data) => {
        const res = await authService.register(data);
        localStorage.setItem('token', res.data.token);
        persistUser(res.data.user);
        onLoginSuccess?.();
        return res.data.user;
    };

    const updateUser = (updatedUser) => persistUser(updatedUser);

    const logout = () => {
        localStorage.removeItem('token');
        persistUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, sendOtp, verifyOtp, register, logout, updateUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
