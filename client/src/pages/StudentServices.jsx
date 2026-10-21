import { useEffect, useState } from 'react';
import {
    Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
    MenuItem, Paper, Tab, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Tabs, TextField, Typography,
} from '@mui/material';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { formatPaymentMethod } from '../utils/helpers';

const emptyRequest = { request_type: 'maintenance', title: '', description: '', priority: 'normal' };

export default function StudentServices() {
    const [tab, setTab] = useState(0);
    const [requests, setRequests] = useState([]);
    const [visitors, setVisitors] = useState([]);
    const [payments, setPayments] = useState([]);
    const [balances, setBalances] = useState([]);
    const [requestForm, setRequestForm] = useState(emptyRequest);
    const [visitorForm, setVisitorForm] = useState({ visitor_name: '', visitor_phone: '', purpose: '' });
    const [receipt, setReceipt] = useState(null);

    const refresh = async () => {
        try {
            const [requestRes, visitorRes, paymentRes, balanceRes] = await Promise.all([
                api.get('/operations/requests'), api.get('/operations/visitors'),
                api.get('/payments/my'), api.get('/operations/balances'),
            ]);
            setRequests(requestRes.data);
            setVisitors(visitorRes.data);
            setPayments(paymentRes.data);
            setBalances(balanceRes.data);
        } catch (error) {
            toast.error(error.response?.data?.error || 'Could not load your services');
        }
    };

    useEffect(() => {
        let active = true;
        Promise.all([
            api.get('/operations/requests'), api.get('/operations/visitors'),
            api.get('/payments/my'), api.get('/operations/balances'),
        ]).then(([requestRes, visitorRes, paymentRes, balanceRes]) => {
            if (!active) return;
            setRequests(requestRes.data);
            setVisitors(visitorRes.data);
            setPayments(paymentRes.data);
            setBalances(balanceRes.data);
        }).catch(error => toast.error(error.response?.data?.error || 'Could not load your services'));
        return () => { active = false; };
    }, []);

    const submitRequest = async (event) => {
        event.preventDefault();
        try {
            await api.post('/operations/requests', requestForm);
            setRequestForm(emptyRequest);
            await refresh();
            toast.success('Request submitted');
        } catch (error) { toast.error(error.response?.data?.error || 'Could not submit request'); }
    };

    const registerVisitor = async (event) => {
        event.preventDefault();
        try {
            await api.post('/operations/visitors', visitorForm);
            setVisitorForm({ visitor_name: '', visitor_phone: '', purpose: '' });
            await refresh();
            toast.success('Visitor registered');
        } catch (error) { toast.error(error.response?.data?.error || 'Could not register visitor'); }
    };

    const openReceipt = async (paymentId) => {
        try {
            const response = await api.get(`/operations/payments/${paymentId}/receipt`);
            setReceipt(response.data);
        } catch (error) { toast.error(error.response?.data?.error || 'Could not load receipt'); }
    };

    return (
        <Box>
            <Typography variant="h4" fontWeight={700} gutterBottom>Student Services</Typography>
            <Tabs value={tab} onChange={(_, value) => setTab(value)} variant="scrollable" scrollButtons="auto" sx={{ mb: 2 }}>
                <Tab label="Requests" />
                <Tab label="Visitors" />
                <Tab label="Payments" />
            </Tabs>

            {tab === 0 && <>
                <Paper component="form" onSubmit={submitRequest} sx={{ p: 2, mb: 3 }}>
                    <Typography variant="h6" gutterBottom>Submit a maintenance request or complaint</Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                        <TextField select label="Type" value={requestForm.request_type} onChange={e => setRequestForm({ ...requestForm, request_type: e.target.value })}>
                            <MenuItem value="maintenance">Maintenance</MenuItem><MenuItem value="complaint">Complaint</MenuItem>
                        </TextField>
                        <TextField select label="Priority" value={requestForm.priority} onChange={e => setRequestForm({ ...requestForm, priority: e.target.value })}>
                            {['low', 'normal', 'high', 'urgent'].map(value => <MenuItem key={value} value={value}>{value}</MenuItem>)}
                        </TextField>
                        <TextField label="Subject" required value={requestForm.title} onChange={e => setRequestForm({ ...requestForm, title: e.target.value })} />
                        <TextField label="Details" required multiline minRows={2} value={requestForm.description} onChange={e => setRequestForm({ ...requestForm, description: e.target.value })} />
                    </Box>
                    <Button type="submit" variant="contained" sx={{ mt: 2 }}>Submit request</Button>
                </Paper>
                <TableContainer component={Paper}>
                    <Table size="small"><TableHead><TableRow>{['Date', 'Type', 'Subject', 'Priority', 'Status', 'Update'].map(value => <TableCell key={value}>{value}</TableCell>)}</TableRow></TableHead>
                        <TableBody>{requests.map(row => <TableRow key={row.id}>
                            <TableCell>{new Date(row.created_at).toLocaleDateString()}</TableCell><TableCell>{row.request_type}</TableCell><TableCell>{row.title}</TableCell><TableCell>{row.priority}</TableCell>
                            <TableCell><Chip size="small" label={row.status.replace('_', ' ')} /></TableCell><TableCell>{row.resolution || 'No update yet'}</TableCell>
                        </TableRow>)}{!requests.length && <TableRow><TableCell colSpan={6} align="center">No requests yet</TableCell></TableRow>}</TableBody>
                    </Table>
                </TableContainer>
            </>}

            {tab === 1 && <>
                <Alert severity="info" sx={{ mb: 2 }}>Register expected visitors here. Hostel staff record arrival and departure at the gate.</Alert>
                <Paper component="form" onSubmit={registerVisitor} sx={{ p: 2, mb: 3 }}>
                    <Typography variant="h6" gutterBottom>Register a visitor</Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
                        <TextField label="Visitor name" required value={visitorForm.visitor_name} onChange={e => setVisitorForm({ ...visitorForm, visitor_name: e.target.value })} />
                        <TextField label="Phone (optional)" value={visitorForm.visitor_phone} onChange={e => setVisitorForm({ ...visitorForm, visitor_phone: e.target.value })} />
                        <TextField label="Purpose" required value={visitorForm.purpose} onChange={e => setVisitorForm({ ...visitorForm, purpose: e.target.value })} />
                    </Box>
                    <Button type="submit" variant="contained" sx={{ mt: 2 }}>Register visitor</Button>
                </Paper>
                <TableContainer component={Paper}><Table size="small">
                    <TableHead><TableRow>{['Visitor', 'Purpose', 'Status', 'Expected / arrival', 'Departure'].map(value => <TableCell key={value}>{value}</TableCell>)}</TableRow></TableHead>
                    <TableBody>{visitors.map(row => <TableRow key={row.id}><TableCell>{row.visitor_name}{row.visitor_phone ? ` (${row.visitor_phone})` : ''}</TableCell><TableCell>{row.purpose}</TableCell><TableCell><Chip size="small" label={row.status.replace('_', ' ')} /></TableCell><TableCell>{row.arrival_at ? new Date(row.arrival_at).toLocaleString() : 'Expected'}</TableCell><TableCell>{row.departure_at ? new Date(row.departure_at).toLocaleString() : '—'}</TableCell></TableRow>)}
                        {!visitors.length && <TableRow><TableCell colSpan={5} align="center">No visitors registered</TableCell></TableRow>}</TableBody>
                </Table></TableContainer>
            </>}

            {tab === 2 && <>
                <Paper sx={{ p: 2, mb: 3 }}>
                    <Typography variant="h6" gutterBottom>Outstanding balances</Typography>
                    <TableContainer><Table size="small"><TableHead><TableRow>{['Room', 'Semester', 'Amount due', 'Paid', 'Balance'].map(value => <TableCell key={value}>{value}</TableCell>)}</TableRow></TableHead>
                        <TableBody>{balances.map(row => <TableRow key={row.booking_id}><TableCell>{row.hostel} {row.room_number}</TableCell><TableCell>{row.semester}</TableCell><TableCell>KES {Number(row.amount_due).toLocaleString()}</TableCell><TableCell>KES {Number(row.amount_paid).toLocaleString()}</TableCell><TableCell>KES {Number(row.balance).toLocaleString()}</TableCell></TableRow>)}
                            {!balances.length && <TableRow><TableCell colSpan={5} align="center">No outstanding approved bookings</TableCell></TableRow>}</TableBody>
                    </Table></TableContainer>
                </Paper>
                <Paper sx={{ p: 2, mb: 3 }}>
                    <Typography variant="h6" gutterBottom>Payment history</Typography>
                    <TableContainer><Table size="small"><TableHead><TableRow>{['Date', 'Room', 'Amount', 'Method', 'Status', 'Receipt'].map(value => <TableCell key={value}>{value}</TableCell>)}</TableRow></TableHead>
                        <TableBody>{payments.map(row => <TableRow key={row.id}><TableCell>{new Date(row.payment_date).toLocaleDateString()}</TableCell><TableCell>{row.room_number}</TableCell><TableCell>KES {Number(row.amount).toLocaleString()}</TableCell><TableCell>{formatPaymentMethod(row.payment_method)}</TableCell><TableCell>{row.status}</TableCell><TableCell><Button size="small" onClick={() => openReceipt(row.id)}>View</Button></TableCell></TableRow>)}
                            {!payments.length && <TableRow><TableCell colSpan={6} align="center">No payments found</TableCell></TableRow>}</TableBody>
                    </Table></TableContainer>
                </Paper>
            </>}

            <Dialog open={Boolean(receipt)} onClose={() => setReceipt(null)} maxWidth="sm" fullWidth>
                <DialogTitle>Payment receipt</DialogTitle>
                <DialogContent dividers>{receipt && <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                    {[
                        ['Receipt ID', receipt.id], ['Student', receipt.full_name], ['Registration', receipt.reg_no],
                        ['Room', `${receipt.hostel} ${receipt.room_number}`], ['Campus', receipt.campus], ['Semester', receipt.semester],
                        ['Amount', `KES ${Number(receipt.amount).toLocaleString()}`], ['Method', formatPaymentMethod(receipt.payment_method)],
                        ['Reference', receipt.mpesa_code || '—'], ['Status', receipt.status],
                        ['Date', new Date(receipt.payment_date).toLocaleString()],
                    ].map(([label, value]) => <Box key={label}><Typography variant="caption" color="text.secondary">{label}</Typography><Typography>{value}</Typography></Box>)}
                </Box>}</DialogContent>
                <DialogActions><Button onClick={() => window.print()}>Print</Button><Button onClick={() => setReceipt(null)}>Close</Button></DialogActions>
            </Dialog>
        </Box>
    );
}