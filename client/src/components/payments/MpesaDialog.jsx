import { Dialog, DialogTitle, DialogContent, DialogActions, Typography, TextField, Button } from '@mui/material';
import { PhoneAndroid } from '@mui/icons-material';
import { formatCurrency, formatRoomNumber } from '../../utils/helpers';
import { MIN_DEPOSIT } from '../../utils/constants';

export default function MpesaDialog({ open, onClose, booking, phone, setPhone, onPay, submitting }) {
    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PhoneAndroid color="success" /> Pay via M-Pesa
            </DialogTitle>
            <DialogContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Room {formatRoomNumber(booking?.room_number)} · Total hostel fee: {booking ? formatCurrency(booking.price) : '—'} · Deposit due now: {formatCurrency(MIN_DEPOSIT)}
                </Typography>
                <TextField placeholder="Phone Number (07XXXXXXXX)" type="tel" required fullWidth
                    value={phone} onChange={e => setPhone(e.target.value)}
                    helperText="A Safaricom M-Pesa prompt will be sent to this number."
                    sx={{ '& input': { color: 'text.primary' } }} />
                <Typography variant="caption" color="text.secondary">
                    The KES {MIN_DEPOSIT.toLocaleString()} deposit is credited to your hostel fees and is non-refundable.
                </Typography>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button variant="contained" color="success" onClick={onPay} disabled={submitting}>
                    {submitting ? 'Sending...' : 'Send STK Push'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
