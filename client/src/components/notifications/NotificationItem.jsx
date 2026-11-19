import { useState } from 'react';
import {
    ListItem, Typography, Box, Chip, Collapse, IconButton, Dialog,
    DialogTitle, DialogContent, DialogActions, Button
} from '@mui/material';
import { ExpandMore, ExpandLess, OpenInFull } from '@mui/icons-material';
import { timeAgo } from '../../utils/helpers';

export default function NotificationItem({ notification }) {
    const [expanded, setExpanded] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);

    const isLong = notification.message?.length > 80;

    return (
        <>
            <ListItem
                onClick={() => isLong ? setExpanded(e => !e) : setDialogOpen(true)}
                sx={{
                    borderBottom: '1px solid', borderColor: 'divider',
                    py: 1.5, px: 2,
                    flexDirection: 'column', alignItems: 'flex-start',
                    cursor: 'pointer',
                    bgcolor: notification.is_read ? 'transparent' : 'rgba(255,215,0,0.04)',
                    '&:hover': { bgcolor: 'action.hover' },
                    transition: 'background 0.2s',
                }}
            >
                <Box sx={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                    <Typography
                        variant="body2"
                        sx={{
                            fontWeight: notification.is_read ? 400 : 600,
                            flex: 1,
                            // Show first 80 chars with ellipsis when collapsed
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
                        <IconButton size="small" sx={{ p: 0.3 }} onClick={e => { e.stopPropagation(); setDialogOpen(true); }}>
                            <OpenInFull fontSize="small" />
                        </IconButton>
                    </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, mt: 0.5, alignItems: 'center' }}>
                    <Typography variant="caption" color="text.disabled">{timeAgo(notification.created_at)}</Typography>
                    {!notification.is_read && (
                        <Chip label="New" size="small" color="warning" variant="outlined" sx={{ height: 18, fontSize: '0.6rem' }} />
                    )}
                </Box>
            </ListItem>

            {/* Full message dialog */}
            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ pb: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="h6" fontWeight={700}>Notification</Typography>
                        <Typography variant="caption" color="text.secondary">{timeAgo(notification.created_at)}</Typography>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body1" sx={{ lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
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
