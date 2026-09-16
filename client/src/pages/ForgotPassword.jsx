import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, TextField, Button, Typography, Alert, CircularProgress, Box } from '@mui/material';
import toast from 'react-hot-toast';
import AuthLayout from '../components/AuthLayout';
import authService from '../services/authService';

export default function ForgotPassword() {
    const [step, setStep] = useState(1); // 1=email, 2=code, 3=new password
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [pwFocused, setPwFocused] = useState(false);
    const navigate = useNavigate();

    const handleSendCode = async (e) => {
        e.preventDefault();
        setError('');
        if (!email.trim()) return setError('Enter your email');
        if (!/\S+@\S+\.\S+/.test(email)) return setError('Enter a valid email');
        setLoading(true);
        try {
            const res = await authService.forgotPassword(email);
            toast.success(res.data.message);
            setStep(2);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to send reset code');
        } finally { setLoading(false); }
    };

    const handleVerifyCode = async (e) => {
        e.preventDefault();
        setError('');
        if (!code.trim() || code.length !== 6) return setError('Enter the 6-digit code');
        setStep(3);
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setError('');
        if (newPassword.length < 6) return setError('Password must be at least 6 characters');
        if (!/^[a-zA-Z0-9]+$/.test(newPassword)) return setError('Password must contain only letters and numbers');
        if (!/[A-Z]/.test(newPassword)) return setError('Password must contain at least one capital letter');
        if (!/[0-9]/.test(newPassword)) return setError('Password must contain at least one number');
        if (newPassword !== confirmPassword) return setError('Passwords do not match');
        setLoading(true);
        try {
            const res = await authService.resetPassword(email, code, newPassword);
            toast.success(res.data.message);
            navigate('/login');
        } catch (err) {
            setError(err.response?.data?.error || 'Reset failed');
            if (err.response?.data?.error?.includes('expired')) setStep(1);
        } finally { setLoading(false); }
    };

    return (
        <AuthLayout>
            <Card sx={{ width: '100%', maxWidth: 440, p: 3, bgcolor: '#fff', color: '#333' }}>
                <CardContent sx={{ p: 1 }}>
                    <Typography variant="h5" gutterBottom align="center" sx={{ color: '#1a237e' }}>Reset Password</Typography>
                    <Typography variant="body2" align="center" sx={{ color: '#666', mb: 3 }}>
                        {step === 1 && "Enter your email to receive a reset code"}
                        {step === 2 && "Enter the 6-digit code sent to your email"}
                        {step === 3 && "Create your new password"}
                    </Typography>

                    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                    {step === 1 && (
                        <form onSubmit={handleSendCode}>
                            <TextField placeholder="Email address" type="email" fullWidth
                                sx={{ mb: 3, '& input': { color: '#000' } }}
                                value={email} onChange={e => setEmail(e.target.value)} />
                            <Button type="submit" variant="contained" fullWidth size="large" disabled={loading} sx={{ mb: 2, py: 1.5 }}>
                                {loading ? <CircularProgress size={24} /> : 'Send Reset Code'}
                            </Button>
                        </form>
                    )}

                    {step === 2 && (
                        <form onSubmit={handleVerifyCode}>
                            <TextField placeholder="6-digit code" fullWidth
                                sx={{ mb: 3, '& input': { color: '#000', letterSpacing: 8, textAlign: 'center', fontSize: 24 } }}
                                value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                inputProps={{ maxLength: 6, inputMode: 'numeric' }} />
                            <Button type="submit" variant="contained" fullWidth size="large" sx={{ mb: 2, py: 1.5 }}>
                                Verify Code
                            </Button>
                            <Typography variant="caption" sx={{ color: '#666', display: 'block', textAlign: 'center', cursor: 'pointer', '&:hover': { color: '#1a237e' } }}
                                onClick={() => { setStep(1); setCode(''); setError(''); }}>
                                ← Resend code
                            </Typography>
                        </form>
                    )}

                    {step === 3 && (
                        <form onSubmit={handleResetPassword}>
                            <TextField placeholder="New password" type="password" fullWidth
                                sx={{ mb: pwFocused ? 0.5 : 2, '& input': { color: '#000' } }}
                                value={newPassword} onChange={e => setNewPassword(e.target.value)}
                                onFocus={() => setPwFocused(true)} onBlur={() => setPwFocused(false)} />
                            {pwFocused && (
                                <Typography variant="caption" sx={{ color: '#888', display: 'block', mb: 2, ml: 0.5 }}>
                                    Must be 6+ characters, letters & numbers only, at least 1 capital letter
                                </Typography>
                            )}
                            <TextField placeholder="Confirm password" type="password" fullWidth
                                sx={{ mb: 3, '& input': { color: '#000' } }}
                                value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                            <Button type="submit" variant="contained" fullWidth size="large" disabled={loading} sx={{ mb: 2, py: 1.5 }}>
                                {loading ? <CircularProgress size={24} /> : 'Reset Password'}
                            </Button>
                        </form>
                    )}

                    <Box sx={{ textAlign: 'center', mt: 1 }}>
                        <Link to="/login" style={{ color: '#1a237e', fontWeight: 600 }}>← Back to Login</Link>
                    </Box>
                </CardContent>
            </Card>
        </AuthLayout>
    );
}
