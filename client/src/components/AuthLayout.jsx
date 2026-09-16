import { Box, Typography, useMediaQuery, useTheme } from '@mui/material';
import { Apartment } from '@mui/icons-material';
import headImg from '../head.jpg';

export default function AuthLayout({ children }) {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh' }}>
            {!isMobile && (
                <Box sx={{
                    width: '45%', position: 'relative', overflow: 'hidden',
                    display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
                    color: 'white', p: 6,
                }}>
                    <Box sx={{
                        position: 'absolute', inset: 0,
                        backgroundImage: `url(${headImg})`,
                        backgroundSize: 'cover', backgroundPosition: 'center',
                    }} />
                    <Box sx={{
                        position: 'absolute', inset: 0,
                        background: 'linear-gradient(135deg, rgba(26,35,126,0.85) 0%, rgba(83,75,174,0.8) 100%)',
                    }} />
                    <Box sx={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
                        <Apartment sx={{ fontSize: 100, mb: 3, opacity: 0.9 }} />
                        <Typography variant="h3" fontWeight={700} gutterBottom>Zetech Hostel</Typography>
                        <Typography variant="h6" sx={{ opacity: 0.85, maxWidth: 360 }}>
                            Your home away from home. Book your room, manage your stay.
                        </Typography>
                    </Box>
                </Box>
            )}
            <Box sx={{
                flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center',
                bgcolor: '#f0f4ff', p: { xs: 2, md: 4 },
            }}>
                {children}
            </Box>
        </Box>
    );
}
