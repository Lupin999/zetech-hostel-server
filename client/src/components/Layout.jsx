import { useState, useEffect, useCallback } from 'react';
import {
    AppBar, Toolbar, Typography, Button, Box, Container, IconButton, Badge,
    Drawer, List, ListItem, ListItemButton, ListItemText, Divider,
    useMediaQuery, useTheme
} from '@mui/material';
import { Menu as MenuIcon, LightMode, DarkMode, Notifications } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useThemeMode } from '../context/ThemeContext';
import api from '../utils/api';
import logoImg from '../d.jpg';
import InstallPrompt from './InstallPrompt';
import NotificationDrawer from './notifications/NotificationDrawer';

const studentLinks = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'My Bookings', path: '/my-bookings' },
    { label: 'Menu', path: '/menu' },
    { label: 'Notices', path: '/notices' },
    { label: 'Profile', path: '/profile' },
];
const adminLinks = [
    { label: 'Admin Panel', path: '/admin' },
];

export default function Layout({ children }) {
    const { user, logout } = useAuth();
    const { mode, toggleTheme } = useThemeMode();
    const navigate = useNavigate();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [notifOpen, setNotifOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);

    const fetchNotifications = useCallback(() => {
        api.get('/notifications').then(r => setNotifications(r.data)).catch(() => {});
    }, []);

    useEffect(() => { fetchNotifications(); const t = setInterval(fetchNotifications, 30000); return () => clearInterval(t); }, [fetchNotifications]);

    const unreadCount = notifications.filter(n => !n.is_read).length;

    const markAllRead = async () => {
        await api.patch('/notifications/read').catch(() => {});
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    };

    const handleLogout = () => { logout(); navigate('/login'); };
    const links = ['admin', 'accounts', 'warden'].includes(user?.role) ? adminLinks : studentLinks;
    const navTo = (path) => { navigate(path); setDrawerOpen(false); };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <AppBar position="static" elevation={0} sx={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <Toolbar>
                    {isMobile && (
                        <IconButton color="inherit" edge="start" onClick={() => setDrawerOpen(true)} sx={{ mr: 1 }}>
                            <MenuIcon />
                        </IconButton>
                    )}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer' }} onClick={() => navigate(['admin', 'accounts', 'warden'].includes(user?.role) ? '/admin' : '/dashboard')}>
                        <img src={logoImg} alt="Zetech" style={{ height: 40, borderRadius: 6 }} />
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>Zetech Hostel</Typography>
                    </Box>
                    {!isMobile && (
                        <Box sx={{ ml: 3, display: 'flex', gap: 0.5 }}>
                            {links.map(l => (
                                <Button key={l.path} color="inherit" onClick={() => navigate(l.path)}
                                    sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}>
                                    {l.label}
                                </Button>
                            ))}
                        </Box>
                    )}
                    <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: { xs: 0.5, md: 1.5 } }}>
                        <IconButton color="inherit" size="small" onClick={() => { setNotifOpen(true); }}>
                            <Badge badgeContent={unreadCount} color="secondary">
                                <Notifications />
                            </Badge>
                        </IconButton>
                        <IconButton color="inherit" onClick={toggleTheme} size="small">
                            {mode === 'dark' ? <LightMode /> : <DarkMode />}
                        </IconButton>
                        {!isMobile && <Typography variant="body2">{user?.full_name}</Typography>}
                        <Button color="inherit" variant="outlined" size="small" onClick={handleLogout}>Logout</Button>
                    </Box>
                </Toolbar>
            </AppBar>

            {/* Nav Drawer */}
            <Drawer anchor="left" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
                <Box sx={{ width: 260, pt: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, pb: 1 }}>
                        <img src={logoImg} alt="Zetech" style={{ height: 32, borderRadius: 4 }} />
                        <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>Zetech Hostel</Typography>
                    </Box>
                    <Typography variant="body2" sx={{ px: 2, pb: 2, color: 'text.secondary' }}>{user?.full_name}</Typography>
                    <Divider />
                    <List>
                        {links.map(l => (
                            <ListItem key={l.path} disablePadding>
                                <ListItemButton onClick={() => navTo(l.path)}>
                                    <ListItemText primary={l.label} />
                                </ListItemButton>
                            </ListItem>
                        ))}
                        <Divider sx={{ my: 1 }} />
                        <ListItem disablePadding>
                            <ListItemButton onClick={handleLogout}>
                                <ListItemText primary="Logout" sx={{ color: 'error.main' }} />
                            </ListItemButton>
                        </ListItem>
                    </List>
                </Box>
            </Drawer>

            {/* Notifications Drawer */}
            <NotificationDrawer open={notifOpen} onClose={() => setNotifOpen(false)} notifications={notifications} unreadCount={unreadCount} onMarkAllRead={markAllRead} />

            <Container sx={{ mt: { xs: 2, md: 4 }, mb: { xs: 2, md: 4 }, px: { xs: 2, md: 3 }, flex: 1 }}>{children}</Container>

            <InstallPrompt />

            <Box component="footer" sx={{ py: 3, textAlign: 'center', bgcolor: mode === 'dark' ? 'rgba(17,24,39,0.9)' : '#1a237e', color: 'rgba(255,255,255,0.7)', mt: 'auto' }}>
                <Typography variant="body2">
                    © {new Date().getFullYear()} Zetech University Hostel Management System
                </Typography>
            </Box>
        </Box>
    );
}
