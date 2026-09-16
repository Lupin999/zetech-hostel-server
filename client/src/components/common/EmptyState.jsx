import { Box, Typography } from '@mui/material';

export default function EmptyState({ icon, title, subtitle }) {
    return (
        <Box sx={{ textAlign: 'center', mt: 8, color: 'text.secondary' }}>
            {icon && <Box sx={{ fontSize: 80, mb: 2, opacity: 0.4 }}>{icon}</Box>}
            <Typography variant="h6">{title}</Typography>
            {subtitle && <Typography>{subtitle}</Typography>}
        </Box>
    );
}
