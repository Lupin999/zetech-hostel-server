import { useState, useEffect, useCallback } from 'react';
import bookingService from '../services/bookingService';

export default function useBookings({ fetchAll = false } = {}) {
    const [bookings, setBookings] = useState([]);
    const [activeBooking, setActiveBooking] = useState(null);
    const [bookingOpen, setBookingOpen] = useState(true);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchMyBookings = useCallback(async () => {
        setLoading(true);
        try {
            const res = await bookingService.getMyBookings();
            setBookings(res.data);
            setError(null);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load bookings');
        } finally { setLoading(false); }
    }, []);

    const fetchAllBookings = useCallback(async () => {
        setLoading(true);
        try {
            const res = await bookingService.getAllBookings();
            setBookings(res.data);
            setError(null);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load bookings');
        } finally { setLoading(false); }
    }, []);

    const fetchActive = useCallback(async () => {
        try {
            const res = await bookingService.getActiveBooking();
            setActiveBooking(res.data);
        } catch { setActiveBooking(null); }
    }, []);

    const fetchStatus = useCallback(async () => {
        try {
            const res = await bookingService.getBookingStatus();
            setBookingOpen(res.data.open);
        } catch { setBookingOpen(true); }
    }, []);

    const create = useCallback(async (data) => {
        const res = await bookingService.createBooking(data);
        return res.data;
    }, []);

    const approve = useCallback(async (id) => {
        const res = await bookingService.approveBooking(id);
        return res.data;
    }, []);

    const reject = useCallback(async (id) => {
        const res = await bookingService.rejectBooking(id);
        return res.data;
    }, []);

    const cancel = useCallback(async (id) => {
        const res = await bookingService.cancelBooking(id);
        return res.data;
    }, []);

    const toggle = useCallback(async (open) => {
        const res = await bookingService.toggleBookings(open);
        setBookingOpen(res.data.open);
        return res.data;
    }, []);

    useEffect(() => {
        if (fetchAll) fetchAllBookings();
        else fetchMyBookings();
        fetchActive();
        fetchStatus();
    }, [fetchAll, fetchAllBookings, fetchMyBookings, fetchActive, fetchStatus]);

    return { bookings, activeBooking, bookingOpen, loading, error, fetchMyBookings, fetchAllBookings, fetchActive, fetchStatus, create, approve, reject, cancel, toggle };
}
