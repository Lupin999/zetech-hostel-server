import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, TextField, Button, Typography, Alert, CircularProgress, Box, Select, MenuItem, InputAdornment, IconButton } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import toast from 'react-hot-toast';
import AuthLayout from '../components/AuthLayout';
import { COUNTRY_CODES } from '../utils/constants';
import api from '../utils/api';

const inputSx = { mb: 2.5, '& input': { color: '#000' }, '& input::placeholder': { color: '#000', opacity: 0.7 } };

export default function Register() {
    const [form, setForm] = useState({ regGroup: '', regSequence: '', regYear: '', email: '', full_name: '', course: '', password: '', confirmPassword: '', gender: 'Male', phoneNumber: '' });
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
        if (!/^\d{1,2}$/.test(form.regGroup) || Number(form.regGroup) > 99) e.regGroup = 'Enter a number from 0 to 99';
        if (!/^\d{1,4}$/.test(form.regSequence) || Number(form.regSequence) > 9999) e.regSequence = 'Enter a number from 0 to 9999';
        if (!/^\d{4}$/.test(form.regYear)) e.regYear = 'Enter a 4-digit year';
        if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Valid email is required';
        if (!form.full_name.trim()) e.full_name = 'Full name is required';
        if (form.password.length < 6) e.password = 'Password must be at least 6 characters';
        else if (!/^[a-zA-Z0-9]+$/.test(form.password)) e.password = 'Letters and numbers only';
        else if (!/[A-Z]/.test(form.password)) e.password = 'Must contain at least one capital letter';
        else if (!/[0-9]/.test(form.password)) e.password = 'Must contain at least one number';
        if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
        if (form.phoneNumber) {
            const digits = form.phoneNumber.replace(/\D/g, '');
            if (digits.length < 7) e.phoneNumber = 'Phone number is too short';
            if (digits.length > 12) e.phoneNumber = 'Phone number is too long';
        }
        setErrors(e);
        return !Object.keys(e).length;
    };

    const hostelPreference = form.gender === 'Female' ? 'Girls' : 'Boys';
    const selectedProgramme = programmes.find(programme => programme.name === form.course);
    const registrationNumber = selectedProgramme && form.regGroup && form.regSequence && /^\d{4}$/.test(form.regYear)
        ? `${selectedProgramme.code}-${form.regGroup.padStart(2, '0')}-${form.regSequence.padStart(4, '0')}/${form.regYear}`
        : '';

    const handleSubmit = async (e) => {
        e.preventDefault();
        setServerError('');
        if (!validate()) return;
        setLoading(true);
        try {
            const phone = form.phoneNumber ? countryCode + form.phoneNumber.replace(/^0+/, '') : '';
            const { phoneNumber: _phoneNumber, confirmPassword: _confirmPassword, regGroup: _regGroup, regSequence: _regSequence, regYear: _regYear, ...rest } = form;
            const user = await register({ ...rest, reg_no: registrationNumber, phone, gender: form.gender, hostel_preference: hostelPreference });
            toast.success('Registration successful! Opening your dashboard...');
            navigate(user.role === 'student' ? '/dashboard' : '/admin', { replace: true });
        } catch (err) {
            setServerError(err.response?.data?.error || 'Registration failed');
        } finally { setLoading(false); }
    };

    const update = (field) => (e) => {
        const numericLimits = { regGroup: 2, regSequence: 4, regYear: 4 };
        const val = field === 'phoneNumber' || numericLimits[field]
            ? e.target.value.replace(/\D/g, '').slice(0, numericLimits[field] || 15)
            : e.target.value;
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
                        <TextField placeholder="Email" type="email" fullWidth sx={inputSx} value={form.email} onChange={update('email')}
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
                        <Box sx={{ display: 'flex', gap: 1, mb: 0.5 }}>
                            <TextField label="00-99" placeholder="01" inputProps={{ inputMode: 'numeric', maxLength: 2 }}
                                fullWidth sx={inputSx} value={form.regGroup} onChange={update('regGroup')}
                                error={!!errors.regGroup} helperText={errors.regGroup} />
                            <TextField label="0000-9999" placeholder="0046" inputProps={{ inputMode: 'numeric', maxLength: 4 }}
                                fullWidth sx={inputSx} value={form.regSequence} onChange={update('regSequence')}
                                error={!!errors.regSequence} helperText={errors.regSequence} />
                            <TextField label="Year" placeholder="2024" inputProps={{ inputMode: 'numeric', maxLength: 4 }}
                                fullWidth sx={inputSx} value={form.regYear} onChange={update('regYear')}
                                error={!!errors.regYear} helperText={errors.regYear} />
                        </Box>
                        <Typography variant="caption" sx={{ display: 'block', mt: -1.5, mb: 2, color: '#4b5563' }}>
                            Enter a number from 0-99, a number from 0-9999, and a four-digit year.
                        </Typography>
                        <Typography variant="body2" sx={{ mt: -1.5, mb: 2.5, color: '#4b5563' }}>
                            Registration number: {registrationNumber || (selectedProgramme ? `${selectedProgramme.code}-00-0000/YYYY` : 'Select a programme to see its code')}
                        </Typography>
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
                        <Box sx={{ mb: 2.5, px: 1.5, py: 1.2, borderRadius: 1, backgroundColor: '#f5f7ff', border: '1px solid #dfe3f5', color: '#1a237e', fontWeight: 600 }}>
                            Hostel group: {hostelPreference} Hostel
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
