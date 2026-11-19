import { useState } from 'react';
import {
    ListItem, Typography, Box, Chip, IconButton, Dialog,
    DialogTitle, DialogContent, DialogActions, Button
} from '@mui/material';
import { ExpandMore, ExpandLess, OpenInFull } from '@mui/icons-material';
import { timeAgo } from '../../utils/helpers';
import api from '../../utils/api';

export default function NotificationItem({ notification, onRead }) {
    const [expanded, setExpanded] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [isRead, setIsRead] = useState(!!notification.is_read);

    const isLong = notification.message?.length > 80;

    const openDialog = async (e) => {
        e?.stopPropagation();
        setDialogOpen(true);
        // Mark as read immediately if not already
        if (!isRead) {
            setIsRead(true); // optimistic update
            api.patch(`/notifications/${notification.id}/read`).catch(() => {});
            onRead?.(notification.id); // tell parent to update badge count
        }
    };

    return (
        <>
            <ListItem
                onClick={openDialog}
                sx={{
                    borderBottom: '1px solid', borderColor: 'divider',
                    py: 1.5, px: 2,
                    flexDirection: 'column', alignItems: 'flex-start',
                    cursor: 'pointer',
                    bgcolor: isRead ? 'transparent' : 'rgba(255,215,0,0.05)',
                    '&:hover': { bgcolor: 'action.hover' },
                    transition: 'background 0.2s',
                }}
            >
                <Box sx={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                    <Typography
                        variant="body2"
                        sx={{
                            fontWeight: isRead ? 400 : 600,
                            flex: 1,
                            overflow: 'hidden',
                            display: '-webkit-box',
                            WebkitLineClamp: expanded ? 'unset' : 2,
                            WebkitBoxOrient: 'vertical',
                        }}
                    >
                        {notification.message}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                        {isLong && (
                            <IconButton size="small" sx={{ p: 0.3 }} onClick={e => { e.stopPropagation(); setExpanded(v => !v); }}>
                                {expanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                            </IconButton>
                        )}
                        <IconButton size="small" sx={{ p: 0.3 }} onClick={openDialog}>
                            <OpenInFull fontSize="small" />
                        </IconButton>
                    </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, mt: 0.5, alignItems: 'center' }}>
                    <Typography variant="caption" color="text.disabled">{timeAgo(notification.created_at)}</Typography>
                    {!isRead && (
                        <Chip label="New" size="small" color="warning" variant="outlined" sx={{ height: 18, fontSize: '0.6rem' }} />
                    )}
                </Box>
            </ListItem>

            {/* Full message dialog — opens on click, marks as read automatically */}
            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ pb: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="h6" fontWeight={700}>Notification</Typography>
                        <Typography variant="caption" color="text.secondary">{timeAgo(notification.created_at)}</Typography>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body1" sx={{ lineHeight: 1.9, whiteSpace: 'pre-wrap', fontSize: '1rem' }}>
                        {notification.message}
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDialogOpen(false)}>Close</Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
