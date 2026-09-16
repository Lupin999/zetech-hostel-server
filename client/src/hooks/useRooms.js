import { useState, useEffect, useCallback } from 'react';
import roomService from '../services/roomService';

export default function useRooms() {
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchRooms = useCallback(async () => {
        setLoading(true);
        try {
            const res = await roomService.getAllRooms();
            setRooms(res.data);
            setError(null);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load rooms');
        } finally { setLoading(false); }
    }, []);

    const fetchBeds = useCallback(async (roomId) => {
        const res = await roomService.getRoomBeds(roomId);
        return res.data;
    }, []);

    useEffect(() => { fetchRooms(); }, [fetchRooms]);

    return { rooms, loading, error, fetchRooms, fetchBeds };
}
