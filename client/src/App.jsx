import { useState, useCallback } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CircularProgress, Box, Typography } from '@mui/material';
import { Apartment } from '@mui/icons-material';
import Layout from './components/Layout';
import PageTransition from './components/PageTransition';
import SplashScreen from './components/SplashScreen';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';

import MyBookings from './pages/MyBookings';
import Notices from './pages/Notices';
import Menu from './pages/Menu';
import AdminDashboard from './pages/AdminDashboard';
import CreateAdmin from './pages/CreateAdmin';
import ForgotPassword from './pages/ForgotPassword';

function Loading() {
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bgcolor: 'background.default' }}>
            <Apartment sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
            <Typography variant="h5" fontWeight={700} color="primary.main" gutterBottom>Zetech Hostel</Typography>
            <CircularProgress size={32} />
        </Box>
    );
}

function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();
    if (loading) return <Loading />;
    return user ? <Layout><PageTransition>{children}</PageTransition></Layout> : <Navigate to="/login" />;
}

function AdminRoute({ children }) {
    const { user, loading } = useAuth();
    if (loading) return <Loading />;
    if (!user) return <Navigate to="/login" />;
    return ['admin', 'accounts', 'warden'].includes(user.role) ? <Layout><PageTransition>{children}</PageTransition></Layout> : <Navigate to="/dashboard" />;
}

function AppRoutes({ showSplash, onSplashDone }) {
    const { user, loading } = useAuth();
    const location = useLocation();
    if (loading) return <Loading />;

    return (
        <>
            {showSplash && <SplashScreen onComplete={onSplashDone} />}
            <AnimatePresence mode="wait">
                <Routes location={location} key={location.pathname}>
                    <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <PageTransition><Login /></PageTransition>} />
                    <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <PageTransition><Register /></PageTransition>} />
                    <Route path="/create-admin" element={user ? <Navigate to="/dashboard" /> : <PageTransition><CreateAdmin /></PageTransition>} />
                    <Route path="/forgot-password" element={user ? <Navigate to="/dashboard" /> : <PageTransition><ForgotPassword /></PageTransition>} />
                    <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                    <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

                    <Route path="/my-bookings" element={<ProtectedRoute><MyBookings /></ProtectedRoute>} />
                    <Route path="/notices" element={<ProtectedRoute><Notices /></ProtectedRoute>} />
                    <Route path="/menu" element={<ProtectedRoute><Menu /></ProtectedRoute>} />
                    <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
                    <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
                </Routes>
            </AnimatePresence>
        </>
    );
}

export default function App() {
    const [showSplash, setShowSplash] = useState(false);
    const onSplashDone = useCallback(() => setShowSplash(false), []);

    return (
        <HashRouter>
            <AuthProvider onLoginSuccess={() => setShowSplash(true)}>
                <Toaster position="top-right" />
                <AppRoutes showSplash={showSplash} onSplashDone={onSplashDone} />
            </AuthProvider>
        </HashRouter>
    );
}
