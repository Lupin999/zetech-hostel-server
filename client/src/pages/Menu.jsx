import { Typography, Paper, Box, Grid, CardMedia } from '@mui/material';
import { FreeBreakfast, DinnerDining, Star } from '@mui/icons-material';
import { motion } from 'framer-motion';
import titleImg from '../title.jpg';
import { getTodayName } from '../utils/helpers';
import { ASSETS_URL } from '../utils/constants';

const menu = [
    { day: 'Monday', breakfast: { food: 'Bread & Tea', image: `${ASSETS_URL}/bread.jpg` }, supper: { food: 'Monday Special', image: `${ASSETS_URL}/monday.jpg` } },
    { day: 'Tuesday', breakfast: { food: 'Bread & Tea', image: `${ASSETS_URL}/bread.jpg` }, supper: { food: 'Cabbage & Ugali', image: `${ASSETS_URL}/cabba.jpg` } },
    { day: 'Wednesday', breakfast: { food: 'Bread & Tea', image: `${ASSETS_URL}/bread.jpg` }, supper: { food: 'Rice & Stew', image: `${ASSETS_URL}/rice.jpg` } },
    { day: 'Thursday', breakfast: { food: 'Bread & Tea', image: `${ASSETS_URL}/bread.jpg` }, supper: { food: 'Ugali & Sukuma', image: `${ASSETS_URL}/ugali.jpg` } },
    { day: 'Friday', breakfast: { food: 'Bread & Tea', image: `${ASSETS_URL}/bread.jpg` }, supper: { food: 'Rice & Beans', image: `${ASSETS_URL}/rice.jpg` } },
    { day: 'Saturday', breakfast: { food: 'Bread & Tea', image: `${ASSETS_URL}/bread.jpg` }, supper: { food: 'Chapati & Stew', image: `${ASSETS_URL}/chap.jpg` } },
    { day: 'Sunday', breakfast: { food: 'Bread & Tea', image: `${ASSETS_URL}/bread.jpg` }, supper: { food: 'Pilau', image: `${ASSETS_URL}/rice.jpg` } },
];

const todayName = getTodayName();

export default function Menu() {
    return (
        <>
            {/* Hero Banner */}
            <Box sx={{ position: 'relative', borderRadius: 3, overflow: 'hidden', mb: 4, height: { xs: 180, md: 260 }, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Box sx={{ position: 'absolute', inset: 0, backgroundImage: `url(${titleImg})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(13,27,42,0.88), rgba(26,35,126,0.75))' }} />
                <Box sx={{ position: 'relative', zIndex: 1, textAlign: 'center', color: '#fff', px: 2 }}>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                        <Typography variant="h6" sx={{ color: '#FFD700', letterSpacing: 3, fontWeight: 600, mb: 1 }}>🍽️ ZETECH HOSTEL</Typography>
                        <Typography variant="h3" fontWeight={700} sx={{ mb: 1 }}>Weekly Meal Schedule</Typography>
                        <Typography variant="body1" sx={{ opacity: 0.85 }}>Breakfast 6:00–7:00 AM &nbsp;•&nbsp; Supper 7:00–8:00 PM</Typography>
                    </motion.div>
                </Box>
            </Box>

            <Grid container spacing={3}>
                {menu.map(({ day, breakfast, supper }, i) => {
                    const isToday = day === todayName;
                    return (
                        <Grid size={{ xs: 12, sm: 6, md: 4 }} key={day}>
                            <motion.div
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4, delay: i * 0.06 }}
                                whileHover={{ y: -8, boxShadow: '0 8px 32px rgba(255,215,0,0.25)' }}
                            >
                                <Paper sx={{
                                    overflow: 'hidden', position: 'relative', borderRadius: 3,
                                    border: isToday ? '2px solid #FFD700' : '1px solid transparent',
                                    boxShadow: isToday ? '0 0 24px rgba(255,215,0,0.35)' : undefined,
                                    transition: 'border-color 0.3s, box-shadow 0.3s',
                                    '&:hover': { borderColor: '#FFD700', boxShadow: '0 8px 32px rgba(255,215,0,0.25)' },
                                }}>
                                    {/* Today Ribbon */}
                                    {isToday && (
                                        <Box sx={{
                                            position: 'absolute', top: 16, left: -35, zIndex: 3,
                                            bgcolor: '#FFD700', color: '#000', fontWeight: 800, fontSize: '0.7rem',
                                            py: 0.5, width: 140, textAlign: 'center',
                                            transform: 'rotate(-45deg)', letterSpacing: 1,
                                            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                                        }}>
                                            <Star sx={{ fontSize: 12, verticalAlign: 'middle', mr: 0.3 }} />
                                            TODAY
                                        </Box>
                                    )}

                                    {/* Supper Hero Image */}
                                    <Box sx={{ overflow: 'hidden' }}>
                                        <CardMedia component="img" image={supper.image} alt={supper.food}
                                            sx={{ height: 200, objectFit: 'cover', transition: 'transform 0.4s ease', '&:hover': { transform: 'scale(1.08)' } }} />
                                    </Box>

                                    <Box sx={{ p: 2.5 }}>
                                        <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>{day}</Typography>

                                        {/* Breakfast Row */}
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5, p: 1.5, borderRadius: 2, bgcolor: 'rgba(251,140,0,0.06)', border: '1px solid rgba(251,140,0,0.12)' }}>
                                            <Box component="img" src={breakfast.image} alt={breakfast.food}
                                                sx={{ width: 52, height: 52, borderRadius: 1.5, objectFit: 'cover', flexShrink: 0 }} />
                                            <Box>
                                                <Typography variant="body2" fontWeight={700}>{breakfast.food}</Typography>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.3 }}>
                                                    <FreeBreakfast sx={{ color: '#fb8c00', fontSize: 15 }} />
                                                    <Typography variant="caption" color="text.secondary">Breakfast • 6–7 AM</Typography>
                                                </Box>
                                            </Box>
                                        </Box>

                                        {/* Supper Row */}
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1.5, borderRadius: 2, bgcolor: 'rgba(26,35,126,0.06)', border: '1px solid rgba(26,35,126,0.12)' }}>
                                            <Box component="img" src={supper.image} alt={supper.food}
                                                sx={{ width: 52, height: 52, borderRadius: 1.5, objectFit: 'cover', flexShrink: 0 }} />
                                            <Box>
                                                <Typography variant="body2" fontWeight={700}>{supper.food}</Typography>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.3 }}>
                                                    <DinnerDining sx={{ color: '#1a237e', fontSize: 15 }} />
                                                    <Typography variant="caption" color="text.secondary">Supper • 7–8 PM</Typography>
                                                </Box>
                                            </Box>
                                        </Box>
                                    </Box>
                                </Paper>
                            </motion.div>
                        </Grid>
                    );
                })}
            </Grid>
        </>
    );
}
