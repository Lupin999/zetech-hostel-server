import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import {
    Card, CardContent, TextField, Button, Typography, Alert, CircularProgress,
    Tabs, Tab, Box, MenuItem, Select
} from '@mui/material';
import toast from 'react-hot-toast';
import AuthLayout from '../components/AuthLayout';
import { COUNTRY_CODES } from '../utils/constants';

const inputSx = { mb: 2.5, '& input': { color: '#000' }, '& input::placeholder': { color: '#000', opacity: 0.7 } };

export default function Login() {
    const [tab, setTab] = useState(0);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [countryCode, setCountryCode] = useState('+254');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [otp, setOtp] = useState('');
    const [otpSent, setOtpSent] = useState(false);
    const [maskedEmail, setMaskedEmail] = useState('');
    const [error, setError] = useState('');
    const [fieldError, setFieldError] = useState('');
    const [loading, setLoading] = useState(false);
    const [pwFocused, setPwFocused] = useState(false);
    const { login, sendOtp, verifyOtp } = useAuth();
    const navigate = useNavigate();

    const validateEmail = () => {
        if (!email.trim()) return { error: 'Email is required', field: 'email' };
        if (!/\S+@\S+\.\S+/.test(email)) return { error: 'Please enter a valid email address', field: 'email' };
        if (!password) return { error: 'Password is required', field: 'password' };
        if (password.length < 6) return { error: 'Password must be at least 6 characters', field: 'password' };
        if (!/^[a-zA-Z0-9]+$/.test(password)) return { error: 'Password must contain only letters and numbers', field: 'password' };
        if (!/[A-Z]/.test(password)) return { error: 'Password must contain at least one capital letter', field: 'password' };
        if (!/[0-9]/.test(password)) return { error: 'Password must contain at least one number', field: 'password' };
        return null;
    };

    const validatePhone = () => {
        const digitsOnly = phoneNumber.replace(/\D/g, '');
        if (!phoneNumber.trim()) return { error: 'Phone number is required', field: 'phone' };
        if (/[a-zA-Z]/.test(phoneNumber)) return { error: 'Phone number cannot contain letters', field: 'phone' };
        if (digitsOnly.length < 7) return { error: 'Phone number is too short', field: 'phone' };
        if (digitsOnly.length > 12) return { error: 'Phone number is too long', field: 'phone' };
        return null;
    };

    const handleEmailLogin = async (e) => {
        e.preventDefault();
        setError(''); setFieldError('');
        const v = validateEmail();
        if (v) { setError(v.error); setFieldError(v.field); return; }
        setLoading(true);
        try {
            await login(email, password);
            toast.success('Login successful!');
            navigate('/dashboard');
        } catch (err) {
            const data = err.response?.data;
            setError(data?.error || 'Login failed');
            setFieldError(data?.field || '');
        } finally { setLoading(false); }
    };

    const handleSendOtp = async () => {
        setError(''); setFieldError('');
        const v = validatePhone();
        if (v) { setError(v.error); setFieldError(v.field); return; }
        setLoading(true);
        try {
            const fullPhone = countryCode + phoneNumber.replace(/^0+/, '');
            const res = await sendOtp(fullPhone);
            setOtpSent(true);
            setMaskedEmail(res.maskedEmail || '');
            toast.success(res.message || 'OTP sent to your email!');
        } catch (err) {
            const data = err.response?.data;
            setError(data?.error || 'Failed to send OTP');
            setFieldError(data?.field || '');
        } finally { setLoading(false); }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        setError(''); setFieldError('');
        if (!otp.trim() || otp.length !== 6) { setError('Enter the 6-digit code sent to your phone'); setFieldError('code'); return; }
        setLoading(true);
        try {
            const fullPhone = countryCode + phoneNumber.replace(/^0+/, '');
            await verifyOtp(fullPhone, otp);
            toast.success('Login successful!');
            navigate('/dashboard');
        } catch (err) {
            const data = err.response?.data;
            setError(data?.error || 'Verification failed');
            setFieldError(data?.field || '');
        } finally { setLoading(false); }
    };

    return (
        <AuthLayout>
            <Card sx={{ width: '100%', maxWidth: 440, p: 3, bgcolor: '#fff', color: '#333' }}>
                <CardContent sx={{ p: 1 }}>
                    <Typography variant="h5" gutterBottom align="center" sx={{ color: '#1a237e' }}>Zetech Hostel</Typography>
                    <Typography variant="body2" gutterBottom align="center" sx={{ color: '#666', mb: 2 }}>Login to your account</Typography>

                    <Tabs value={tab} onChange={(_, v) => { setTab(v); setError(''); setFieldError(''); setOtpSent(false); }} centered sx={{ mb: 3 }}>
                        <Tab label="Email" />
                        <Tab label="Phone" />
                    </Tabs>

                    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                    {tab === 0 && (
                        <form onSubmit={handleEmailLogin}>
                            <TextField placeholder="Email" type="email" fullWidth required
                                sx={inputSx} value={email} onChange={e => { setEmail(e.target.value); if (fieldError === 'email') { setError(''); setFieldError(''); } }}
                                error={fieldError === 'email'}
                                inputProps={{ autoComplete: 'email' }} name="email" />
                            <TextField placeholder="Password" type="password" fullWidth required
                                sx={{ ...inputSx, mb: pwFocused ? 0.5 : 3.5 }} value={password}
                                onChange={e => { setPassword(e.target.value); if (fieldError === 'password') { setError(''); setFieldError(''); } }}
                                onFocus={() => setPwFocused(true)} onBlur={() => setPwFocused(false)}
                                error={fieldError === 'password'}
                                inputProps={{ autoComplete: 'current-password' }} name="password" />
                            {pwFocused && (
                                <Typography variant="caption" sx={{ color: '#888', display: 'block', mb: 3, ml: 0.5 }}>
                                    Must be 6+ characters, letters & numbers only, at least 1 capital letter
                                </Typography>
                            )}
                            <Button type="submit" variant="contained" fullWidth size="large" disabled={loading} sx={{ mb: 2, py: 1.5 }}>
                                {loading ? <CircularProgress size={24} /> : 'Login'}
                            </Button>
                        </form>
                    )}

                    {tab === 1 && (
                        <form onSubmit={otpSent ? handleVerifyOtp : (e) => { e.preventDefault(); handleSendOtp(); }}>
                            <Box sx={{ display: 'flex', gap: 1, mb: 2.5 }}>
                                <Select value={countryCode} onChange={e => setCountryCode(e.target.value)}
                                    sx={{ minWidth: 110, '& .MuiSelect-select': { color: '#000' } }} disabled={otpSent}>
                                    {COUNTRY_CODES.map(c => (
                                        <MenuItem key={c.code} value={c.code}>{c.label}</MenuItem>
                                    ))}
                                </Select>
                                <TextField placeholder="Phone number" fullWidth required
                                    sx={{ '& input': { color: '#000' }, '& input::placeholder': { color: '#000', opacity: 0.7 } }}
                                    value={phoneNumber} disabled={otpSent}
                                    onChange={e => {
                                        const val = e.target.value.replace(/[^0-9]/g, '');
                                        setPhoneNumber(val);
                                        if (fieldError === 'phone') { setError(''); setFieldError(''); }
                                    }}
                                    error={fieldError === 'phone'}
                                    inputProps={{ inputMode: 'numeric' }} />
                            </Box>

                            {otpSent && (
                                <>
                                    {maskedEmail && (
                                        <Typography variant="body2" sx={{ color: '#1a237e', textAlign: 'center', mb: 2 }}>
                                            Code sent to {maskedEmail}
                                        </Typography>
                                    )}
                                    <TextField placeholder="Enter 6-digit OTP" fullWidth required
                                        sx={{ ...inputSx, mb: 3.5 }} value={otp}
                                        onChange={e => {
                                            const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
                                            setOtp(val);
                                            if (fieldError === 'code') { setError(''); setFieldError(''); }
                                        }}
                                        error={fieldError === 'code'}
                                        inputProps={{ maxLength: 6, inputMode: 'numeric' }} />
                                    <Typography variant="caption" sx={{ color: '#666', display: 'block', mb: 2, textAlign: 'center', cursor: 'pointer', '&:hover': { color: '#1a237e' } }}
                                        onClick={() => { setOtpSent(false); setOtp(''); setError(''); setMaskedEmail(''); }}>
                                        ← Change phone number or resend code
                                    </Typography>
                                </>
                            )}

                            <Button type="submit" variant="contained" fullWidth size="large" disabled={loading} sx={{ mb: 2, py: 1.5 }}>
                                {loading ? <CircularProgress size={24} /> : otpSent ? 'Verify & Login' : 'Send OTP'}
                            </Button>
                        </form>
                    )}

                    <Typography variant="body2" align="center" sx={{ color: '#666' }}>
                        No account? <Link to="/register" style={{ fontWeight: 600, color: '#1a237e' }}>Register</Link>
                    </Typography>
                    <Typography variant="body2" align="center" sx={{ color: '#666', mt: 1 }}>
                        <Link to="/forgot-password" style={{ color: '#e53935' }}>Forgot password?</Link>
                    </Typography>
                </CardContent>
            </Card>
        </AuthLayout>
    );
}
