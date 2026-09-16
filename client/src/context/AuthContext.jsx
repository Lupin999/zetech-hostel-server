import { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService';

const AuthContext = createContext();

export function AuthProvider({ children, onLoginSuccess }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            authService.verifyToken()
                .then(res => setUser(res.data.user))
                .catch(() => localStorage.removeItem('token'))
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    const login = async (email, password) => {
        const res = await authService.login(email, password);
        localStorage.setItem('token', res.data.token);
        setUser(res.data.user);
        onLoginSuccess?.();
    };

    const sendOtp = async (phone) => {
        const res = await authService.sendOtp(phone);
        return res.data;
    };

    const verifyOtp = async (phone, code) => {
        const res = await authService.verifyOtp(phone, code);
        localStorage.setItem('token', res.data.token);
        setUser(res.data.user);
        onLoginSuccess?.();
    };

    const register = async (data) => {
        await authService.register(data);
    };

    const updateUser = (updatedUser) => setUser(updatedUser);

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, sendOtp, verifyOtp, register, logout, updateUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
