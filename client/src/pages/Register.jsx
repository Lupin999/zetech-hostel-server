import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, TextField, Button, Typography, Alert, CircularProgress, Box, Select, MenuItem, InputAdornment, IconButton } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import toast from 'react-hot-toast';
import AuthLayout from '../components/AuthLayout';
import { COUNTRY_CODES } from '../utils/constants';
import api from '../utils/api';
import { formatHostelName } from '../utils/helpers';

const inputSx = {
    mb: 2.5,
    '& .MuiInputBase-input': { color: '#000' },
    '& .MuiInputBase-input::placeholder': { color: '#000', opacity: 0.7 },
    '& .MuiSelect-select': { color: '#1f2937' },
    '& .MuiInputLabel-root': { color: '#4b5563' },
    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(0,0,0,0.23)' },
    '& .MuiSvgIcon-root': { color: '#1a237e' },
};
const currentYear = new Date().getFullYear();

// Auto-format admission number as the user types: raw digits → XX'XXXX/YYYY
const formatAdmissionNo = (raw) => {
    const digits = raw.replace(/\D/g, '').slice(0, 10);
    if (digits.length <= 2) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 2)}'${digits.slice(2)}`;
    return `${digits.slice(0, 2)}'${digits.slice(2, 6)}/${digits.slice(6)}`;
};

export default function Register() {
    const [form, setForm] = useState({ admissionNo: '', email: '', full_name: '', course: '', password: '', confirmPassword: '', gender: 'Male', phoneNumber: '' });
    const [countryCode, setCountryCode] = useState('+254');
    const [errors, setErrors] = useState({});
    const [serverError, setServerError] = useState('');
    const [loading, setLoading] = useState(false);
    const [pwFocused, setPwFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [programmes, setProgrammes] = useState([]);
    const { register } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        api.get('/programmes')
            .then(({ data }) => setProgrammes(data))
            .catch(() => setServerError('Could not load the programme list. Please refresh and try again.'));
    }, []);

    const validate = () => {
        const e = {};
        if (!form.course) e.course = 'Please select your programme';
        const regDigits = form.admissionNo.replace(/\D/g, '');
        if (regDigits.length < 10) e.admissionNo = 'Enter all 10 digits (e.g., 01\'0046/2024)';
        else {
            const year = Number(regDigits.slice(6, 10));
            if (year < 2018 || year > currentYear + 1) e.admissionNo = `Year must be between 2018 and ${currentYear + 1}`;
        }
        if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Valid email is required';
        if (!form.full_name.trim()) e.full_name = 'Full name is required';
        if (form.password.length < 6) e.password = 'Password must be at least 6 characters';
        else if (!/^[a-zA-Z0-9]+$/.test(form.password)) e.password = 'Letters and numbers only';
        else if (!/[A-Z]/.test(form.password)) e.password = 'Must contain at least one capital letter';
        else if (!/[0-9]/.test(form.password)) e.password = 'Must contain at least one number';
        if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
        const nationalDigits = form.phoneNumber.replace(/\D/g, '').replace(/^0+/, '');
        const fullPhone = `${countryCode.replace(/\D/g, '')}${nationalDigits}`;
        if (!form.phoneNumber.trim()) e.phoneNumber = 'Phone number is required for login and M-Pesa';
        else if (!/^[1-9]\d{9,14}$/.test(fullPhone)) e.phoneNumber = 'Enter a valid phone number';
        setErrors(e);
        return !Object.keys(e).length;
    };

    const hostelPreference = form.gender === 'Female' ? 'Girls' : 'Boys';
    const selectedProgramme = programmes.find(programme => programme.name === form.course);
    const registrationNumber = selectedProgramme && form.admissionNo
        ? `${selectedProgramme.code}-${form.admissionNo}`
        : '';

    const handleSubmit = async (e) => {
        e.preventDefault();
        setServerError('');
        if (!validate()) return;
        setLoading(true);
        try {
            const phone = countryCode + form.phoneNumber.replace(/\D/g, '').replace(/^0+/, '');
            const { phoneNumber: _phoneNumber, confirmPassword: _confirmPassword, admissionNo: _admissionNo, ...rest } = form;
            const user = await register({ ...rest, reg_no: registrationNumber, phone, gender: form.gender, hostel_preference: hostelPreference });
            toast.success('Registration successful! Opening your dashboard...');
            navigate(user.role === 'student' ? '/dashboard' : '/admin', { replace: true });
        } catch (err) {
            setServerError(err.response?.data?.error || 'Registration failed');
        } finally { setLoading(false); }
    };

    const update = (field) => (e) => {
        let val;
        if (field === 'admissionNo') val = formatAdmissionNo(e.target.value);
        else if (field === 'phoneNumber') val = e.target.value.replace(/\D/g, '').slice(0, 15);
        else val = e.target.value;
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
                        <TextField placeholder="Full Name" fullWidth sx={inputSx} value={form.full_name} onChange={update('full_name')}
                            error={!!errors.full_name} helperText={errors.full_name} />
                        <TextField placeholder="you@example.com" type="email" autoComplete="email" fullWidth sx={inputSx} value={form.email} onChange={update('email')}
                            error={!!errors.email} helperText={errors.email} />
                        <TextField select label="Programme" fullWidth sx={{
                            ...inputSx,
                            '& .MuiSelect-select': { color: '#1f2937' },
                            '& .MuiInputLabel-root': { color: '#4b5563' },
                            '& .MuiSvgIcon-root': { color: '#1a237e' },
                        }} value={form.course}
                            onChange={update('course')} error={!!errors.course}
                            helperText={errors.course || 'Select your current programme. This is not enrollment verification.'}
                            disabled={!programmes.length}
                            SelectProps={{ MenuProps: { PaperProps: { sx: { bgcolor: '#fff', color: '#1f2937', maxHeight: 360 } } } }}>
                            {programmes.map(programme => (
                                <MenuItem key={`${programme.level}-${programme.name}`} value={programme.name}
                                    sx={{ color: '#1f2937', '&.Mui-selected': { bgcolor: '#e8eaf6' } }}>
                                    {programme.level}: {programme.name}
                                </MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            label="Admission Number"
                            placeholder="01'0046/2024"
                            fullWidth
                            sx={inputSx}
                            value={form.admissionNo}
                            onChange={update('admissionNo')}
                            error={!!errors.admissionNo}
                            helperText={errors.admissionNo || 'Type your group, student number & year — it formats automatically'}
                            inputProps={{ inputMode: 'numeric' }}
                        />
                        <Box sx={{
                            mt: -1, mb: 2.5, px: 2, py: 1.3, borderRadius: 2,
                            backgroundColor: registrationNumber ? '#e8eaf6' : '#f5f5f5',
                            border: registrationNumber ? '2px solid #3949ab' : '1px solid #ddd',
                            color: registrationNumber ? '#1a237e' : '#999',
                            fontWeight: 700, fontSize: '0.9rem',
                            display: 'flex', alignItems: 'center', gap: 1,
                        }}>
                            <span style={{ fontSize: '1.1rem' }}>🎓</span>
                            {registrationNumber || (selectedProgramme ? `${selectedProgramme.code}-01'0046/2024` : 'Select a programme first')}
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1, mb: 2.5 }}>
                            <Select value={countryCode} onChange={e => setCountryCode(e.target.value)}
                                sx={{ minWidth: 110, '& .MuiSelect-select': { color: '#000' } }}>
                                {COUNTRY_CODES.map(c => (
                                    <MenuItem key={c.code} value={c.code}>{c.label}</MenuItem>
                                ))}
                            </Select>
                            <TextField placeholder="Phone number (required)" required fullWidth
                                sx={{ '& input': { color: '#000' }, '& input::placeholder': { color: '#000', opacity: 0.7 } }}
                                value={form.phoneNumber} onChange={update('phoneNumber')}
                                error={!!errors.phoneNumber} helperText={errors.phoneNumber || 'Use the number you can access for login codes and M-Pesa prompts.'}
                                inputProps={{ inputMode: 'numeric' }} />
                        </Box>
                        <TextField label="Password" placeholder="Enter password" type={showPassword ? 'text' : 'password'} fullWidth required sx={{ ...inputSx, mb: pwFocused ? 0.5 : 2.5 }} value={form.password} onChange={update('password')}
                            onFocus={() => setPwFocused(true)} onBlur={() => setPwFocused(false)}
                            error={!!errors.password} helperText={errors.password}
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
                            }} />
                        {pwFocused && (
                            <Typography variant="caption" sx={{ color: '#888', display: 'block', mb: 2, ml: 0.5 }}>
                                At least 6 characters; letters and numbers only, with at least 1 capital letter and 1 number. For better security, choose a unique password of 12+ characters.
                            </Typography>
                        )}
                        <TextField label="Confirm Password" placeholder="Re-enter password" type={showConfirmPassword ? 'text' : 'password'} fullWidth required sx={inputSx}
                            value={form.confirmPassword} onChange={update('confirmPassword')}
                            error={!!errors.confirmPassword} helperText={errors.confirmPassword}
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
                            }} />
                        <TextField select label="Gender" fullWidth sx={{
                            ...inputSx,
                            '& .MuiSelect-select': { color: '#1f2937' },
                            '& .MuiInputLabel-root': { color: '#4b5563' },
                            '& .MuiSvgIcon-root': { color: '#1a237e' },
                        }} value={form.gender} onChange={update('gender')}
                            SelectProps={{ MenuProps: { PaperProps: { sx: { bgcolor: '#fff', color: '#1f2937' } } } }}>
                            <MenuItem value="Male" sx={{ color: '#1f2937', '&.Mui-selected': { bgcolor: '#e8eaf6' } }}>Male</MenuItem>
                            <MenuItem value="Female" sx={{ color: '#1f2937', '&.Mui-selected': { bgcolor: '#e8eaf6' } }}>Female</MenuItem>
                        </TextField>
                        <Box sx={{ mb: 2.5, px: 2, py: 1.5, borderRadius: 2, backgroundColor: '#e8eaf6', border: '2px solid #3949ab', color: '#1a237e', fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 1 }}>
                            <span style={{ fontSize: '1.3rem' }}>🏠</span> Hostel group: {formatHostelName(hostelPreference)}
                        </Box>
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
