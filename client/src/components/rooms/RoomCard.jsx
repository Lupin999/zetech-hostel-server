import { Card, CardContent, Box, Typography, Chip, Button } from '@mui/material';
import { SingleBed } from '@mui/icons-material';
import { motion } from 'framer-motion';
import { formatCurrency } from '../../utils/helpers';

export default function RoomCard({ room, onSelectBed }) {
    const available = room.status === 'available' && room.occupied < room.capacity;

    return (
        <motion.div whileHover={{ scale: 1.03, y: -4 }} transition={{ duration: 0.2 }}>
            <Card sx={{ border: '2px solid transparent', transition: 'border-color 0.3s, box-shadow 0.3s', '&:hover': { borderColor: '#FFD700', boxShadow: '0 4px 24px rgba(255,215,0,0.25)' } }}>
                <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                        <Box>
                            <Typography variant="h6" fontWeight={700}>Room {room.room_number}</Typography>
                            <Typography variant="caption" color="text.secondary">{room.hostel} • {room.room_type}</Typography>
                        </Box>
                        <Chip label={formatCurrency(room.price)} color="secondary" size="small" />
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.8, mb: 1.5 }}>
                        {[...Array(room.capacity)].map((_, i) => (
                            <Box key={i} sx={{ width: 28, height: 28, borderRadius: 1, bgcolor: i < room.occupied ? '#e53935' : '#43a047', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <SingleBed sx={{ fontSize: 16, color: '#fff' }} />
                            </Box>
                        ))}
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>{room.capacity - room.occupied} of {room.capacity} beds free</Typography>
                    {available ? (
                        <Button variant="contained" fullWidth size="small" onClick={() => onSelectBed(room)}>Select Bed</Button>
                    ) : (
                        <Chip label="Full" color="error" size="small" sx={{ width: '100%' }} />
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
}
