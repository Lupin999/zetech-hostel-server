import { useState, useEffect, useCallback } from 'react';
import paymentService from '../services/paymentService';

export default function usePayments({ fetchAll = false } = {}) {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchMyPayments = useCallback(async () => {
        setLoading(true);
        try {
            const res = await paymentService.getMyPayments();
            setPayments(res.data);
            setError(null);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load payments');
        } finally { setLoading(false); }
    }, []);

    const fetchAllPayments = useCallback(async () => {
        setLoading(true);
        try {
            const res = await paymentService.getAllPayments();
            setPayments(res.data);
            setError(null);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load payments');
        } finally { setLoading(false); }
    }, []);

    const submit = useCallback(async (data) => {
        const res = await paymentService.submitPayment(data);
        return res.data;
    }, []);

    const initStkPush = useCallback(async (phone, bookingId) => {
        const res = await paymentService.stkPush(phone, bookingId);
        return res.data;
    }, []);

    const queryStkStatus = useCallback(async (checkoutRequestId) => {
        const res = await paymentService.stkQuery(checkoutRequestId);
        return res.data;
    }, []);

    const confirm = useCallback(async (id) => {
        const res = await paymentService.confirmPayment(id);
        return res.data;
    }, []);

    useEffect(() => {
        if (fetchAll) fetchAllPayments();
        else fetchMyPayments();
    }, [fetchAll, fetchAllPayments, fetchMyPayments]);

    return { payments, loading, error, fetchMyPayments, fetchAllPayments, submit, initStkPush, queryStkStatus, confirm };
}
