import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, TextField, Button, Typography, Alert, CircularProgress, Box, Select, MenuItem } from '@mui/material';
import toast from 'react-hot-toast';
import AuthLayout from '../components/AuthLayout';
import { COUNTRY_CODES } from '../utils/constants';

const inputSx = { mb: 2.5, '& input': { color: '#000' }, '& input::placeholder': { color: '#000', opacity: 0.7 } };

export default function Register() {
    const [form, setForm] = useState({ reg_no: '', email: '', full_name: '', password: '', campus: '', phoneNumber: '' });
    const [countryCode, setCountryCode] = useState('+254');
    const [errors, setErrors] = useState({});
    const [serverError, setServerError] = useState('');
    const [loading, setLoading] = useState(false);
    const [pwFocused, setPwFocused] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();

    const validate = () => {
        const e = {};
        if (!form.reg_no.trim()) e.reg_no = 'Reg number is required';
        if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Valid email is required';
        if (!form.full_name.trim()) e.full_name = 'Full name is required';
        if (form.password.length < 6) e.password = 'Password must be at least 6 characters';
        else if (!/^[a-zA-Z0-9]+$/.test(form.password)) e.password = 'Letters and numbers only';
        else if (!/[A-Z]/.test(form.password)) e.password = 'Must contain at least one capital letter';
        else if (!/[0-9]/.test(form.password)) e.password = 'Must contain at least one number';
        if (!form.campus.trim()) e.campus = 'Campus is required';
        if (form.phoneNumber) {
            const digits = form.phoneNumber.replace(/\D/g, '');
            if (digits.length < 7) e.phoneNumber = 'Phone number is too short';
            if (digits.length > 12) e.phoneNumber = 'Phone number is too long';
        }
        setErrors(e);
        return !Object.keys(e).length;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setServerError('');
        if (!validate()) return;
        setLoading(true);
        try {
            const phone = form.phoneNumber ? countryCode + form.phoneNumber.replace(/^0+/, '') : '';
            const { phoneNumber, ...rest } = form;
            await register({ ...rest, phone });
            toast.success('Registered! Redirecting to login...');
            setTimeout(() => navigate('/login'), 1500);
        } catch (err) {
            setServerError(err.response?.data?.error || 'Registration failed');
        } finally { setLoading(false); }
    };

    const update = (field) => (e) => {
        const val = field === 'phoneNumber' ? e.target.value.replace(/[^0-9]/g, '') : e.target.value;
        setForm({ ...form, [field]: val });
        if (errors[field]) setErrors({ ...errors, [field]: '' });
    };

    return (
        <AuthLayout>
            <Card sx={{ width: '100%', maxWidth: 440, p: 3, bgcolor: '#fff', color: '#333' }}>
                <CardContent sx={{ p: 1 }}>
                    <Typography variant="h5" gutterBottom align="center" sx={{ color: '#1a237e' }}>Zetech Hostel</Typography>
                    <Typography variant="body2" gutterBottom align="center" sx={{ color: '#666', mb: 4 }}>Create your account</Typography>
                    {serverError && <Alert severity="error" sx={{ mb: 2 }}>{serverError}</Alert>}
                    <form onSubmit={handleSubmit}>
                        <TextField placeholder="Reg No" fullWidth sx={inputSx} value={form.reg_no} onChange={update('reg_no')}
                            error={!!errors.reg_no} helperText={errors.reg_no} />
                        <TextField placeholder="Email" type="email" fullWidth sx={inputSx} value={form.email} onChange={update('email')}
                            error={!!errors.email} helperText={errors.email} />
                        <TextField placeholder="Full Name" fullWidth sx={inputSx} value={form.full_name} onChange={update('full_name')}
                            error={!!errors.full_name} helperText={errors.full_name} />
                        <Box sx={{ display: 'flex', gap: 1, mb: 2.5 }}>
                            <Select value={countryCode} onChange={e => setCountryCode(e.target.value)}
                                sx={{ minWidth: 110, '& .MuiSelect-select': { color: '#000' } }}>
                                {COUNTRY_CODES.map(c => (
                                    <MenuItem key={c.code} value={c.code}>{c.label}</MenuItem>
                                ))}
                            </Select>
                            <TextField placeholder="Phone number (optional)" fullWidth
                                sx={{ '& input': { color: '#000' }, '& input::placeholder': { color: '#000', opacity: 0.7 } }}
                                value={form.phoneNumber} onChange={update('phoneNumber')}
                                error={!!errors.phoneNumber} helperText={errors.phoneNumber}
                                inputProps={{ inputMode: 'numeric' }} />
                        </Box>
                        <TextField placeholder="Password" type="password" fullWidth sx={{ ...inputSx, mb: pwFocused ? 0.5 : 2.5 }} value={form.password} onChange={update('password')}
                            onFocus={() => setPwFocused(true)} onBlur={() => setPwFocused(false)}
                            error={!!errors.password} helperText={errors.password} />
                        {pwFocused && (
                            <Typography variant="caption" sx={{ color: '#888', display: 'block', mb: 2, ml: 0.5 }}>
                                Must be 6+ characters, letters & numbers only, at least 1 capital letter
                            </Typography>
                        )}
                        <TextField placeholder="Campus" fullWidth sx={{ ...inputSx, mb: 3.5 }} value={form.campus} onChange={update('campus')}
                            error={!!errors.campus} helperText={errors.campus} />
                        <Button type="submit" variant="contained" fullWidth size="large" disabled={loading} sx={{ mb: 2, py: 1.5 }}>
                            {loading ? <CircularProgress size={24} /> : 'Register'}
                        </Button>
                    </form>
                    <Typography variant="body2" align="center" sx={{ color: '#666' }}>
                        Already have an account? <Link to="/login" style={{ fontWeight: 600, color: '#1a237e' }}>Login</Link>
                    </Typography>
                </CardContent>
            </Card>
        </AuthLayout>
    );
}
