import { useState, useEffect, useRef } from 'react';
import {
    Typography, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Paper, Chip, Box,
    Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Alert,
    CircularProgress
} from '@mui/material';
import { EventBusy, ReceiptLong } from '@mui/icons-material';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import useBookings from '../hooks/useBookings';
import usePayments from '../hooks/usePayments';
import bookingService from '../services/bookingService';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import BookingStatusChip from '../components/bookings/BookingStatusChip';
import MpesaDialog from '../components/payments/MpesaDialog';
import { formatDate, formatHostelName, formatRoomNumber } from '../utils/helpers';
import { useAuth } from '../context/AuthContext';
import { SCHOOL_PAYBILL } from '../utils/constants';
import api from '../utils/api';
import { formatPaymentMethod } from '../utils/helpers';


export default function MyBookings() {
    const { user } = useAuth();
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
    const [receipt, setReceipt] = useState(null);
    const [receiptLoading, setReceiptLoading] = useState(false);
    const pollRef = useRef(null);

    const fetchData = () => { fetchMyBookings(); fetchMyPayments(); };

    useEffect(() => { return () => { if (pollRef.current) clearInterval(pollRef.current); }; }, []);

    const getPayment = (bookingId) => payments.find(p => p.booking_id === bookingId);

    const viewReceipt = async (payment) => {
        setReceiptLoading(true);
        try {
            const { data } = await api.get(`/operations/payments/${payment.id}/receipt`);
            setReceipt(data);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Could not load this payment receipt');
        } finally {
            setReceiptLoading(false);
        }
    };

    const printReceipt = () => {
        if (!receipt) return;
        const printWindow = window.open('', '_blank');
        if (!printWindow) return toast.error('Allow pop-ups to print your receipt');
        const document = printWindow.document;
        document.title = `Payment receipt ${receipt.id}`;
        const style = document.createElement('style');
        style.textContent = 'body{font:16px Arial,sans-serif;max-width:680px;margin:40px auto;color:#222}h1{color:#1a237e}p{padding:10px 0;border-bottom:1px solid #ddd}';
        document.head.append(style);
        const heading = document.createElement('h1');
        heading.textContent = 'Zetech Hostel — Payment Receipt';
        document.body.append(heading);
        [
            ['Receipt number', receipt.id],
            ['Student', receipt.full_name],
            ['Registration number', receipt.reg_no],
            ['Amount', `KES ${Number(receipt.amount).toLocaleString()}`],
            ['Payment method', formatPaymentMethod(receipt.payment_method)],
            ['M-Pesa code', receipt.mpesa_code || '—'],
            ['Status', receipt.status],
            ['Date', receipt.payment_date ? new Date(receipt.payment_date).toLocaleString() : '—'],
            ['Hostel / room', `${formatHostelName(receipt.hostel)} ${formatRoomNumber(receipt.room_number)}`],
            ['Semester', receipt.semester],
        ].forEach(([label, value]) => {
            const row = document.createElement('p');
            row.textContent = `${label}: ${value ?? '—'}`;
            document.body.append(row);
        });
        printWindow.focus();
        printWindow.print();
    };

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

    // Manual M-Pesa payment using the provider transaction code.
    const handleManualPay = async () => {
        if (!payForm.amount || Number(payForm.amount) < 12000) return toast.error('Minimum payment is KES 12,000 (deposit)');
        if (!payForm.mpesa_code.trim()) return toast.error('Enter M-Pesa code');
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
                                        <TableCell>{formatRoomNumber(b.room_number)}</TableCell>
                                        <TableCell>{formatHostelName(b.hostel)}</TableCell>
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
                                                        onClick={() => { setSelectedBooking(b); setPayForm({ amount: b.price, payment_method: 'mpesa', mpesa_code: '' }); setPayOpen(true); }}>
                                                        Paybill
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

            <Paper sx={{ p: 2, mt: 3 }}>
                <Typography variant="h6" gutterBottom>Payment history & receipts</Typography>
                {!payments.length ? (
                    <Typography color="text.secondary">No payment records yet.</Typography>
                ) : (
                    <TableContainer sx={{ overflowX: 'auto' }}>
                        <Table size="small">
                            <TableHead><TableRow>{['Date', 'Room', 'Amount', 'Method', 'Status', 'Receipt'].map((label) => <TableCell key={label}>{label}</TableCell>)}</TableRow></TableHead>
                            <TableBody>{payments.map((payment) => (
                                <TableRow key={payment.id}>
                                    <TableCell>{formatDate(payment.payment_date)}</TableCell>
                                    <TableCell>{formatHostelName(payment.hostel)} {formatRoomNumber(payment.room_number)}</TableCell>
                                    <TableCell>KES {Number(payment.amount).toLocaleString()}</TableCell>
                                    <TableCell>{formatPaymentMethod(payment.payment_method)}</TableCell>
                                    <TableCell><Chip size="small" label={payment.status === 'confirmed' ? 'Paid' : 'Pending'} color={payment.status === 'confirmed' ? 'success' : 'warning'} /></TableCell>
                                    <TableCell>{payment.status === 'confirmed' && <Button size="small" startIcon={<ReceiptLong />} onClick={() => viewReceipt(payment)} disabled={receiptLoading}>View receipt</Button>}</TableCell>
                                </TableRow>
                            ))}</TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Paper>

            {/* M-Pesa STK Push Dialog */}
            <MpesaDialog open={mpesaOpen} onClose={() => setMpesaOpen(false)} booking={selectedBooking} phone={phone} setPhone={setPhone} onPay={handleMpesaPay} submitting={submitting} />

            {/* Manual Payment Dialog */}
            <Dialog open={payOpen} onClose={() => setPayOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Manual Payment — Room {formatRoomNumber(selectedBooking?.room_number)}</DialogTitle>
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                    <Alert severity="info">
                        Pay via M-Pesa: go to Lipa na M-Pesa → Paybill. Business number: <strong>{SCHOOL_PAYBILL}</strong>.
                        Account number: <strong>{user?.reg_no || 'Your admission/registration number'}</strong>.
                        Pay the amount below, then enter the M-Pesa confirmation code. Payment remains pending until staff verify it.
                    </Alert>
                    <TextField label="Amount (KES)" type="number" value={payForm.amount}
                        onChange={e => setPayForm({ ...payForm, amount: e.target.value })} />
                    <TextField label="M-Pesa Transaction Code" value={payForm.mpesa_code}
                        onChange={e => setPayForm({ ...payForm, mpesa_code: e.target.value })} />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPayOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleManualPay} disabled={submitting}>
                        {submitting ? 'Submitting...' : 'Submit Payment'}
                    </Button>
                </DialogActions>
            </Dialog>
            <Dialog open={Boolean(receipt)} onClose={() => setReceipt(null)} maxWidth="sm" fullWidth>
                <DialogTitle>Payment receipt</DialogTitle>
                <DialogContent dividers>
                    {receipt && <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                        <Typography><strong>Receipt:</strong> {receipt.id}</Typography>
                        <Typography><strong>Status:</strong> {receipt.status}</Typography>
                        <Typography><strong>Student:</strong> {receipt.full_name}</Typography>
                        <Typography><strong>Reg. no.:</strong> {receipt.reg_no}</Typography>
                        <Typography><strong>Amount:</strong> KES {Number(receipt.amount).toLocaleString()}</Typography>
                        <Typography><strong>Method:</strong> {formatPaymentMethod(receipt.payment_method)}</Typography>
                        <Typography><strong>M-Pesa code:</strong> {receipt.mpesa_code || '—'}</Typography>
                        <Typography><strong>Room:</strong> {formatHostelName(receipt.hostel)} {formatRoomNumber(receipt.room_number)}</Typography>
                        <Typography><strong>Date:</strong> {receipt.payment_date ? new Date(receipt.payment_date).toLocaleString() : '—'}</Typography>
                        <Typography><strong>Semester:</strong> {receipt.semester || '—'}</Typography>
                    </Box>}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setReceipt(null)}>Close</Button>
                    <Button variant="contained" startIcon={<ReceiptLong />} onClick={printReceipt}>Print receipt</Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
