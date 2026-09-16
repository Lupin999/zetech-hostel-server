import { Dialog, DialogTitle, DialogContent, DialogActions, Typography, TextField, Button } from '@mui/material';
import { PhoneAndroid } from '@mui/icons-material';
import { formatCurrency } from '../../utils/helpers';

export default function MpesaDialog({ open, onClose, booking, phone, setPhone, onPay, submitting }) {
    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PhoneAndroid color="success" /> Pay via M-Pesa
            </DialogTitle>
            <DialogContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Room {booking?.room_number} • Booking Fee: {booking ? formatCurrency(booking.price) : formatCurrency(30000)} • Min Deposit: KES 12,000
                </Typography>
                <TextField placeholder="Phone Number (07XXXXXXXX)" fullWidth
                    value={phone} onChange={e => setPhone(e.target.value)}
                    sx={{ '& input': { color: 'text.primary' } }} />
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
