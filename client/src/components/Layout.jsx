import { useState, useEffect, useCallback, useRef } from 'react';
import {
    AppBar, Toolbar, Typography, Button, Box, Container, IconButton, Badge,
    Drawer, List, ListItem, ListItemButton, ListItemText, Divider,
    useMediaQuery, useTheme, Snackbar, Paper
} from '@mui/material';
import { Menu as MenuIcon, LightMode, DarkMode, Notifications, BookOnline } from '@mui/icons-material';
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
    { label: 'Requests', path: '/services' },
    { label: 'Notices', path: '/notices' },
    { label: 'How it works', path: '/help' },
    { label: 'Profile', path: '/profile' },
];
const adminLinks = [
    { label: 'Admin Panel', path: '/admin' },
    { label: 'How it works', path: '/help' },
    { label: 'Profile', path: '/profile' },
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
    // Track popup toasts for new booking notifications (admin only)
    const [bookingPopup, setBookingPopup] = useState(null); // { message, id }
    const seenIdsRef = useRef(null); // null = first load, don't pop on initial fetch

    const fetchNotifications = useCallback(() => {
        api.get('/notifications').then(r => {
            const data = r.data;
            setNotifications(data);

            // Admin only — show a popup for new unread booking notifications
            if (user?.role === 'admin' || user?.role === 'warden') {
                const newBookings = data.filter(n =>
                    !n.is_read &&
                    n.type === 'booking' &&
                    (seenIdsRef.current === null || !seenIdsRef.current.has(n.id))
                );
                if (seenIdsRef.current !== null && newBookings.length > 0) {
                    // Show the most recent one
                    setBookingPopup({ message: newBookings[0].message, id: newBookings[0].id });
                }
                seenIdsRef.current = new Set(data.map(n => n.id));
            }
        }).catch(() => {});
    }, [user?.role]);

    useEffect(() => { fetchNotifications(); const t = setInterval(fetchNotifications, 30000); return () => clearInterval(t); }, [fetchNotifications]);

    const unreadCount = notifications.filter(n => !n.is_read).length;

    const markAllRead = async () => {
        await api.patch('/notifications/read').catch(() => {});
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    };

    const markOneRead = (id) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    };

    const handleLogout = () => { logout(); navigate('/login'); };
    const links = user?.role === 'admin' ? adminLinks : studentLinks;
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
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer' }} onClick={() => navigate(user?.role === 'admin' ? '/admin' : '/dashboard')}>
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
            <NotificationDrawer open={notifOpen} onClose={() => setNotifOpen(false)} notifications={notifications} unreadCount={unreadCount} onMarkAllRead={markAllRead} onMarkOneRead={markOneRead} />

            <Container sx={{ mt: { xs: 2, md: 4 }, mb: { xs: 2, md: 4 }, px: { xs: 2, md: 3 }, flex: 1 }}>{children}</Container>

            <InstallPrompt />

            {/* New booking popup — admin/warden only, 5 second auto-dismiss */}
            <Snackbar
                open={!!bookingPopup}
                autoHideDuration={5000}
                onClose={() => setBookingPopup(null)}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                sx={{ top: { xs: 70, md: 72 } }}
            >
                <Paper elevation={6} sx={{
                    p: 2, minWidth: 300, maxWidth: 400,
                    bgcolor: '#1a237e', color: '#fff',
                    borderLeft: '4px solid #FFD700',
                    borderRadius: 2,
                    display: 'flex', alignItems: 'flex-start', gap: 1.5,
                }}>
                    <BookOnline sx={{ color: '#FFD700', mt: 0.3, flexShrink: 0 }} />
                    <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#FFD700', mb: 0.3 }}>
                            New Booking
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)', lineHeight: 1.4 }}>
                            {bookingPopup?.message}
                        </Typography>
                    </Box>
                </Paper>
            </Snackbar>

            <Box component="footer" sx={{ py: 3, textAlign: 'center', bgcolor: mode === 'dark' ? 'rgba(17,24,39,0.9)' : '#1a237e', color: 'rgba(255,255,255,0.7)', mt: 'auto' }}>
                <Typography variant="body2">
                    © {new Date().getFullYear()} Zetech University Hostel Management System
                </Typography>
            </Box>
        </Box>
    );
}
