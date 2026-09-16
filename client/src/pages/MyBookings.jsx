import { useState, useEffect, useRef } from 'react';
import {
    Typography, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Paper, Chip, Box,
    Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
    CircularProgress
} from '@mui/material';
import { EventBusy } from '@mui/icons-material';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import useBookings from '../hooks/useBookings';
import usePayments from '../hooks/usePayments';
import bookingService from '../services/bookingService';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import BookingStatusChip from '../components/bookings/BookingStatusChip';
import MpesaDialog from '../components/payments/MpesaDialog';
import { formatDate } from '../utils/helpers';


export default function MyBookings() {
    const { bookings, loading: bLoading, fetchMyBookings } = useBookings();
    const { payments, loading: pLoading, fetchMyPayments, initStkPush, queryStkStatus, submit: submitPayment } = usePayments();
    const loading = bLoading || pLoading;
    const [payOpen, setPayOpen] = useState(false);
    const [mpesaOpen, setMpesaOpen] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [payForm, setPayForm] = useState({ amount: '', payment_method: 'mpesa', mpesa_code: '' });
    const [phone, setPhone] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [polling, setPolling] = useState(false);
    const pollRef = useRef(null);

    const fetchData = () => { fetchMyBookings(); fetchMyPayments(); };

    useEffect(() => { return () => { if (pollRef.current) clearInterval(pollRef.current); }; }, []);

    const getPayment = (bookingId) => payments.find(p => p.booking_id === bookingId);

    // M-Pesa STK Push flow
    const handleMpesaPay = async () => {
        if (!phone.trim() || phone.length < 10) return toast.error('Enter a valid phone number');
        setSubmitting(true);
        try {
            const stkRes = await initStkPush(phone, selectedBooking.id);
            const checkoutId = stkRes.checkoutRequestId;
            setMpesaOpen(false);
            setPhone('');

            Swal.fire({
                icon: 'info', title: 'Check Your Phone',
                html: `Enter your <b>M-Pesa PIN</b> to complete payment of <b>KES ${Number(selectedBooking.price).toLocaleString()}</b>`,
                confirmButtonColor: '#1a237e', allowOutsideClick: false,
            });

            // Poll using STK query to check with Safaricom directly
            setPolling(true);
            let attempts = 0;
            pollRef.current = setInterval(async () => {
                attempts++;
                try {
                    const qRes = await queryStkStatus(checkoutId);
                    if (qRes.status === 'confirmed') {
                        clearInterval(pollRef.current);
                        setPolling(false);
                        fetchData();
                        Swal.fire({ icon: 'success', title: 'Payment Confirmed!', text: 'Your M-Pesa payment was successful. Welcome to Zetech Hostel!', confirmButtonColor: '#1a237e' });
                    } else if (qRes.status === 'failed') {
                        clearInterval(pollRef.current);
                        setPolling(false);
                        fetchData();
                        Swal.fire({ icon: 'error', title: 'Payment Failed', text: qRes.message || 'Payment was cancelled or timed out. You can try again.', confirmButtonColor: '#1a237e' });
                    }
                } catch { /* keep polling */ }
                if (attempts >= 24) {
                    clearInterval(pollRef.current);
                    setPolling(false);
                    fetchData();
                    toast('Payment verification timed out. Check notifications for updates.', { icon: '⏳' });
                }
            }, 5000);
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'STK Push Failed', text: err.response?.data?.error || 'Could not initiate payment', confirmButtonColor: '#1a237e' });
        } finally { setSubmitting(false); }
    };

    // Manual payment flow (cash or manual mpesa code)
    const handleManualPay = async () => {
        if (!payForm.amount || Number(payForm.amount) < 12000) return toast.error('Minimum payment is KES 12,000 (deposit)');
        if (payForm.payment_method === 'mpesa' && !payForm.mpesa_code.trim()) return toast.error('Enter M-Pesa code');
        setSubmitting(true);
        try {
            await submitPayment({ booking_id: selectedBooking.id, ...payForm });
            setPayOpen(false);
            setPayForm({ amount: '', payment_method: 'mpesa', mpesa_code: '' });
            fetchData();
            Swal.fire({ icon: 'success', title: 'Payment Submitted!', text: 'Your payment is pending admin confirmation.', confirmButtonColor: '#1a237e' });
        } catch (err) { Swal.fire({ icon: 'error', title: 'Payment Failed', text: err.response?.data?.error || 'Something went wrong', confirmButtonColor: '#1a237e' }); }
        finally { setSubmitting(false); }
    };

    const handleCancel = async (id) => {
        const result = await Swal.fire({
            title: 'Cancel Booking?', text: 'This action cannot be undone.',
            icon: 'warning', showCancelButton: true, confirmButtonColor: '#c62828', cancelButtonColor: '#666',
            confirmButtonText: 'Yes, cancel it',
        });
        if (!result.isConfirmed) return;
        try {
            await bookingService.cancelBooking(id);
            fetchData();
            Swal.fire({ icon: 'success', title: 'Cancelled', text: 'Your booking has been cancelled.', confirmButtonColor: '#1a237e' });
        } catch (err) { Swal.fire({ icon: 'error', title: 'Failed', text: err.response?.data?.error || 'Could not cancel', confirmButtonColor: '#1a237e' }); }
    };


    if (loading) return <LoadingSpinner />;

    return (
        <>
            <Typography variant="h4" gutterBottom>My Bookings</Typography>
            {polling && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, p: 1.5, bgcolor: 'rgba(255,215,0,0.1)', borderRadius: 2, border: '1px solid rgba(255,215,0,0.3)' }}>
                    <CircularProgress size={20} />
                    <Typography variant="body2">Waiting for M-Pesa confirmation...</Typography>
                </Box>
            )}
            {!bookings.length ? (
                <EmptyState icon={<EventBusy sx={{ fontSize: 80 }} />} title="No bookings yet" subtitle="Browse available rooms and make your first booking." />
            ) : (
                <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Room</TableCell>
                                <TableCell>Hostel</TableCell>
                                <TableCell>Price</TableCell>
                                <TableCell>Semester</TableCell>
                                <TableCell>Booked On</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Payment</TableCell>
                                <TableCell>Action</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {bookings.map(b => {
                                const payment = getPayment(b.id);
                                return (
                                    <TableRow key={b.id}>
                                        <TableCell>{b.room_number}</TableCell>
                                        <TableCell>{b.hostel}</TableCell>
                                        <TableCell>KES {b.price}</TableCell>
                                        <TableCell>{b.semester}</TableCell>
                                        <TableCell>{formatDate(b.created_at)}</TableCell>
                                        <TableCell><BookingStatusChip status={b.status} /></TableCell>
                                        <TableCell>
                                            {b.suspended ? (
                                                <Chip label="🚫 Suspended" color="error" size="small" />
                                            ) : payment ? (
                                                <Chip label={payment.status === 'confirmed' ? 'Paid' : 'Pending'}
                                                    color={payment.status === 'confirmed' ? 'success' : 'warning'} size="small" variant="outlined" />
                                            ) : (
                                                b.status === 'approved' ? <Chip label="Unpaid" color="warning" size="small" variant="outlined" /> : '—'
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {b.status === 'approved' && !payment && !b.suspended && (
                                                <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                    <Button size="small" variant="contained" color="success"
                                                        onClick={() => { setSelectedBooking(b); setMpesaOpen(true); }}>
                                                        M-Pesa
                                                    </Button>
                                                    <Button size="small" variant="outlined"
                                                        onClick={() => { setSelectedBooking(b); setPayForm({ amount: b.price, payment_method: 'cash', mpesa_code: '' }); setPayOpen(true); }}>
                                                        Manual
                                                    </Button>
                                                </Box>
                                            )}
                                            {b.status === 'pending' && (
                                                <Button size="small" color="error" onClick={() => handleCancel(b.id)}>Cancel</Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* M-Pesa STK Push Dialog */}
            <MpesaDialog open={mpesaOpen} onClose={() => setMpesaOpen(false)} booking={selectedBooking} phone={phone} setPhone={setPhone} onPay={handleMpesaPay} submitting={submitting} />

            {/* Manual Payment Dialog */}
            <Dialog open={payOpen} onClose={() => setPayOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Manual Payment — Room {selectedBooking?.room_number}</DialogTitle>
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                    <TextField label="Amount (KES)" type="number" value={payForm.amount}
                        onChange={e => setPayForm({ ...payForm, amount: e.target.value })} />
                    <TextField label="Payment Method" select value={payForm.payment_method}
                        onChange={e => setPayForm({ ...payForm, payment_method: e.target.value, mpesa_code: '' })}>
                        <MenuItem value="mpesa">M-Pesa (manual code)</MenuItem>
                        <MenuItem value="cash">Cash</MenuItem>
                    </TextField>
                    {payForm.payment_method === 'mpesa' && (
                        <TextField label="M-Pesa Transaction Code" value={payForm.mpesa_code}
                            onChange={e => setPayForm({ ...payForm, mpesa_code: e.target.value })} />
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPayOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleManualPay} disabled={submitting}>
                        {submitting ? 'Submitting...' : 'Submit Payment'}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
