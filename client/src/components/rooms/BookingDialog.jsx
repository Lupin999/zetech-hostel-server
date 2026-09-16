import { Dialog, DialogTitle, DialogContent, DialogActions, Box, Chip, Alert, TextField, Button, CircularProgress, Typography } from '@mui/material';
import { Payment } from '@mui/icons-material';
import BedSelector from './BedSelector';
import { formatCurrency, getMinDate } from '../../utils/helpers';
import { MIN_DEPOSIT } from '../../utils/constants';

export default function BookingDialog({ open, onClose, room, beds, loadingBeds, bedFilter, setBedFilter, selectedBed, setSelectedBed, arrivalDate, setArrivalDate, onBook, submitting }) {
    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ pb: 1 }}>Room {room?.room_number} — Select Your Bed</DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
                    <Chip label={room?.hostel} size="small" />
                    <Chip label={room?.room_type} size="small" />
                    <Chip label={room ? formatCurrency(room.price) : ''} color="secondary" size="small" />
                </Box>

                <Alert severity="info" icon={<Payment />} sx={{ mb: 2, '& .MuiAlert-message': { width: '100%' } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}>
                        <Typography variant="body2">Booking Fee: <b>{room ? formatCurrency(room.price) : formatCurrency(30000)}</b></Typography>
                        <Chip label={`Min Deposit: ${formatCurrency(MIN_DEPOSIT)}`} size="small" color="warning" />
                    </Box>
                </Alert>

                {loadingBeds ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress /></Box>
                ) : (
                    <BedSelector beds={beds} bedFilter={bedFilter} setBedFilter={setBedFilter} selectedBed={selectedBed} setSelectedBed={setSelectedBed} />
                )}

                <TextField label="Arrival Date" type="date" fullWidth InputLabelProps={{ shrink: true }}
                    value={arrivalDate} onChange={e => setArrivalDate(e.target.value)}
                    inputProps={{ min: getMinDate() }}
                    sx={{ mb: 1 }} />

                {selectedBed && (
                    <Alert severity="success" sx={{ mt: 1.5 }}>
                        <Typography variant="body2">
                            <b>Bed {selectedBed.bed_number}</b> ({selectedBed.position} bed) in <b>Room {room?.room_number}</b> — {room?.hostel} Hostel
                        </Typography>
                    </Alert>
                )}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={onClose}>Cancel</Button>
                <Button variant="contained" onClick={onBook} disabled={submitting || !selectedBed || !arrivalDate}
                    sx={{ minWidth: 160 }}>
                    {submitting ? 'Booking...' : `Book — Deposit ${formatCurrency(MIN_DEPOSIT)}`}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
