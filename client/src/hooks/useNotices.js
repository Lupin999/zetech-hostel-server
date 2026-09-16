import { useState, useEffect, useCallback } from 'react';
import noticeService from '../services/noticeService';

export default function useNotices() {
    const [notices, setNotices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchNotices = useCallback(async () => {
        setLoading(true);
        try {
            const res = await noticeService.getAllNotices();
            setNotices(res.data);
            setError(null);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load notices');
        } finally { setLoading(false); }
    }, []);

    const create = useCallback(async (title, message) => {
        const res = await noticeService.createNotice(title, message);
        await fetchNotices();
        return res.data;
    }, [fetchNotices]);

    const remove = useCallback(async (id) => {
        const res = await noticeService.deleteNotice(id);
        setNotices(prev => prev.filter(n => n.id !== id));
        return res.data;
    }, []);

    useEffect(() => { fetchNotices(); }, [fetchNotices]);

    return { notices, loading, error, fetchNotices, create, remove };
}
