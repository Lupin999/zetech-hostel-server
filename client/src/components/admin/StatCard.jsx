import { Paper, Box, Typography } from '@mui/material';

export default function StatCard({ icon, label, value, bgColor }) {
    return (
        <Paper sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ bgcolor: bgColor, borderRadius: 2, p: 1.5, display: 'flex' }}>{icon}</Box>
            <Box>
                <Typography variant="h4" fontWeight={700}>{value}</Typography>
                <Typography variant="body2" color="text.secondary">{label}</Typography>
            </Box>
        </Paper>
    );
}
