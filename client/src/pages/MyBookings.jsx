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
import { formatDate, formatHostelName, formatPaymentMethod, formatRoomNumber, isSuspended } from '../utils/helpers';
import { useAuth } from '../context/AuthContext';
import { MIN_DEPOSIT } from '../utils/constants';
import api from '../utils/api';
import logoImg from '../d.jpg';


export default function MyBookings() {
    const { user } = useAuth();
    const { bookings, loading: bLoading, fetchMyBookings } = useBookings();
    const { payments, loading: pLoading, fetchMyPayments, initStkPush, queryStkStatus } = usePayments();
    const loading = bLoading || pLoading;
    const [mpesaOpen, setMpesaOpen] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [phone, setPhone] = useState(user?.phone || '');
    const [submitting, setSubmitting] = useState(false);
    const [polling, setPolling] = useState(false);
    const [receipt, setReceipt] = useState(null);
    const [receiptLoading, setReceiptLoading] = useState(false);
    const pollRef = useRef(null);

    const fetchData = () => { fetchMyBookings(); fetchMyPayments(); };

    useEffect(() => { setPhone(user?.phone || ''); }, [user?.phone]);
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
        style.textContent = `
            *{box-sizing:border-box}body{font:15px Arial,sans-serif;max-width:720px;margin:32px auto;padding:0 20px;color:#1f2937}
            .receipt{border:1px solid #dbe3f0;border-radius:18px;overflow:hidden;box-shadow:0 12px 35px #0f172a18}
            header{background:#1a237e;color:#fff;padding:26px 30px;display:flex;align-items:center;gap:18px}
            header img{width:62px;height:62px;object-fit:contain;background:#fff;border-radius:12px;padding:4px}
            h1{font-size:22px;margin:0 0 6px}header p{border:0;margin:0;color:#e0e7ff;padding:0}
            .details{padding:24px 30px;display:grid;grid-template-columns:1fr 1fr;gap:0 22px}
            .details p{padding:12px 0;margin:0;border-bottom:1px solid #e5e7eb}
            .policy{margin:0;padding:16px 30px;background:#f8fafc;color:#475569;font-size:13px}
            footer{padding:16px 30px;color:#64748b;font-size:12px}
            @media print{body{margin:0;padding:0}.receipt{box-shadow:none}}
        `;
        document.head.append(style);
        const receiptCard = document.createElement('main');
        receiptCard.className = 'receipt';
        const header = document.createElement('header');
        const logo = document.createElement('img');
        logo.src = new URL(logoImg, window.location.href).href;
        logo.alt = 'Zetech University';
        const title = document.createElement('div');
        const heading = document.createElement('h1');
        heading.textContent = 'Payment receipt';
        const subheading = document.createElement('p');
        subheading.textContent = 'Zetech University Hostel';
        title.append(heading, subheading);
        header.append(logo, title);
        const details = document.createElement('section');
        details.className = 'details';
        [
            ['Receipt no.', receipt.id],
            ['Payment status', receipt.status],
            ['Student', receipt.full_name],
            ['Registration no.', receipt.reg_no],
            ['Amount received', `KES ${Number(receipt.amount).toLocaleString()}`],
            ['Payment method', formatPaymentMethod(receipt.payment_method)],
            ['Safaricom receipt', receipt.mpesa_code || '—'],
            ['Payment date', receipt.payment_date ? new Date(receipt.payment_date).toLocaleString() : '—'],
            ['Hostel / room', `${formatHostelName(receipt.hostel)} ${formatRoomNumber(receipt.room_number)}`],
            ['Semester / period', receipt.semester || '—'],
        ].forEach(([label, value]) => {
            const row = document.createElement('p');
            row.textContent = `${label}: ${value ?? '—'}`;
            details.append(row);
        });
        const policy = document.createElement('p');
        policy.className = 'policy';
        policy.textContent = 'This payment is credited toward hostel fees. Hostel payments are non-refundable.';
        const footer = document.createElement('footer');
        footer.textContent = 'Keep this receipt for your records. Payment status is verified through M-Pesa.';
        receiptCard.append(header, details, policy, footer);
        document.body.append(receiptCard);
        printWindow.focus();
        printWindow.print();
    };

    // M-Pesa STK Push flow
    const handleMpesaPay = async () => {
        if (submitting) return;
        if (!phone.trim()) return toast.error('Enter the phone number registered to your account');
        setSubmitting(true);
        try {
            const stkRes = await initStkPush(phone, selectedBooking.id);
            const checkoutId = stkRes.checkoutRequestId;
            setMpesaOpen(false);
            setPhone('');

            toast(`Check your phone and enter your M-Pesa PIN to pay KES ${MIN_DEPOSIT.toLocaleString()}.`);

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
            setMpesaOpen(false);
            toast.error(err.response?.data?.error || 'Could not initiate payment');
        } finally { setSubmitting(false); }
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
                                            {isSuspended(b.suspended) ? (
                                                <Chip label="🚫 Suspended" color="error" size="small" />
                                            ) : payment ? (
                                                <Chip label={payment.status === 'confirmed' ? 'Paid' : 'Pending'}
                                                    color={payment.status === 'confirmed' ? 'success' : 'warning'} size="small" variant="outlined" />
                                            ) : (
                                                b.status === 'approved' ? <Chip label="Unpaid" color="warning" size="small" variant="outlined" /> : '—'
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {b.status === 'approved' && !payment && !isSuspended(b.suspended) && (
                                                <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                    <Button size="small" variant="contained" color="success"
                                                        onClick={() => { setSelectedBooking(b); setMpesaOpen(true); }}>
                                                        Pay KES {MIN_DEPOSIT.toLocaleString()} deposit
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

            <Dialog open={Boolean(receipt)} onClose={() => setReceipt(null)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ px: 0, pt: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, bgcolor: 'primary.main', color: 'white', p: 2.5 }}>
                        <Box component="img" src={logoImg} alt="Zetech University" sx={{ width: 54, height: 54, objectFit: 'contain', borderRadius: 2, bgcolor: 'white', p: 0.5 }} />
                        <Box>
                            <Typography variant="h6" fontWeight={700}>Payment receipt</Typography>
                            <Typography variant="body2">Zetech University Hostel</Typography>
                        </Box>
                    </Box>
                </DialogTitle>
                <DialogContent dividers sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
                    {receipt && [
                        ['Receipt no.', receipt.id],
                        ['Payment status', receipt.status],
                        ['Student', receipt.full_name],
                        ['Registration no.', receipt.reg_no],
                        ['Amount received', `KES ${Number(receipt.amount).toLocaleString()}`],
                        ['Method', formatPaymentMethod(receipt.payment_method)],
                        ['Safaricom receipt', receipt.mpesa_code || '—'],
                        ['Room', `${formatHostelName(receipt.hostel)} ${formatRoomNumber(receipt.room_number)}`],
                        ['Date', receipt.payment_date ? new Date(receipt.payment_date).toLocaleString() : '—'],
                        ['Semester / period', receipt.semester || '—'],
                    ].map(([label, value]) => <Box key={label}>
                        <Typography variant="caption" color="text.secondary">{label}</Typography>
                        <Typography>{value}</Typography>
                    </Box>)}
                    <Alert severity="info" sx={{ gridColumn: '1 / -1', mt: 1 }}>
                        This payment is credited toward hostel fees. Hostel payments are non-refundable.
                    </Alert>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setReceipt(null)}>Close</Button>
                    <Button variant="contained" startIcon={<ReceiptLong />} onClick={printReceipt}>Print receipt</Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
