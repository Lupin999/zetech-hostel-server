import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
    Typography, Paper, Box, Chip, Alert, AlertTitle, TextField, Button, Grid,
    CircularProgress, CardMedia, Card, CardContent,
    Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import {
    CheckCircle, HourglassTop, KingBed, FreeBreakfast,
    DinnerDining, ArrowForward, BookOnline, Payment, SingleBed, Search
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import Swal from 'sweetalert2';
import toast from 'react-hot-toast';
import api from '../utils/api';
import useRooms from '../hooks/useRooms';
import useBookings from '../hooks/useBookings';
import useNotices from '../hooks/useNotices';
import usePayments from '../hooks/usePayments';
import { formatDate, getTodayName } from '../utils/helpers';
import { MENU_DATA, ASSETS_URL } from '../utils/constants';
import dImg from '../d.jpg';

const todayName = getTodayName();

export default function Dashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (user && ['admin', 'accounts', 'warden'].includes(user.role)) navigate('/admin', { replace: true });
    }, [user, navigate]);

    const { rooms } = useRooms();
    const { activeBooking, bookingOpen, fetchActive, fetchStatus } = useBookings();
    const { notices } = useNotices();
    const { payments } = usePayments();
    const [latestNotice, setLatestNotice] = useState(null);
    const [loadingData, setLoadingData] = useState(true);
    const [stats, setStats] = useState({ bookings: 0, paid: 0, unpaid: 0 });
    const [roomSearch, setRoomSearch] = useState('');
    const [hostelTab, setHostelTab] = useState('Boys');

    const [selectedRoom, setSelectedRoom] = useState(null);
    const [beds, setBeds] = useState([]);
    const [selectedBed, setSelectedBed] = useState(null);
    const [arrivalDate, setArrivalDate] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [loadingBeds, setLoadingBeds] = useState(false);
    const [bedFilter, setBedFilter] = useState('all');

    const todayMenu = MENU_DATA[todayName];

    const fetchAll = () => {
        fetchActive();
        fetchStatus();
        setLoadingData(false);
    };

    useEffect(() => {
        if (notices.length) setLatestNotice(notices[0]);
    }, [notices]);

    useEffect(() => {
        if (user?.role === 'student') {
            api.get('/bookings/my').then(bRes => {
                const bookings = bRes.data;
                const paid = payments.filter(p => p.status === 'confirmed').length;
                const approved = bookings.filter(b => b.status === 'approved').length;
                setStats({ bookings: bookings.length, paid, unpaid: approved - paid });
            }).catch(() => {});
            setLoadingData(false);
        } else { setLoadingData(false); }
    }, [user, payments]);

    const openBedDialog = async (room) => {
        setSelectedRoom(room); setSelectedBed(null); setArrivalDate(''); setBedFilter('all');
        setLoadingBeds(true); setDialogOpen(true);
        try { setBeds((await api.get(`/rooms/${room.id}/beds`)).data); }
        catch { setBeds([]); }
        finally { setLoadingBeds(false); }
    };

    const filteredBeds = bedFilter === 'all' ? beds : beds.filter(b => b.position === bedFilter);

    const handleBook = async () => {
        if (!selectedBed) return toast.error('Select a bed');
        if (!arrivalDate) return toast.error('Select arrival date');
        setSubmitting(true);
        try {
            await api.post('/bookings', { room_id: selectedRoom.id, bed_id: selectedBed.id, semester: 'Jan-Apr 2026', arrival_date: arrivalDate });
            setDialogOpen(false); fetchAll();
            Swal.fire({ icon: 'success', title: 'Booking Submitted!', text: `Room ${selectedRoom.room_number} Bed ${selectedBed.bed_number} (${selectedBed.position}) booked. Awaiting admin approval.`, confirmButtonColor: '#1a237e' });
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Booking Failed', text: err.response?.data?.error || 'Something went wrong', confirmButtonColor: '#1a237e' });
        } finally { setSubmitting(false); }
    };

    const boysRooms = rooms.filter(r => r.hostel === 'Boys');
    const girlsRooms = rooms.filter(r => r.hostel === 'Girls');
    const boysAvail = boysRooms.filter(r => r.occupied < r.capacity).length;
    const girlsAvail = girlsRooms.filter(r => r.occupied < r.capacity).length;
    const filteredRooms = rooms.filter(r => r.hostel === hostelTab && (r.room_number.includes(roomSearch) || r.hostel.toLowerCase().includes(roomSearch.toLowerCase())));

    return (
        <>
            {/* Welcome Banner */}
            <Box sx={{ position: 'relative', borderRadius: 3, overflow: 'hidden', mb: 3, height: { xs: 180, md: 240 }, display: 'flex', alignItems: 'center' }}>
                <Box sx={{ position: 'absolute', inset: 0, backgroundImage: `url(${dImg})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(13,27,42,0.85), rgba(26,35,126,0.7))' }} />
                <Box sx={{ position: 'absolute', inset: 0, m: { xs: 2, md: 4 }, borderRadius: 2, backdropFilter: 'blur(16px)', bgcolor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', display: 'flex', flexDirection: 'column', justifyContent: 'center', px: { xs: 3, md: 5 } }}>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                        <Typography variant="h5" sx={{ color: '#FFD700', fontWeight: 700, mb: 1 }}>Thanks for Choosing Zetech Hostel</Typography>
                    </motion.div>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}>
                        <Typography variant="h4" sx={{ color: '#fff', fontWeight: 700 }}>{user?.full_name}</Typography>
                        <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.8)', mt: 0.5 }}>{user?.reg_no} • {user?.campus}</Typography>
                    </motion.div>
                </Box>
            </Box>

            {/* Booking Status Alerts */}
            {user?.role === 'student' && !loadingData && (
                <>
                    {activeBooking?.suspended && (
                        <Alert severity="error" sx={{ mb: 3 }}>
                            <AlertTitle>🚫 Booking Suspended</AlertTitle>
                            Your booking for Room {activeBooking.room_number} has been suspended by admin.
                            {activeBooking.suspend_reason && <><br /><b>Reason:</b> {activeBooking.suspend_reason}</>}
                            <br />Contact the hostel office to resolve this.
                        </Alert>
                    )}
                    {activeBooking?.status === 'approved' && !activeBooking?.suspended && (
                        <Alert severity="success" icon={<CheckCircle />} sx={{ mb: 3 }}
                            action={<Button color="inherit" size="small" onClick={() => navigate('/my-bookings')}>Pay Now</Button>}>
                            <AlertTitle>Booking Approved!</AlertTitle>
                            Room {activeBooking.room_number}{activeBooking.bed_number ? ` • Bed ${activeBooking.bed_number}` : ''} • {activeBooking.hostel}
                            {activeBooking.arrival_date && <> • {formatDate(activeBooking.arrival_date)}</>}
                        </Alert>
                    )}
                    {activeBooking?.status === 'pending' && (
                        <Alert severity="warning" icon={<HourglassTop />} sx={{ mb: 3 }}>
                            <AlertTitle>Booking Under Review</AlertTitle>
                            Room {activeBooking.room_number}{activeBooking.bed_number ? ` Bed ${activeBooking.bed_number}` : ''} is being reviewed.
                        </Alert>
                    )}
                    {!activeBooking && bookingOpen && (
                        <Alert severity="info" icon={<KingBed />} sx={{ mb: 3 }}>
                            <AlertTitle>No Active Booking</AlertTitle>
                            Select a room and bed below to book your stay! Fee: KES 30,000 (min deposit KES 12,000)
                        </Alert>
                    )}
                    {!activeBooking && !bookingOpen && (
                        <Alert severity="error" sx={{ mb: 3 }}>
                            <AlertTitle>Booking Closed</AlertTitle>
                            Booking is currently closed by the admin. Contact the hostel office.
                        </Alert>
                    )}
                </>
            )}

            {latestNotice && (
                <Alert severity="info" sx={{ mb: 3 }} onClose={() => setLatestNotice(null)}>
                    <AlertTitle>{latestNotice.title}</AlertTitle>
                    {latestNotice.message}
                </Alert>
            )}

            {/* Stats */}
            {user?.role === 'student' && (
                <Grid container spacing={2} sx={{ mb: 3 }}>
                    {[{ icon: <BookOnline sx={{ color: '#1a237e', fontSize: 32 }} />, val: stats.bookings, label: 'Bookings' },
                      { icon: <Payment sx={{ color: '#2e7d32', fontSize: 32 }} />, val: stats.paid, label: 'Paid' },
                      { icon: <Payment sx={{ color: '#e65100', fontSize: 32 }} />, val: stats.unpaid, label: 'Unpaid' }].map((s, i) => (
                        <Grid size={{ xs: 4 }} key={i}>
                            <Paper sx={{ p: 2, textAlign: 'center' }}>
                                {s.icon}
                                <Typography variant="h5" fontWeight={700}>{s.val}</Typography>
                                <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                            </Paper>
                        </Grid>
                    ))}
                </Grid>
            )}

            {/* Today's Menu */}
            {user?.role === 'student' && todayMenu && (
                <Paper sx={{ p: 0, mb: 3, overflow: 'hidden' }}>
                    <Box sx={{ p: 2, pb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="h6" fontWeight={700}>🍽️ Today's Menu — {todayName}</Typography>
                        <Button size="small" endIcon={<ArrowForward />} onClick={() => navigate('/menu')}>Full Menu</Button>
                    </Box>
                    <Grid container>
                        {[{ meal: todayMenu.breakfast, icon: <FreeBreakfast sx={{ color: '#fb8c00', fontSize: 18 }} />, time: 'Breakfast • 6–7 AM' },
                          { meal: todayMenu.supper, icon: <DinnerDining sx={{ color: '#90caf9', fontSize: 18 }} />, time: 'Supper • 7–8 PM' }].map((m, i) => (
                            <Grid size={{ xs: 12, sm: 6 }} key={i}>
                                <Box sx={{ position: 'relative', m: 1.5, borderRadius: 2, overflow: 'hidden', cursor: 'pointer', '&:hover img': { transform: 'scale(1.05)' } }} onClick={() => navigate('/menu')}>
                                    <CardMedia component="img" image={m.meal.img} alt={m.meal.food} sx={{ height: 150, objectFit: 'cover', transition: '0.3s' }} />
                                    <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, p: 1.5, background: 'linear-gradient(transparent, rgba(0,0,0,0.85))' }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>{m.icon}<Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>{m.time}</Typography></Box>
                                        <Typography variant="body1" sx={{ color: '#fff', fontWeight: 700 }}>{m.meal.food}</Typography>
                                    </Box>
                                </Box>
                            </Grid>
                        ))}
                    </Grid>
                </Paper>
            )}

            {/* ===== ROOM SELECTION WITH BOYS / GIRLS TABS ===== */}
            {user?.role === 'student' && !activeBooking && !loadingData && bookingOpen && (
                <Paper sx={{ p: 2.5, mb: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                        <Typography variant="h6" fontWeight={700}>🏠 Select Your Room & Bed</Typography>
                        <TextField placeholder="Search..." size="small" sx={{ width: { xs: '100%', sm: 180 } }}
                            value={roomSearch} onChange={e => setRoomSearch(e.target.value)}
                            InputProps={{ startAdornment: <Search sx={{ color: 'text.disabled', mr: 0.5, fontSize: 20 }} /> }} />
                    </Box>

                    {/* Boys / Girls Toggle */}
                    <Box sx={{ display: 'flex', gap: 1, mb: 2.5 }}>
                        <Button variant={hostelTab === 'Boys' ? 'contained' : 'outlined'} onClick={() => setHostelTab('Boys')} sx={{ flex: 1, py: 1.2 }}>
                            🏠 Boys Hostel ({boysAvail}/{boysRooms.length} free)
                        </Button>
                        <Button variant={hostelTab === 'Girls' ? 'contained' : 'outlined'} onClick={() => setHostelTab('Girls')} sx={{ flex: 1, py: 1.2 }} color="secondary">
                            🏠 Girls Hostel ({girlsAvail}/{girlsRooms.length} free)
                        </Button>
                    </Box>

                    <Grid container spacing={2}>
                        {filteredRooms.map(room => (
                            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={room.id}>
                                <motion.div whileHover={{ scale: 1.03, y: -4 }} transition={{ duration: 0.2 }}>
                                    <Card sx={{ border: '2px solid transparent', transition: 'border-color 0.3s, box-shadow 0.3s', '&:hover': { borderColor: '#FFD700', boxShadow: '0 4px 24px rgba(255,215,0,0.25)' } }}>
                                        <CardContent>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                                                <Box>
                                                    <Typography variant="h6" fontWeight={700}>Room {room.room_number}</Typography>
                                                    <Typography variant="caption" color="text.secondary">{room.hostel} • {room.room_type}</Typography>
                                                </Box>
                                                <Chip label={`KES ${Number(room.price).toLocaleString()}`} color="secondary" size="small" />
                                            </Box>
                                            <Box sx={{ display: 'flex', gap: 0.8, mb: 1.5 }}>
                                                {[...Array(room.capacity)].map((_, i) => (
                                                    <Box key={i} sx={{ width: 28, height: 28, borderRadius: 1, bgcolor: i < room.occupied ? '#e53935' : '#43a047', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <SingleBed sx={{ fontSize: 16, color: '#fff' }} />
                                                    </Box>
                                                ))}
                                            </Box>
                                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>{room.capacity - room.occupied} of {room.capacity} beds free</Typography>
                                            {room.status === 'available' && room.occupied < room.capacity ? (
                                                <Button variant="contained" fullWidth size="small" onClick={() => openBedDialog(room)}>Select Bed</Button>
                                            ) : (
                                                <Chip label="Full" color="error" size="small" sx={{ width: '100%' }} />
                                            )}
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            </Grid>
                        ))}
                        {!filteredRooms.length && <Grid size={{ xs: 12 }}><Typography color="text.secondary" align="center" sx={{ py: 4 }}>No rooms found</Typography></Grid>}
                    </Grid>
                </Paper>
            )}

            {/* Bed Selection Dialog */}
            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ pb: 1 }}>Room {selectedRoom?.room_number} — Select Your Bed</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
                        <Chip label={selectedRoom?.hostel} size="small" />
                        <Chip label={selectedRoom?.room_type} size="small" />
                        <Chip label={`KES ${selectedRoom ? Number(selectedRoom.price).toLocaleString() : ''}`} color="secondary" size="small" />
                    </Box>

                    {/* Deposit info */}
                    <Alert severity="info" icon={<Payment />} sx={{ mb: 2, '& .MuiAlert-message': { width: '100%' } }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}>
                            <Typography variant="body2">Booking Fee: <b>KES {selectedRoom ? Number(selectedRoom.price).toLocaleString() : '30,000'}</b></Typography>
                            <Chip label="Min Deposit: KES 12,000" size="small" color="warning" />
                        </Box>
                    </Alert>

                    {/* Bed position filter */}
                    <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                        {[{ val: 'all', label: '🛏️ All Beds', count: beds.length },
                          { val: 'upper', label: '⬆️ Upper', count: beds.filter(b => b.position === 'upper').length },
                          { val: 'lower', label: '⬇️ Lower', count: beds.filter(b => b.position === 'lower').length },
                        ].map(f => (
                            <Button key={f.val} size="small" variant={bedFilter === f.val ? 'contained' : 'outlined'}
                                onClick={() => { setBedFilter(f.val); setSelectedBed(null); }}
                                sx={{ flex: 1, fontSize: '0.75rem', py: 0.8 }}>
                                {f.label} ({f.count})
                            </Button>
                        ))}
                    </Box>

                    {loadingBeds ? <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress /></Box> : (
                        <Grid container spacing={1.5} sx={{ mb: 2 }}>
                            {filteredBeds.map(bed => {
                                const taken = bed.status === 'occupied';
                                const selected = selectedBed?.id === bed.id;
                                const isUpper = bed.position === 'upper';
                                return (
                                    <Grid size={{ xs: 6 }} key={bed.id}>
                                        <motion.div whileHover={!taken ? { scale: 1.03 } : {}} whileTap={!taken ? { scale: 0.97 } : {}}>
                                            <Paper
                                                onClick={() => {
                                                    if (taken) {
                                                        toast.error(`Bed ${bed.bed_number} (${bed.position}) is already taken!`);
                                                        return;
                                                    }
                                                    setSelectedBed(bed);
                                                }}
                                                sx={{
                                                    p: 2, textAlign: 'center', cursor: taken ? 'pointer' : 'pointer',
                                                    border: 2, borderRadius: 2,
                                                    borderColor: selected ? '#FFD700' : taken ? '#e53935' : '#43a047',
                                                    bgcolor: selected ? 'rgba(255,215,0,0.12)' : taken ? 'rgba(229,57,53,0.06)' : 'rgba(67,160,71,0.06)',
                                                    boxShadow: selected ? '0 0 12px rgba(255,215,0,0.4)' : 'none',
                                                    opacity: taken ? 0.6 : 1,
                                                    position: 'relative', overflow: 'hidden',
                                                }}
                                            >
                                                {taken && (
                                                    <Box sx={{ position: 'absolute', top: 6, right: 6 }}>
                                                        <Chip label="Taken" size="small" color="error" sx={{ height: 20, fontSize: '0.65rem' }} />
                                                    </Box>
                                                )}
                                                <Box sx={{ fontSize: 28, mb: 0.5 }}>{isUpper ? '🛏️⬆️' : '🛏️⬇️'}</Box>
                                                <Typography variant="body1" fontWeight={700}>Bed {bed.bed_number}</Typography>
                                                <Chip
                                                    label={isUpper ? 'Upper Bed' : 'Lower Bed'}
                                                    size="small" variant="outlined"
                                                    sx={{ mt: 0.5, textTransform: 'capitalize',
                                                        borderColor: isUpper ? '#1565c0' : '#2e7d32',
                                                        color: isUpper ? '#1565c0' : '#2e7d32',
                                                    }}
                                                />
                                                {selected && <Typography variant="caption" display="block" sx={{ color: '#FFD700', fontWeight: 700, mt: 0.5 }}>✓ Selected</Typography>}
                                            </Paper>
                                        </motion.div>
                                    </Grid>
                                );
                            })}
                            {!filteredBeds.length && (
                                <Grid size={{ xs: 12 }}>
                                    <Typography color="text.secondary" align="center" sx={{ py: 3 }}>
                                        No {bedFilter !== 'all' ? bedFilter : ''} beds available
                                    </Typography>
                                </Grid>
                            )}
                        </Grid>
                    )}

                    <TextField label="Arrival Date" type="date" fullWidth InputLabelProps={{ shrink: true }}
                        value={arrivalDate} onChange={e => setArrivalDate(e.target.value)}
                        inputProps={{ min: new Date().toISOString().split('T')[0] }}
                        sx={{ mb: 1 }} />

                    {selectedBed && (
                        <Alert severity="success" sx={{ mt: 1.5 }}>
                            <Typography variant="body2">
                                <b>Bed {selectedBed.bed_number}</b> ({selectedBed.position} bed) in <b>Room {selectedRoom?.room_number}</b> — {selectedRoom?.hostel} Hostel
                            </Typography>
                        </Alert>
                    )}
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleBook} disabled={submitting || !selectedBed || !arrivalDate}
                        sx={{ minWidth: 160 }}>
                        {submitting ? 'Booking...' : `Book — Deposit KES 12,000`}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
