import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
    Typography, Box, CircularProgress, Grid, Paper, Button,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Chip, TextField, MenuItem, Divider, Dialog, DialogTitle,
    DialogContent, DialogActions, IconButton, Tooltip, Alert
} from '@mui/material';
import { Hotel, KingBed, CheckCircle, EventAvailable, Delete, Add, Campaign, Refresh, Edit } from '@mui/icons-material';
import { Chart as ChartJS, ArcElement, Tooltip as ChartTooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import api from '../utils/api';
import useBookings from '../hooks/useBookings';
import useRooms from '../hooks/useRooms';
import useNotices from '../hooks/useNotices';
import StatCard from '../components/admin/StatCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { formatDate } from '../utils/helpers';
import dImg from '../d.jpg';

ChartJS.register(ArcElement, ChartTooltip, Legend);

export default function AdminDashboard() {
    const { user } = useAuth();
    const { bookings, bookingOpen, loading: bLoading, fetchAllBookings, toggle } = useBookings({ fetchAll: true });
    const { rooms, loading: rLoading, fetchRooms } = useRooms();
    const { notices, loading: nLoading, fetchNotices } = useNotices();
    const [loading, setLoading] = useState(bLoading || rLoading || nLoading);
    const [filter, setFilter] = useState('all');
    const [roomDialog, setRoomDialog] = useState(false);
    const [roomForm, setRoomForm] = useState({ room_number: '', hostel: 'Boys', campus: 'Main Campus', room_type: 'quad', capacity: 4, price: 30000 });
    const [roomSubmitting, setRoomSubmitting] = useState(false);
    const [noticeDialog, setNoticeDialog] = useState(false);
    const [noticeForm, setNoticeForm] = useState({ title: '', message: '', target: 'all' });
    const [noticeSubmitting, setNoticeSubmitting] = useState(false);
    const [suspendDialog, setSuspendDialog] = useState(false);
    const [suspendTarget, setSuspendTarget] = useState(null);
    const [suspendReason, setSuspendReason] = useState('');
    const [suspendSubmitting, setSuspendSubmitting] = useState(false);
    const [msgDialog, setMsgDialog] = useState(false);
    const [msgTarget, setMsgTarget] = useState(null);
    const [msgText, setMsgText] = useState('');
    const [msgSubmitting, setMsgSubmitting] = useState(false);
    const [profileDialog, setProfileDialog] = useState(false);
    const [profileForm, setProfileForm] = useState({ email: user?.email || '', phone: user?.phone || '' });
    const [profileSaving, setProfileSaving] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        await Promise.all([fetchAllBookings(), fetchRooms(), fetchNotices()]);
        setLoading(false);
    };

    useEffect(() => { setLoading(bLoading || rLoading || nLoading); }, [bLoading, rLoading, nLoading]);

    const totalBeds = rooms.reduce((s, r) => s + r.capacity, 0);
    const bedsTaken = rooms.reduce((s, r) => s + Number(r.occupied), 0);
    const stats = { totalRooms: rooms.length, totalBeds, bedsTaken, bedsRemaining: totalBeds - bedsTaken };
    const chartData = {
        labels: ['Pending', 'Approved', 'Rejected'],
        datasets: [{ data: [bookings.filter(b => b.status === 'pending').length, bookings.filter(b => b.status === 'approved').length, bookings.filter(b => b.status === 'rejected').length], backgroundColor: ['#fb8c00', '#43a047', '#e53935'] }],
    };
    const filtered = filter === 'all' ? bookings : bookings.filter(b => b.status === filter);

    const handleStatus = async (id, status) => {
        const action = status === 'approved' ? 'Approve' : 'Reject';
        const r = await Swal.fire({ title: `${action} this booking?`, icon: 'question', showCancelButton: true, confirmButtonColor: status === 'approved' ? '#43a047' : '#e53935', confirmButtonText: `Yes, ${action.toLowerCase()}` });
        if (!r.isConfirmed) return;
        try { await api.put(`/bookings/${id}/status`, { status }); fetchData(); Swal.fire({ icon: 'success', title: `Booking ${status}!`, timer: 1500, confirmButtonColor: '#1a237e' }); }
        catch (err) { Swal.fire({ icon: 'error', title: 'Failed', text: err.response?.data?.error || 'Error', confirmButtonColor: '#1a237e' }); }
    };

    const handleSuspend = async () => {
        if (!suspendReason.trim()) return toast.error('Enter a reason/message');
        setSuspendSubmitting(true);
        try {
            await api.put(`/bookings/${suspendTarget.id}/suspend`, { suspended: true, reason: suspendReason });
            setSuspendDialog(false); setSuspendReason(''); setSuspendTarget(null); fetchData();
            Swal.fire({ icon: 'success', title: 'Booking Suspended', text: 'Student has been notified.', timer: 1500, confirmButtonColor: '#1a237e' });
        } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
        finally { setSuspendSubmitting(false); }
    };

    const handleUnsuspend = async (id) => {
        const r = await Swal.fire({ title: 'Unsuspend this booking?', text: 'Student will regain access.', icon: 'question', showCancelButton: true, confirmButtonColor: '#43a047', confirmButtonText: 'Yes, unsuspend' });
        if (!r.isConfirmed) return;
        try {
            await api.put(`/bookings/${id}/suspend`, { suspended: false }); fetchData();
            Swal.fire({ icon: 'success', title: 'Booking Reactivated', timer: 1500, confirmButtonColor: '#1a237e' });
        } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    };

    const handleMessage = async () => {
        if (!msgText.trim()) return toast.error('Enter a message');
        setMsgSubmitting(true);
        try {
            await api.post('/notifications/send', { user_id: msgTarget.user_id, message: msgText });
            setMsgDialog(false); setMsgText(''); setMsgTarget(null);
            Swal.fire({ icon: 'success', title: 'Message Sent!', text: `${msgTarget.full_name} will see this in their notifications.`, timer: 1500, confirmButtonColor: '#1a237e' });
        } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
        finally { setMsgSubmitting(false); }
    };

    const handleConfirmPayment = async (bookingId) => {
        const r = await Swal.fire({ title: 'Confirm payment?', icon: 'question', showCancelButton: true, confirmButtonColor: '#43a047', confirmButtonText: 'Confirm' });
        if (!r.isConfirmed) return;
        try {
            const pRes = await api.get('/payments/all');
            const payment = pRes.data.find(p => p.booking_id === bookingId && p.status === 'pending');
            if (!payment) return toast.error('No pending payment found');
            await api.patch(`/payments/${payment.id}/confirm`); fetchData();
            Swal.fire({ icon: 'success', title: 'Payment Confirmed!', timer: 1500, confirmButtonColor: '#1a237e' });
        } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    };

    const handleToggleBooking = async () => {
        const newState = !bookingOpen;
        const r = await Swal.fire({ title: `${newState ? 'Open' : 'Close'} booking?`, text: newState ? 'Students can book rooms.' : 'Students CANNOT book rooms.', icon: 'question', showCancelButton: true, confirmButtonColor: newState ? '#43a047' : '#e53935', confirmButtonText: `Yes, ${newState ? 'open' : 'close'} it` });
        if (!r.isConfirmed) return;
        try { await toggle(newState); toast.success(`Booking ${newState ? 'opened' : 'closed'}!`); }
        catch { toast.error('Failed'); }
    };

    const handleAddRoom = async () => {
        if (!roomForm.room_number.trim()) return toast.error('Room number required');
        setRoomSubmitting(true);
        try { await api.post('/rooms', roomForm); setRoomDialog(false); setRoomForm({ room_number: '', hostel: 'Boys', campus: 'Main Campus', room_type: 'quad', capacity: 4, price: 30000 }); fetchData(); toast.success('Room added!'); }
        catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
        finally { setRoomSubmitting(false); }
    };

    const handleDeleteRoom = async (id, num) => {
        const r = await Swal.fire({ title: `Delete Room ${num}?`, icon: 'warning', showCancelButton: true, confirmButtonColor: '#e53935' });
        if (!r.isConfirmed) return;
        try { await api.delete(`/rooms/${id}`); fetchData(); toast.success('Deleted'); }
        catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    };

    const handleAddNotice = async () => {
        if (!noticeForm.title.trim() || !noticeForm.message.trim()) return toast.error('Title and message required');
        setNoticeSubmitting(true);
        try { await api.post('/notices', noticeForm); setNoticeDialog(false); setNoticeForm({ title: '', message: '', target: 'all' }); fetchData(); toast.success('Posted!'); }
        catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
        finally { setNoticeSubmitting(false); }
    };

    const handleDeleteNotice = async (id) => {
        const r = await Swal.fire({ title: 'Delete notice?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#e53935' });
        if (!r.isConfirmed) return;
        try { await api.delete(`/notices/${id}`); fetchData(); toast.success('Deleted'); } catch { toast.error('Failed'); }
    };

    const handleUpdateProfile = async () => {
        if (!profileForm.email.trim()) return toast.error('Email is required');
        if (!/\S+@\S+\.\S+/.test(profileForm.email)) return toast.error('Enter a valid email');
        setProfileSaving(true);
        try {
            await api.put('/auth/profile/info', { full_name: user.full_name, course: user.course, email: profileForm.email, phone: profileForm.phone });
            setProfileDialog(false);
            toast.success('Account updated! Changes will reflect on next login.');
        } catch (err) { toast.error(err.response?.data?.error || 'Failed to update'); }
        finally { setProfileSaving(false); }
    };

    if (loading) return <LoadingSpinner />;


    return (
        <>
            {/* Hero */}
            <Box sx={{ position: 'relative', borderRadius: 3, overflow: 'hidden', mb: 3, height: { xs: 160, md: 220 }, display: 'flex', alignItems: 'center' }}>
                <Box sx={{ position: 'absolute', inset: 0, backgroundImage: `url(${dImg})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(13,27,42,0.88), rgba(26,35,126,0.75))' }} />
                <Box sx={{ position: 'absolute', inset: 0, m: { xs: 2, md: 4 }, borderRadius: 2, backdropFilter: 'blur(16px)', bgcolor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', display: 'flex', flexDirection: 'column', justifyContent: 'center', px: { xs: 3, md: 5 } }}>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                        <Typography variant="h5" sx={{ color: '#FFD700', fontWeight: 700, mb: 0.5 }}>Admin Dashboard</Typography>
                    </motion.div>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}>
                        <Typography variant="h4" sx={{ color: '#fff', fontWeight: 700 }}>{user?.full_name}</Typography>
                        <Typography variant="body1" component="div" sx={{ color: 'rgba(255,255,255,0.8)', mt: 0.5 }}>
                            {user?.role} • Booking: <Chip label={bookingOpen ? 'OPEN' : 'CLOSED'} size="small" color={bookingOpen ? 'success' : 'error'} sx={{ color: '#fff', fontWeight: 700 }} />
                        </Typography>
                    </motion.div>
                </Box>
            </Box>

            {/* Stats */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={{ xs: 6, md: 3 }}><StatCard icon={<Hotel sx={{ color: '#fff', fontSize: 28 }} />} label="Total Rooms" value={stats.totalRooms} bgColor="#1a237e" /></Grid>
                <Grid size={{ xs: 6, md: 3 }}><StatCard icon={<KingBed sx={{ color: '#fff', fontSize: 28 }} />} label="Total Beds" value={stats.totalBeds} bgColor="#2e7d32" /></Grid>
                <Grid size={{ xs: 6, md: 3 }}><StatCard icon={<CheckCircle sx={{ color: '#fff', fontSize: 28 }} />} label="Beds Taken" value={stats.bedsTaken} bgColor="#e65100" /></Grid>
                <Grid size={{ xs: 6, md: 3 }}><StatCard icon={<EventAvailable sx={{ color: '#fff', fontSize: 28 }} />} label="Beds Free" value={stats.bedsRemaining} bgColor="#00695c" /></Grid>
            </Grid>

            {/* Quick Actions */}
            <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>Quick Actions</Typography>
                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                    <Button variant="contained" startIcon={<Add />} onClick={() => setRoomDialog(true)}>Add Room</Button>
                    <Button variant="contained" color="secondary" startIcon={<Campaign />} onClick={() => setNoticeDialog(true)} sx={{ color: '#000' }}>Post Notice</Button>
                    <Button variant={bookingOpen ? 'outlined' : 'contained'} color={bookingOpen ? 'error' : 'success'} onClick={handleToggleBooking}>
                        {bookingOpen ? '🔒 Close Booking' : '🔓 Open Booking'}
                    </Button>
                    <Button variant="outlined" startIcon={<Refresh />} onClick={() => { setLoading(true); fetchData(); }}>Refresh</Button>
                    <Button variant="outlined" startIcon={<Edit />} onClick={() => { setProfileForm({ email: user?.email || '', phone: user?.phone || '' }); setProfileDialog(true); }} sx={{ color: '#1a237e', borderColor: '#1a237e' }}>My Account</Button>
                </Box>
                <Divider sx={{ my: 2 }} />
                <Typography variant="body2" color="text.secondary">
                    {bookings.filter(b => b.status === 'pending').length} pending • {bookings.filter(b => b.status === 'approved' && b.payment_status === 'pending').length} awaiting payment • {rooms.filter(r => Number(r.occupied) < r.capacity).length}/{rooms.length} rooms available
                </Typography>
            </Paper>

            {/* Chart */}
            {bookings.length > 0 && (
                <Paper sx={{ p: 3, mb: 3, display: 'flex', justifyContent: 'center' }}>
                    <Box sx={{ maxWidth: 260 }}>
                        <Typography variant="h6" align="center" gutterBottom>Booking Overview</Typography>
                        <Doughnut data={chartData} options={{ plugins: { legend: { position: 'bottom' } } }} />
                    </Box>
                </Paper>
            )}

            {/* Bookings Table */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Student Bookings</Typography>
                <TextField select size="small" value={filter} onChange={e => setFilter(e.target.value)} sx={{ minWidth: 150 }}>
                    <MenuItem value="all">All ({bookings.length})</MenuItem>
                    <MenuItem value="pending">Pending ({bookings.filter(b => b.status === 'pending').length})</MenuItem>
                    <MenuItem value="approved">Approved ({bookings.filter(b => b.status === 'approved').length})</MenuItem>
                    <MenuItem value="rejected">Rejected ({bookings.filter(b => b.status === 'rejected').length})</MenuItem>
                </TextField>
            </Box>
            <TableContainer component={Paper} sx={{ overflowX: 'auto', mb: 3 }}>
                <Table>
                    <TableHead><TableRow>
                        {['Student', 'Reg No', 'Room', 'Bed', 'Hostel', 'Arrival', 'Status', 'Payment', 'Actions'].map(h => <TableCell key={h}>{h}</TableCell>)}
                    </TableRow></TableHead>
                    <TableBody>
                        {!filtered.length ? <TableRow><TableCell colSpan={9} align="center" sx={{ py: 4, color: 'text.secondary' }}>No bookings</TableCell></TableRow> :
                        filtered.map(b => (
                            <TableRow key={b.id} sx={{ bgcolor: b.status === 'pending' ? 'rgba(251,140,0,0.04)' : undefined }}>
                                <TableCell>{b.full_name}</TableCell>
                                <TableCell>{b.reg_no}</TableCell>
                                <TableCell>{b.room_number}</TableCell>
                                <TableCell>{b.bed_number ? `${b.bed_number} (${b.bed_position || ''})` : '—'}</TableCell>
                                <TableCell>{b.hostel}</TableCell>
                                <TableCell>{b.arrival_date ? formatDate(b.arrival_date) : '—'}</TableCell>
                                <TableCell><Chip label={b.status} size="small" color={b.status === 'approved' ? 'success' : b.status === 'rejected' ? 'error' : 'warning'} /></TableCell>
                                <TableCell>{b.payment_status ? <Chip label={b.payment_status === 'confirmed' ? 'Paid' : 'Pending'} size="small" color={b.payment_status === 'confirmed' ? 'success' : 'warning'} variant="outlined" /> : '—'}</TableCell>
                                <TableCell>
                                    {b.status === 'pending' && <Box sx={{ display: 'flex', gap: 0.5 }}><Button size="small" color="success" variant="contained" onClick={() => handleStatus(b.id, 'approved')}>Approve</Button><Button size="small" color="error" variant="outlined" onClick={() => handleStatus(b.id, 'rejected')}>Reject</Button></Box>}
                                    {b.status === 'approved' && b.payment_status === 'pending' && <Button size="small" color="success" variant="contained" onClick={() => handleConfirmPayment(b.id)}>Confirm Pay</Button>}
                                    {b.status === 'approved' && !b.suspended && (
                                        <Button size="small" color="warning" variant="outlined" sx={{ ml: 0.5 }}
                                            onClick={() => { setSuspendTarget(b); setSuspendReason(''); setSuspendDialog(true); }}>Suspend</Button>
                                    )}
                                    <Button size="small" variant="outlined" sx={{ ml: 0.5 }}
                                        onClick={() => { setMsgTarget(b); setMsgText(''); setMsgDialog(true); }}>💬 Message</Button>
                                    {b.status === 'approved' && b.suspended && (
                                        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                                            <Chip label="🚫 Suspended" size="small" color="error" />
                                            <Button size="small" color="success" variant="outlined" onClick={() => handleUnsuspend(b.id)}>Unsuspend</Button>
                                        </Box>
                                    )}
                                    {b.status === 'approved' && b.payment_status === 'confirmed' && !b.suspended && <Chip label="✓ Complete" size="small" color="success" />}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Room Management */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Rooms</Typography>
                <Button size="small" startIcon={<Add />} onClick={() => setRoomDialog(true)}>Add Room</Button>
            </Box>
            <TableContainer component={Paper} sx={{ overflowX: 'auto', mb: 3 }}>
                <Table size="small">
                    <TableHead><TableRow>{['Room', 'Hostel', 'Type', 'Capacity', 'Occupied', 'Price', 'Status', ''].map(h => <TableCell key={h}>{h}</TableCell>)}</TableRow></TableHead>
                    <TableBody>{rooms.map(r => (
                        <TableRow key={r.id}>
                            <TableCell>{r.room_number}</TableCell><TableCell>{r.hostel}</TableCell><TableCell>{r.room_type}</TableCell><TableCell>{r.capacity}</TableCell>
                            <TableCell><Chip label={`${r.occupied}/${r.capacity}`} size="small" color={r.occupied >= r.capacity ? 'error' : 'success'} variant="outlined" /></TableCell>
                            <TableCell>KES {Number(r.price).toLocaleString()}</TableCell>
                            <TableCell><Chip label={r.status} size="small" color={r.status === 'available' ? 'success' : 'warning'} /></TableCell>
                            <TableCell><Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => handleDeleteRoom(r.id, r.room_number)}><Delete fontSize="small" /></IconButton></Tooltip></TableCell>
                        </TableRow>
                    ))}</TableBody>
                </Table>
            </TableContainer>

            {/* Notices */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Notices</Typography>
                <Button size="small" startIcon={<Campaign />} onClick={() => setNoticeDialog(true)}>Post</Button>
            </Box>
            <Paper sx={{ mb: 3 }}>
                {!notices.length ? <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}><Typography>No notices</Typography></Box> :
                notices.map(n => (
                    <Box key={n.id} sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                <Typography fontWeight={600}>{n.title}</Typography>
                                <Chip label={n.target === 'all' ? '📢 All' : n.target === 'boys' ? '🏠 Boys' : '🏠 Girls'}
                                    size="small" color={n.target === 'all' ? 'default' : n.target === 'boys' ? 'primary' : 'secondary'}
                                    sx={{ height: 22, fontSize: '0.7rem' }} />
                            </Box>
                            <Typography variant="body2" color="text.secondary">{n.message}</Typography>
                            <Typography variant="caption" color="text.disabled">{formatDate(n.created_at)} • {n.author}</Typography>
                        </Box>
                        <IconButton size="small" color="error" onClick={() => handleDeleteNotice(n.id)}><Delete fontSize="small" /></IconButton>
                    </Box>
                ))}
            </Paper>

            {/* Dialogs */}
            {/* Message Dialog */}
            <Dialog open={msgDialog} onClose={() => setMsgDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>💬 Message {msgTarget?.full_name}</DialogTitle>
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                        {msgTarget?.reg_no} • Room {msgTarget?.room_number} • {msgTarget?.hostel}
                    </Typography>
                    <TextField label="Message" multiline rows={3} value={msgText}
                        onChange={e => setMsgText(e.target.value)} placeholder="e.g. Please visit the hostel office regarding your payment." autoFocus />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setMsgDialog(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleMessage} disabled={msgSubmitting}>
                        {msgSubmitting ? 'Sending...' : 'Send Message'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Suspend Dialog */}
            <Dialog open={suspendDialog} onClose={() => setSuspendDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ color: '#e53935' }}>🚫 Suspend Booking</DialogTitle>
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                    <Alert severity="warning">
                        Suspending <b>{suspendTarget?.full_name}</b>'s booking for Room <b>{suspendTarget?.room_number}</b>. They will see this message and their portal access will be blocked.
                    </Alert>
                    <TextField label="Reason / Message to Student" multiline rows={3} value={suspendReason}
                        onChange={e => setSuspendReason(e.target.value)} placeholder="e.g. Insufficient payment — please clear your balance at the hostel office." />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSuspendDialog(false)}>Cancel</Button>
                    <Button variant="contained" color="error" onClick={handleSuspend} disabled={suspendSubmitting}>
                        {suspendSubmitting ? 'Suspending...' : 'Suspend Booking'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={roomDialog} onClose={() => setRoomDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Add Room</DialogTitle>
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                    <TextField label="Room Number" value={roomForm.room_number} onChange={e => setRoomForm({ ...roomForm, room_number: e.target.value })} />
                    <TextField label="Hostel" select value={roomForm.hostel} onChange={e => setRoomForm({ ...roomForm, hostel: e.target.value })}><MenuItem value="Boys">Boys</MenuItem><MenuItem value="Girls">Girls</MenuItem></TextField>
                    <TextField label="Campus" value={roomForm.campus} onChange={e => setRoomForm({ ...roomForm, campus: e.target.value })} />
                    <TextField label="Type" select value={roomForm.room_type} onChange={e => setRoomForm({ ...roomForm, room_type: e.target.value })}><MenuItem value="single">Single</MenuItem><MenuItem value="double">Double</MenuItem><MenuItem value="quad">Quad</MenuItem></TextField>
                    <TextField label="Capacity" type="number" value={roomForm.capacity} onChange={e => setRoomForm({ ...roomForm, capacity: Number(e.target.value) })} />
                    <TextField label="Price (KES)" type="number" value={roomForm.price} onChange={e => setRoomForm({ ...roomForm, price: Number(e.target.value) })} />
                </DialogContent>
                <DialogActions><Button onClick={() => setRoomDialog(false)}>Cancel</Button><Button variant="contained" onClick={handleAddRoom} disabled={roomSubmitting}>{roomSubmitting ? 'Adding...' : 'Add Room'}</Button></DialogActions>
            </Dialog>
            <Dialog open={noticeDialog} onClose={() => setNoticeDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Post Notice</DialogTitle>
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                    <TextField label="Target Audience" select value={noticeForm.target}
                        onChange={e => setNoticeForm({ ...noticeForm, target: e.target.value })}>
                        <MenuItem value="all">📢 Everyone</MenuItem>
                        <MenuItem value="boys">🏠 Boys Hostel Only</MenuItem>
                        <MenuItem value="girls">🏠 Girls Hostel Only</MenuItem>
                    </TextField>
                    <TextField label="Title" value={noticeForm.title} onChange={e => setNoticeForm({ ...noticeForm, title: e.target.value })} />
                    <TextField label="Message" multiline rows={4} value={noticeForm.message} onChange={e => setNoticeForm({ ...noticeForm, message: e.target.value })} />
                </DialogContent>
                <DialogActions><Button onClick={() => setNoticeDialog(false)}>Cancel</Button><Button variant="contained" onClick={handleAddNotice} disabled={noticeSubmitting}>{noticeSubmitting ? 'Posting...' : 'Post'}</Button></DialogActions>
            </Dialog>

            {/* Admin Account Settings Dialog */}
            <Dialog open={profileDialog} onClose={() => setProfileDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>⚙️ My Account Settings</DialogTitle>
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                        Update your email and phone number for login access.
                    </Typography>
                    <TextField label="Email" type="email" fullWidth value={profileForm.email}
                        onChange={e => setProfileForm({ ...profileForm, email: e.target.value })}
                        placeholder="admin@zetech.ac.ke" />
                    <TextField label="Phone Number" fullWidth value={profileForm.phone}
                        onChange={e => setProfileForm({ ...profileForm, phone: e.target.value.replace(/[^0-9+]/g, '') })}
                        placeholder="+254712345678"
                        helperText="Include country code (e.g. +254). Used for phone login via OTP." />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setProfileDialog(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleUpdateProfile} disabled={profileSaving}>
                        {profileSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
