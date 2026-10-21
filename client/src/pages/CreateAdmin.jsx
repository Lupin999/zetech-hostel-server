import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, TextField, Button, Typography, Alert, CircularProgress, Box, Select, MenuItem, InputAdornment, IconButton } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import toast from 'react-hot-toast';
import AuthLayout from '../components/AuthLayout';
import api from '../utils/api';
import { COUNTRY_CODES } from '../utils/constants';

export default function CreateAdmin() {
    const [form, setForm] = useState({ email: '', full_name: '', password: '', confirmPassword: '', adminSecret: '', phoneNumber: '' });
    const [countryCode, setCountryCode] = useState('+254');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [showAdminSecret, setShowAdminSecret] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (form.password.length < 6) return setError('Password must be at least 6 characters');
        if (form.password !== form.confirmPassword) return setError('Passwords do not match');
        if (!form.adminSecret.trim()) return setError('Admin secret code is required');
        setLoading(true);
        try {
            const phone = form.phoneNumber ? countryCode + form.phoneNumber.replace(/^0+/, '') : '';
            const { phoneNumber: _phoneNumber, confirmPassword: _confirmPassword, ...rest } = form;
            await api.post('/auth/create-admin', { ...rest, phone });
            toast.success('Admin account created! Redirecting to login...');
            setTimeout(() => navigate('/login'), 1500);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to create admin');
        } finally { setLoading(false); }
    };

    const update = (field) => (e) => {
        const val = field === 'phoneNumber' ? e.target.value.replace(/[^0-9]/g, '') : e.target.value;
        setForm({ ...form, [field]: val });
    };

    return (
        <AuthLayout>
            <Card sx={{ width: '100%', maxWidth: 420, p: 2 }}>
                <CardContent>
                    <Typography variant="h5" gutterBottom align="center" color="primary">Admin Setup</Typography>
                    <Typography variant="body2" gutterBottom align="center" color="text.secondary" sx={{ mb: 3 }}>Create an admin account</Typography>
                    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                    <form onSubmit={handleSubmit}>
                        <TextField label="Full Name" fullWidth sx={{ mb: 2 }} value={form.full_name} onChange={update('full_name')} />
                           <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                            <Select value={countryCode} onChange={e => setCountryCode(e.target.value)}
                                sx={{ minWidth: 110 }}>
                                {COUNTRY_CODES.map(c => (
                                    <MenuItem key={c.code} value={c.code}>{c.label}</MenuItem>
                                ))}
                            </Select>
                            <TextField label="Phone number" fullWidth
                                value={form.phoneNumber} onChange={update('phoneNumber')}
                                inputProps={{ inputMode: 'numeric' }} />
                        </Box>
                        <TextField label="Email" type="email" fullWidth sx={{ mb: 2 }} value={form.email} onChange={update('email')} />
                        <TextField
                            label="Password"
                            type={showPassword ? 'text' : 'password'}
                            fullWidth
                            sx={{ mb: 2 }}
                            value={form.password}
                            onChange={update('password')}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                                            onClick={() => setShowPassword(prev => !prev)}
                                            onMouseDown={e => e.preventDefault()}
                                            edge="end"
                                        >
                                            {showPassword ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 2, ml: 0.5 }}>
                            Use at least 6 characters. For better security, choose a unique password of 12+ characters and mix uppercase and lowercase letters with numbers.
                        </Typography>
                        <TextField
                            label="Confirm Password"
                            type={showConfirmPassword ? 'text' : 'password'}
                            fullWidth
                            sx={{ mb: 2 }}
                            value={form.confirmPassword}
                            onChange={update('confirmPassword')}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                                            onClick={() => setShowConfirmPassword(prev => !prev)}
                                            onMouseDown={e => e.preventDefault()}
                                            edge="end"
                                        >
                                            {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />
                        <TextField
                            label="Admin Secret Code"
                            type={showAdminSecret ? 'text' : 'password'}
                            fullWidth
                            sx={{ mb: 3 }}
                            value={form.adminSecret}
                            onChange={update('adminSecret')}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            aria-label={showAdminSecret ? 'Hide admin secret code' : 'Show admin secret code'}
                                            onClick={() => setShowAdminSecret(prev => !prev)}
                                            onMouseDown={e => e.preventDefault()}
                                            edge="end"
                                        >
                                            {showAdminSecret ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />
                        <Button type="submit" variant="contained" fullWidth size="large" disabled={loading} sx={{ mb: 2, py: 1.5 }}>
                            {loading ? <CircularProgress size={24} /> : 'Create Admin'}
                        </Button>
                    </form>
                    <Typography variant="body2" align="center">
                        <Link to="/login" style={{ fontWeight: 600 }}>Back to Login</Link>
                    </Typography>
                </CardContent>
            </Card>
        </AuthLayout>
    );
}
