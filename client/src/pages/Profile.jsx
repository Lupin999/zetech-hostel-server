import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Typography, Paper, Box, Chip, TextField, Button, CircularProgress, Grid, Collapse } from '@mui/material';
import { Edit, LocalHospital, Lock, Phone, PersonOutline, ExpandMore, ExpandLess } from '@mui/icons-material';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../utils/api';
import dImg from '../d.jpg';

export default function Profile() {
    const { user, updateUser } = useAuth();
    const [health, setHealth] = useState({ medical_conditions: '', dietary_restrictions: '' });
    const [saving, setSaving] = useState(false);
    const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [pwLoading, setPwLoading] = useState(false);
    const [pwFocused, setPwFocused] = useState(false);
    const [profileForm, setProfileForm] = useState({ full_name: '', course: '', phone: '' });
    const [profileSaving, setProfileSaving] = useState(false);
    const [editingProfile, setEditingProfile] = useState(false);
    const [editingHealth, setEditingHealth] = useState(false);
    const [editingPassword, setEditingPassword] = useState(false);

    useEffect(() => {
        if (user) setProfileForm({ full_name: user.full_name || '', course: user.course || '', phone: user.phone || '' });
    }, [user]);

    useEffect(() => {
        if (user?.role === 'student') {
            api.get('/health').then(r => { if (r.data) setHealth({ medical_conditions: r.data.medical_conditions || '', dietary_restrictions: r.data.dietary_restrictions || '' }); }).catch(() => {});
        }
    }, [user]);

    const saveProfile = async () => {
        if (!profileForm.full_name.trim()) return toast.error('Name is required');
        setProfileSaving(true);
        try {
            const res = await api.put('/auth/profile/info', profileForm);
            updateUser(res.data.user);
            setEditingProfile(false);
            toast.success('Profile updated!');
        } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
        finally { setProfileSaving(false); }
    };

    const saveHealth = async () => {
        setSaving(true);
        try { await api.post('/health', health); setEditingHealth(false); toast.success('Health profile saved!'); }
        catch { toast.error('Failed to save'); }
        finally { setSaving(false); }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (pwForm.newPassword.length < 6) return toast.error('Min 6 characters');
        if (!/^[a-zA-Z0-9]+$/.test(pwForm.newPassword)) return toast.error('Letters and numbers only');
        if (!/[A-Z]/.test(pwForm.newPassword)) return toast.error('Must contain at least one capital letter');
        if (!/[0-9]/.test(pwForm.newPassword)) return toast.error('Must contain at least one number');
        if (pwForm.newPassword !== pwForm.confirmPassword) return toast.error('Passwords do not match');
        setPwLoading(true);
        try {
            await api.put('/auth/profile', { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
            toast.success('Password updated!');
            setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
            setEditingPassword(false);
        } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
        finally { setPwLoading(false); }
    };

    return (
        <>
            {/* Banner */}
            <Box sx={{ position: 'relative', borderRadius: 3, overflow: 'hidden', mb: 3, height: { xs: 140, md: 180 }, display: 'flex', alignItems: 'center' }}>
                <Box sx={{ position: 'absolute', inset: 0, backgroundImage: `url(${dImg})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(13,27,42,0.85), rgba(26,35,126,0.7))' }} />
                <Box sx={{ position: 'relative', zIndex: 1, px: { xs: 3, md: 5 } }}>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                        <Typography variant="h4" sx={{ color: '#fff', fontWeight: 700 }}>My Profile</Typography>
                        <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.8)', mt: 0.5 }}>{user?.full_name} • {user?.reg_no}</Typography>
                    </motion.div>
                </Box>
            </Box>

            <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 8 }}>

                    {/* Account Details */}
                    <Paper sx={{ p: 3, mb: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                            onClick={() => setEditingProfile(!editingProfile)}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <PersonOutline color="primary" />
                                <Typography variant="h6">Account Details</Typography>
                            </Box>
                            {editingProfile ? <ExpandLess /> : <ExpandMore />}
                        </Box>

                        {/* Summary chips always visible */}
                        {!editingProfile && (
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 2 }}>
                                <Chip label={`Name: ${user?.full_name}`} />
                                <Chip label={`Reg: ${user?.reg_no}`} />
                                <Chip label={user?.email} />
                                {user?.phone && <Chip icon={<Phone />} label={user.phone} color="info" />}
                                <Chip label={user?.campus} />
                                {user?.course && <Chip label={`Course: ${user.course}`} color="secondary" />}
                                <Chip label={user?.role} color="primary" />
                            </Box>
                        )}

                        <Collapse in={editingProfile}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                                <TextField label="Full Name" fullWidth value={profileForm.full_name}
                                    onChange={e => setProfileForm({ ...profileForm, full_name: e.target.value })} />
                                <TextField label="Phone Number" fullWidth value={profileForm.phone}
                                    onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })}
                                    placeholder="e.g. +254712345678"
                                    helperText="Used for phone login" />
                                <TextField label="Course" fullWidth value={profileForm.course}
                                    onChange={e => setProfileForm({ ...profileForm, course: e.target.value })}
                                    placeholder="e.g. BSc Computer Science" />
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                    <Button variant="contained" onClick={saveProfile} disabled={profileSaving}>
                                        {profileSaving ? <CircularProgress size={20} /> : 'Save'}
                                    </Button>
                                    <Button variant="outlined" onClick={() => { setEditingProfile(false); setProfileForm({ full_name: user?.full_name || '', course: user?.course || '', phone: user?.phone || '' }); }}>Cancel</Button>
                                </Box>
                            </Box>
                        </Collapse>
                    </Paper>

                    {/* Health & Meals Profile */}
                    {user?.role === 'student' && (
                        <Paper sx={{ p: 3, mb: 3 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                                onClick={() => setEditingHealth(!editingHealth)}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <LocalHospital color="primary" />
                                    <Typography variant="h6">Health & Meals Profile</Typography>
                                </Box>
                                {editingHealth ? <ExpandLess /> : <ExpandMore />}
                            </Box>

                            {!editingHealth && (health.medical_conditions || health.dietary_restrictions) && (
                                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 2 }}>
                                    {health.medical_conditions && <Chip label={`Medical: ${health.medical_conditions}`} color="warning" variant="outlined" />}
                                    {health.dietary_restrictions && <Chip label={`Diet: ${health.dietary_restrictions}`} color="info" variant="outlined" />}
                                </Box>
                            )}
                            {!editingHealth && !health.medical_conditions && !health.dietary_restrictions && (
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>No health info added yet. Click to add.</Typography>
                            )}

                            <Collapse in={editingHealth}>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                                    <TextField label="Medical Conditions" fullWidth multiline rows={2}
                                        value={health.medical_conditions} onChange={e => setHealth({ ...health, medical_conditions: e.target.value })}
                                        placeholder="e.g. Asthma, allergies, diabetes..." />
                                    <TextField label="Dietary Restrictions" fullWidth multiline rows={2}
                                        value={health.dietary_restrictions} onChange={e => setHealth({ ...health, dietary_restrictions: e.target.value })}
                                        placeholder="e.g. Vegetarian, halal, gluten-free..." />
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                        <Button variant="contained" onClick={saveHealth} disabled={saving}>
                                            {saving ? <CircularProgress size={20} /> : 'Save'}
                                        </Button>
                                        <Button variant="outlined" onClick={() => setEditingHealth(false)}>Cancel</Button>
                                    </Box>
                                </Box>
                            </Collapse>
                        </Paper>
                    )}

                    {/* Change Password */}
                    <Paper sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                            onClick={() => setEditingPassword(!editingPassword)}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Lock color="primary" />
                                <Typography variant="h6">Change Password</Typography>
                            </Box>
                            {editingPassword ? <ExpandLess /> : <ExpandMore />}
                        </Box>

                        {!editingPassword && (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Click to change your password.</Typography>
                        )}

                        <Collapse in={editingPassword}>
                            <form onSubmit={handleChangePassword}>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                                    <TextField label="Current Password" type="password" fullWidth
                                        value={pwForm.currentPassword} onChange={e => setPwForm({ ...pwForm, currentPassword: e.target.value })} />
                                    <TextField label="New Password" type="password" fullWidth
                                        value={pwForm.newPassword} onChange={e => setPwForm({ ...pwForm, newPassword: e.target.value })}
                                        onFocus={() => setPwFocused(true)} onBlur={() => setPwFocused(false)} />
                                    {pwFocused && (
                                        <Typography variant="caption" sx={{ color: '#888', ml: 0.5, mt: -1.5 }}>
                                            Must be 6+ characters, letters & numbers only, at least 1 capital letter
                                        </Typography>
                                    )}
                                    <TextField label="Confirm New Password" type="password" fullWidth
                                        value={pwForm.confirmPassword} onChange={e => setPwForm({ ...pwForm, confirmPassword: e.target.value })} />
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                        <Button type="submit" variant="contained" disabled={pwLoading}>
                                            {pwLoading ? <CircularProgress size={20} /> : 'Save'}
                                        </Button>
                                        <Button variant="outlined" onClick={() => { setEditingPassword(false); setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); }}>Cancel</Button>
                                    </Box>
                                </Box>
                            </form>
                        </Collapse>
                    </Paper>
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>Contact</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                            <Box sx={{ bgcolor: '#1a237e', borderRadius: 2, p: 1, display: 'flex' }}>
                                <Phone sx={{ color: '#fff' }} />
                            </Box>
                            <Box>
                                <Typography variant="body2" fontWeight={600}>Hostel Warden</Typography>
                                <Typography variant="body2" color="text.secondary">0714231425</Typography>
                            </Box>
                        </Box>
                        <Button variant="outlined" fullWidth href="tel:0714231425" startIcon={<Phone />}>Call Warden</Button>
                    </Paper>
                </Grid>
            </Grid>
        </>
    );
}
