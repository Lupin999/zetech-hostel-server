import { ListItem, Typography, Box, Chip } from '@mui/material';
import { timeAgo } from '../../utils/helpers';

export default function NotificationItem({ notification }) {
    return (
        <ListItem sx={{ borderBottom: '1px solid', borderColor: 'divider', py: 1.5, px: 2, flexDirection: 'column', alignItems: 'flex-start' }}>
            <Typography variant="body2">{notification.message}</Typography>
            <Box sx={{ display: 'flex', gap: 1, mt: 0.5, alignItems: 'center' }}>
                <Typography variant="caption" color="text.disabled">{timeAgo(notification.created_at)}</Typography>
                <Chip label={notification.is_read ? 'Read' : 'New'} size="small"
                    color={notification.is_read ? 'success' : 'warning'} variant="outlined"
                    sx={{ height: 20, fontSize: '0.65rem' }} />
            </Box>
        </ListItem>
    );
}
