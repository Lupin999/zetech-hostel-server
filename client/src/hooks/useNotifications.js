import { useState, useEffect, useCallback } from 'react';
import notificationService from '../services/notificationService';

export default function useNotifications() {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchNotifications = useCallback(async () => {
        setLoading(true);
        try {
            const res = await notificationService.getNotifications();
            setNotifications(res.data);
            setUnreadCount(res.data.filter(n => !n.is_read).length);
            setError(null);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load notifications');
        } finally { setLoading(false); }
    }, []);

    const markAllRead = useCallback(async () => {
        await notificationService.markAllRead();
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);
    }, []);

    useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

    return { notifications, unreadCount, loading, error, fetchNotifications, markAllRead };
}
