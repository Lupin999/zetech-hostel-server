import { Typography, Card, CardContent, Box, Chip } from '@mui/material';
import { Campaign } from '@mui/icons-material';
import useNotices from '../hooks/useNotices';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import { formatDate } from '../utils/helpers';
import titleImg from '../title.jpg';

export default function Notices() {
    const { notices, loading } = useNotices();

    if (loading) return <LoadingSpinner />;

    return (
        <>
            <Box sx={{
                position: 'relative', borderRadius: 3, overflow: 'hidden', mb: 4,
                height: { xs: 140, md: 200 }, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
                <Box sx={{ position: 'absolute', inset: 0, backgroundImage: `url(${titleImg})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(26,35,126,0.8), rgba(0,0,0,0.6))' }} />
                <Box sx={{ position: 'relative', zIndex: 1, textAlign: 'center', color: '#fff', px: 2 }}>
                    <Typography variant="h4" fontWeight={700}>Campus Notices</Typography>
                    <Typography variant="body1" sx={{ opacity: 0.9, mt: 1 }}>Stay updated with the latest announcements</Typography>
                </Box>
            </Box>

            {!notices.length ? (
                <EmptyState icon={<Campaign sx={{ fontSize: 80 }} />} title="No notices yet" />
            ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {notices.map(n => (
                        <Card key={n.id}>
                            <CardContent>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, flexWrap: 'wrap', gap: 1 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Typography variant="h6">{n.title}</Typography>
                                        {n.target && n.target !== 'all' && (
                                            <Chip label={n.target === 'boys' ? '🏠 Boys' : '🏠 Girls'}
                                                size="small" color={n.target === 'boys' ? 'primary' : 'secondary'}
                                                sx={{ height: 22, fontSize: '0.7rem' }} />
                                        )}
                                    </Box>
                                    <Chip label={formatDate(n.created_at)} size="small" variant="outlined" />
                                </Box>
                                <Typography color="text.secondary" sx={{ mb: 1 }}>{n.message}</Typography>
                                <Typography variant="caption" color="text.disabled">Posted by {n.author}</Typography>
                            </CardContent>
                        </Card>
                    ))}
                </Box>
            )}
        </>
    );
}
