import { Drawer, Box, Typography, Button, Divider, List } from '@mui/material';
import NotificationItem from './NotificationItem';

export default function NotificationDrawer({ open, onClose, notifications, unreadCount, onMarkAllRead }) {
    return (
        <Drawer anchor="right" open={open} onClose={onClose}>
            <Box sx={{ width: { xs: 300, md: 360 }, pt: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2, pb: 2 }}>
                    <Typography variant="h6" fontWeight={700}>Notifications</Typography>
                    {unreadCount > 0 && (
                        <Button size="small" onClick={onMarkAllRead}>Mark All Read</Button>
                    )}
                </Box>
                <Divider />
                {!notifications.length ? (
                    <Typography sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>No notifications</Typography>
                ) : (
                    <List disablePadding>
                        {notifications.map(n => (
                            <NotificationItem key={n.id} notification={n} />
                        ))}
                    </List>
                )}
            </Box>
        </Drawer>
    );
}
