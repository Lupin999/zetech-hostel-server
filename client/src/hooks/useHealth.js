import { useState, useEffect, useCallback } from 'react';
import healthService from '../services/healthService';

export default function useHealth() {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchProfile = useCallback(async () => {
        setLoading(true);
        try {
            const res = await healthService.getHealthProfile();
            setProfile(res.data);
            setError(null);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load health profile');
        } finally { setLoading(false); }
    }, []);

    const save = useCallback(async (data) => {
        const res = await healthService.saveHealthProfile(data);
        setProfile(data);
        return res.data;
    }, []);

    useEffect(() => { fetchProfile(); }, [fetchProfile]);

    return { profile, loading, error, fetchProfile, save };
}
