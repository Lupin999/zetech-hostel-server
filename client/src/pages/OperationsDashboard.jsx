import { useEffect, useMemo, useState } from 'react';
import {
    Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent,
    DialogTitle, MenuItem, Paper, Tab, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Tabs, TextField, Typography,
} from '@mui/material';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const tabsByRole = {
    admin: ['Stays', 'Students', 'Requests', 'Visitors', 'Inspections', 'Finance', 'Reports', 'Audit'],
    accounts: ['Finance', 'Reports'],
    warden: ['Stays', 'Requests', 'Visitors', 'Inspections'],
};

const csvDownload = (name, rows) => {
    if (!rows.length) return toast.error('There is no data to export');
    const quote = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
    const csv = [Object.keys(rows[0]), ...rows.map(row => Object.values(row))].map(row => row.map(quote).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    URL.revokeObjectURL(url);
};

export default function OperationsDashboard() {
    const { user } = useAuth();
    const tabs = tabsByRole[user?.role] || [];
    const [tab, setTab] = useState(0);
    const [rows, setRows] = useState([]);
    const [financePayments, setFinancePayments] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [search, setSearch] = useState('');
    const [report, setReport] = useState(null);
    const [dateDialog, setDateDialog] = useState(null);
    const [inspectionDialog, setInspectionDialog] = useState(false);
    const [inspectionForm, setInspectionForm] = useState({ room_id: '', condition_status: 'good', cleanliness: 'clean', safety_status: 'clear', notes: '' });
    const [dateRange, setDateRange] = useState(() => {
        const now = new Date();
        return { from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) };
    });
    const activeTab = tabs[tab];
    const reportRows = useMemo(() => report?.payment_rows || [], [report]);

    const load = async () => {
        try {
            if (activeTab === 'Stays') setRows((await api.get('/operations/stays')).data);
            if (activeTab === 'Students') setRows((await api.get('/operations/students', { params: { search } })).data);
            if (activeTab === 'Requests') setRows((await api.get('/operations/requests')).data);
            if (activeTab === 'Visitors') setRows((await api.get('/operations/visitors')).data);
            if (activeTab === 'Inspections') {
                const [inspectionRes, roomRes] = await Promise.all([api.get('/operations/inspections'), api.get('/rooms')]);
                setRows(inspectionRes.data);
                setRooms(roomRes.data);
            }
            if (activeTab === 'Finance') {
                const [refundRes, paymentRes] = await Promise.all([api.get('/operations/refunds'), api.get('/payments/all')]);
                setRows(refundRes.data);
                setFinancePayments(paymentRes.data);
            }
            if (activeTab === 'Audit') setRows((await api.get('/operations/audit')).data);
        } catch (error) { toast.error(error.response?.data?.error || 'Could not load operations data'); }
    };

    useEffect(() => {
        if (!activeTab || activeTab === 'Reports') return undefined;
        let active = true;
        const request = activeTab === 'Stays' ? api.get('/operations/stays')
            : activeTab === 'Students' ? api.get('/operations/students', { params: { search } })
                : activeTab === 'Requests' ? api.get('/operations/requests')
                        : activeTab === 'Visitors' ? api.get('/operations/visitors')
                            : activeTab === 'Inspections' ? Promise.all([api.get('/operations/inspections'), api.get('/rooms')])
                        : activeTab === 'Finance' ? Promise.all([api.get('/operations/refunds'), api.get('/payments/all')])
                            : api.get('/operations/audit');
        request.then(response => {
            if (!active) return;
            if (activeTab === 'Finance') {
                setRows(response[0].data);
                setFinancePayments(response[1].data);
            } else if (activeTab === 'Inspections') {
                setRows(response[0].data);
                setRooms(response[1].data);
            } else setRows(response.data);
        })
            .catch(error => toast.error(error.response?.data?.error || 'Could not load operations data'));
        return () => { active = false; };
    }, [activeTab, search]);

    const runReport = async (event) => {
        event?.preventDefault();
        try { setReport((await api.get('/operations/reports', { params: dateRange })).data); }
        catch (error) { toast.error(error.response?.data?.error || 'Could not load report'); }
    };

    const changeStayStatus = async (id, action) => {
        try { await api.put(`/operations/stays/${id}/${action}`); await load(); toast.success(action === 'check-in' ? 'Resident checked in' : 'Resident checked out'); }
        catch (error) { toast.error(error.response?.data?.error || 'Could not update stay'); }
    };

    const saveStayDates = async (event) => {
        event.preventDefault();
        try {
            await api.put(`/operations/stays/${dateDialog.id}/dates`, {
                arrival_date: dateDialog.arrival_date || null,
                departure_date: dateDialog.departure_date || null,
            });
            setDateDialog(null);
            await load();
            toast.success('Stay dates updated');
        } catch (error) { toast.error(error.response?.data?.error || 'Could not update stay dates'); }
    };

    const recordInspection = async (event) => {
        event.preventDefault();
        try {
            await api.post('/operations/inspections', { ...inspectionForm, room_id: Number(inspectionForm.room_id) });
            setInspectionDialog(false);
            setInspectionForm({ room_id: '', condition_status: 'good', cleanliness: 'clean', safety_status: 'clear', notes: '' });
            await load();
            toast.success('Inspection recorded');
        } catch (error) { toast.error(error.response?.data?.error || 'Could not record inspection'); }
    };

    const setRoomStatus = async (roomId, status) => {
        try {
            await api.patch(`/operations/rooms/${roomId}/status`, { status });
            await load();
            toast.success('Room status updated');
        } catch (error) { toast.error(error.response?.data?.error || 'Could not update room status'); }
    };

    const updateRole = async (id, role) => {
        try { await api.patch(`/operations/students/${id}/role`, { role }); await load(); toast.success('Role updated'); }
        catch (error) { toast.error(error.response?.data?.error || 'Could not update role'); }
    };

    const updateRequest = async (row, status) => {
        const resolution = ['resolved', 'closed'].includes(status)
            ? window.prompt('Resolution note (optional):', row.resolution || '') : row.resolution || '';
        if (resolution === null) return;
        try { await api.patch(`/operations/requests/${row.id}`, { status, resolution }); await load(); toast.success('Request updated'); }
        catch (error) { toast.error(error.response?.data?.error || 'Could not update request'); }
    };

    const updateVisitor = async (row, status) => {
        try { await api.patch(`/operations/visitors/${row.id}/status`, { status }); await load(); toast.success('Visitor status updated'); }
        catch (error) { toast.error(error.response?.data?.error || 'Could not update visitor'); }
    };

    const reviewRefund = async (row, status) => {
        try { await api.patch(`/operations/refunds/${row.id}/review`, { status }); await load(); toast.success(`Refund ${status}`); }
        catch (error) { toast.error(error.response?.data?.error || 'Could not review refund'); }
    };

    const processRefund = async (row) => {
        const external_reference = window.prompt('Enter bank or M-Pesa transaction reference:');
        if (!external_reference?.trim()) return;
        try { await api.patch(`/operations/refunds/${row.id}/process`, { external_reference }); await load(); toast.success('Refund marked processed'); }
        catch (error) { toast.error(error.response?.data?.error || 'Could not process refund'); }
    };

    const confirmPayment = async (payment) => {
        try {
            await api.patch(`/payments/${payment.id}/confirm`);
            await load();
            toast.success('Payment confirmed');
        } catch (error) { toast.error(error.response?.data?.error || 'Could not confirm payment'); }
    };

    if (!tabs.length) return <Alert severity="error">Your account does not have access to operations management.</Alert>;

    return <Box>
        <Typography variant="h4" fontWeight={700} gutterBottom>Operations</Typography>
        <Tabs value={tab} onChange={(_, value) => { setTab(value); setRows([]); }} variant="scrollable" scrollButtons="auto" sx={{ mb: 2 }}>
            {tabs.map(label => <Tab key={label} label={label} />)}
        </Tabs>

        {activeTab === 'Stays' && <TableContainer component={Paper}><Table size="small"><TableHead><TableRow>{['Resident', 'Room / bed', 'Arrival', 'Departure', 'Payment', 'Stay status', 'Action'].map(value => <TableCell key={value}>{value}</TableCell>)}</TableRow></TableHead>
            <TableBody>{rows.map(row => <TableRow key={row.id}><TableCell>{row.full_name}<br /><Typography variant="caption">{row.reg_no}</Typography></TableCell><TableCell>{row.hostel} {row.room_number} {row.bed_number ? `· Bed ${row.bed_number}` : ''}</TableCell><TableCell>{row.arrival_date ? new Date(row.arrival_date).toLocaleDateString() : '—'}</TableCell><TableCell>{row.departure_date ? new Date(row.departure_date).toLocaleDateString() : '—'}</TableCell><TableCell>{Number(row.confirmed_payments) ? <Chip size="small" color="success" label="Confirmed" /> : <Chip size="small" color="warning" label="Unpaid" />}</TableCell><TableCell>{row.checked_out_at ? 'Checked out' : row.checked_in_at ? `In since ${new Date(row.checked_in_at).toLocaleString()}` : 'Not checked in'}</TableCell><TableCell>{!row.checked_out_at && <Button size="small" onClick={() => setDateDialog({ id: row.id, arrival_date: row.arrival_date?.slice(0, 10) || '', departure_date: row.departure_date?.slice(0, 10) || '' })}>Dates</Button>}{!row.checked_in_at && !row.checked_out_at && <Button size="small" disabled={!Number(row.confirmed_payments)} onClick={() => changeStayStatus(row.id, 'check-in')}>Check in</Button>}{row.checked_in_at && !row.checked_out_at && <Button size="small" color="warning" onClick={() => changeStayStatus(row.id, 'check-out')}>Check out</Button>}</TableCell></TableRow>)}
                {!rows.length && <TableRow><TableCell colSpan={7} align="center">No approved stays</TableCell></TableRow>}</TableBody></Table></TableContainer>}

        {activeTab === 'Students' && <>
            <TextField label="Search students" size="small" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') load(); }} sx={{ mb: 2, minWidth: 280 }} />
            <Button onClick={load} sx={{ ml: 1, mt: 0.5 }}>Search</Button>
            <TableContainer component={Paper}><Table size="small"><TableHead><TableRow>{['Student', 'Registration', 'Email', 'Phone', 'Current room', 'Role'].map(value => <TableCell key={value}>{value}</TableCell>)}</TableRow></TableHead>
                <TableBody>{rows.map(row => <TableRow key={row.id}><TableCell>{row.full_name}</TableCell><TableCell>{row.reg_no}</TableCell><TableCell>{row.email}</TableCell><TableCell>{row.phone || '—'}</TableCell><TableCell>{row.current_room || '—'}</TableCell><TableCell><TextField select size="small" value={row.role} onChange={e => updateRole(row.id, e.target.value)} disabled={row.id === user.id} sx={{ minWidth: 120 }}>{['student', 'admin', 'accounts', 'warden'].map(role => <MenuItem key={role} value={role}>{role}</MenuItem>)}</TextField></TableCell></TableRow>)}
                    {!rows.length && <TableRow><TableCell colSpan={6} align="center">No students found</TableCell></TableRow>}</TableBody></Table></TableContainer>
        </>}

        {activeTab === 'Requests' && <TableContainer component={Paper}><Table size="small"><TableHead><TableRow>{['Created', 'Student', 'Room', 'Type / priority', 'Request', 'Status', 'Update'].map(value => <TableCell key={value}>{value}</TableCell>)}</TableRow></TableHead>
            <TableBody>{rows.map(row => <TableRow key={row.id}><TableCell>{new Date(row.created_at).toLocaleDateString()}</TableCell><TableCell>{row.full_name}<br />{row.reg_no}</TableCell><TableCell>{row.hostel || '—'} {row.room_number || ''}</TableCell><TableCell>{row.request_type}<br />{row.priority}</TableCell><TableCell>{row.title}<br /><Typography variant="caption">{row.description}</Typography></TableCell><TableCell>{row.status.replace('_', ' ')}</TableCell><TableCell><TextField select size="small" value={row.status} onChange={e => updateRequest(row, e.target.value)} sx={{ minWidth: 130 }}>{['open', 'in_progress', 'resolved', 'closed'].map(status => <MenuItem key={status} value={status}>{status.replace('_', ' ')}</MenuItem>)}</TextField></TableCell></TableRow>)}
                {!rows.length && <TableRow><TableCell colSpan={7} align="center">No service requests</TableCell></TableRow>}</TableBody></Table></TableContainer>}

        {activeTab === 'Visitors' && <TableContainer component={Paper}><Table size="small"><TableHead><TableRow>{['Visitor', 'Resident', 'Purpose', 'Status', 'Arrival', 'Departure', 'Action'].map(value => <TableCell key={value}>{value}</TableCell>)}</TableRow></TableHead>
            <TableBody>{rows.map(row => <TableRow key={row.id}><TableCell>{row.visitor_name}<br />{row.visitor_phone}</TableCell><TableCell>{row.resident_name}<br />{row.reg_no}</TableCell><TableCell>{row.purpose}</TableCell><TableCell>{row.status.replace('_', ' ')}</TableCell><TableCell>{row.arrival_at ? new Date(row.arrival_at).toLocaleString() : '—'}</TableCell><TableCell>{row.departure_at ? new Date(row.departure_at).toLocaleString() : '—'}</TableCell><TableCell>{row.status === 'expected' && <><Button size="small" onClick={() => updateVisitor(row, 'checked_in')}>Check in</Button><Button size="small" color="error" onClick={() => updateVisitor(row, 'cancelled')}>Cancel</Button></>}{row.status === 'checked_in' && <Button size="small" onClick={() => updateVisitor(row, 'checked_out')}>Check out</Button>}</TableCell></TableRow>)}
                {!rows.length && <TableRow><TableCell colSpan={7} align="center">No visitor records</TableCell></TableRow>}</TableBody></Table></TableContainer>}

        {activeTab === 'Inspections' && <>
            <Button variant="contained" sx={{ mb: 2 }} onClick={() => setInspectionDialog(true)}>Record inspection</Button>
            <TableContainer component={Paper}><Table size="small"><TableHead><TableRow>{['Date', 'Room', 'Inspector', 'Condition', 'Cleanliness', 'Safety', 'Room status', 'Notes'].map(value => <TableCell key={value}>{value}</TableCell>)}</TableRow></TableHead>
                <TableBody>{rows.map(row => <TableRow key={row.id}><TableCell>{new Date(row.inspected_at).toLocaleString()}</TableCell><TableCell>{row.hostel} {row.room_number}</TableCell><TableCell>{row.inspector_name || '—'}</TableCell><TableCell>{row.condition_status.replace('_', ' ')}</TableCell><TableCell>{row.cleanliness.replace('_', ' ')}</TableCell><TableCell>{row.safety_status.replace('_', ' ')}</TableCell><TableCell><TextField select size="small" value={row.room_status} onChange={e => setRoomStatus(row.room_id, e.target.value)} sx={{ minWidth: 140 }}>{['available', 'full', 'maintenance'].map(status => <MenuItem key={status} value={status}>{status}</MenuItem>)}</TextField></TableCell><TableCell>{row.notes || '—'}</TableCell></TableRow>)}
                    {!rows.length && <TableRow><TableCell colSpan={8} align="center">No inspections recorded</TableCell></TableRow>}</TableBody></Table></TableContainer>
        </>}

        {activeTab === 'Finance' && <>
            <Alert severity="info" sx={{ mb: 2 }}>Refund approval is a review record; process the transfer through your bank or M-Pesa provider, then mark it processed with its transaction reference.</Alert>
            <Typography variant="h6" sx={{ mb: 1 }}>Payment verification</Typography>
            <TableContainer component={Paper} sx={{ mb: 3 }}><Table size="small"><TableHead><TableRow>{['Date', 'Student', 'Registration', 'Room', 'Method', 'Reference', 'Amount', 'Status', 'Action'].map(value => <TableCell key={value}>{value}</TableCell>)}</TableRow></TableHead>
                <TableBody>{financePayments.map(payment => <TableRow key={payment.id}><TableCell>{new Date(payment.payment_date).toLocaleDateString()}</TableCell><TableCell>{payment.full_name}</TableCell><TableCell>{payment.reg_no}</TableCell><TableCell>{payment.hostel} {payment.room_number}</TableCell><TableCell>{payment.payment_method}</TableCell><TableCell>{payment.mpesa_code || '—'}</TableCell><TableCell>KES {Number(payment.amount).toLocaleString()}</TableCell><TableCell>{payment.status}</TableCell><TableCell>{payment.status === 'pending' && <Button size="small" onClick={() => confirmPayment(payment)}>Confirm</Button>}</TableCell></TableRow>)}
                    {!financePayments.length && <TableRow><TableCell colSpan={9} align="center">No payments found</TableCell></TableRow>}</TableBody></Table></TableContainer>
            <TableContainer component={Paper}><Table size="small"><TableHead><TableRow>{['Date', 'Student', 'Payment', 'Refund', 'Reason', 'Status', 'Action'].map(value => <TableCell key={value}>{value}</TableCell>)}</TableRow></TableHead>
                <TableBody>{rows.map(row => <TableRow key={row.id}><TableCell>{new Date(row.created_at).toLocaleDateString()}</TableCell><TableCell>{row.full_name}<br />{row.reg_no}</TableCell><TableCell>#{row.payment_id} · KES {Number(row.payment_amount).toLocaleString()}</TableCell><TableCell>KES {Number(row.amount).toLocaleString()}</TableCell><TableCell>{row.reason}</TableCell><TableCell>{row.status}{row.external_reference ? <><br />Ref: {row.external_reference}</> : ''}</TableCell><TableCell>{row.status === 'pending' && <><Button size="small" onClick={() => reviewRefund(row, 'approved')}>Approve</Button><Button size="small" color="error" onClick={() => reviewRefund(row, 'rejected')}>Reject</Button></>}{row.status === 'approved' && <Button size="small" onClick={() => processRefund(row)}>Mark processed</Button>}</TableCell></TableRow>)}
                    {!rows.length && <TableRow><TableCell colSpan={7} align="center">No refund requests</TableCell></TableRow>}</TableBody></Table></TableContainer>
        </>}

        {activeTab === 'Reports' && <>
            <Paper component="form" onSubmit={runReport} sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', p: 2, mb: 2 }}>
                <TextField type="date" label="From" size="small" InputLabelProps={{ shrink: true }} value={dateRange.from} onChange={e => setDateRange({ ...dateRange, from: e.target.value })} />
                <TextField type="date" label="To" size="small" InputLabelProps={{ shrink: true }} value={dateRange.to} onChange={e => setDateRange({ ...dateRange, to: e.target.value })} />
                <Button type="submit" variant="contained">Run report</Button>
                {report && <>
                    <Button onClick={() => csvDownload(`hostel-payments-${dateRange.from}-${dateRange.to}.csv`, reportRows)}>Export payments CSV</Button>
                    <Button onClick={() => csvDownload('hostel-outstanding-balances.csv', report.balance_rows)}>Export balances CSV</Button>
                </>}
            </Paper>
            {report && <>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2, mb: 2 }}>
                    {[
                        ['Bookings', report.bookings.reduce((sum, row) => sum + Number(row.total), 0)],
                        ['Rooms / beds', `${report.rooms.rooms} / ${report.rooms.beds}`],
                        ['Confirmed income', `KES ${Number(report.payments.collected).toLocaleString()}`],
                        ['Pending payments', `KES ${Number(report.payments.pending).toLocaleString()}`],
                        ['Outstanding balance', `KES ${report.balance_rows.reduce((sum, row) => sum + Number(row.balance), 0).toLocaleString()}`],
                        ['Occupied beds', report.rooms.occupied], ['Visitors inside', report.visitors_checked_in],
                        ['Open requests', report.requests.filter(row => ['open', 'in_progress'].includes(row.status)).reduce((sum, row) => sum + Number(row.total), 0)],
                    ].map(([label, value]) => <Paper key={label} sx={{ p: 2 }}><Typography variant="caption" color="text.secondary">{label}</Typography><Typography variant="h6" fontWeight={700}>{value}</Typography></Paper>)}
                </Box>
                <Typography variant="h6" sx={{ mb: 1 }}>Outstanding balances</Typography>
                <TableContainer component={Paper} sx={{ mb: 3 }}><Table size="small"><TableHead><TableRow>{['Student', 'Registration', 'Room', 'Semester', 'Due', 'Paid', 'Balance'].map(value => <TableCell key={value}>{value}</TableCell>)}</TableRow></TableHead>
                    <TableBody>{report.balance_rows.map(row => <TableRow key={row.booking_id}><TableCell>{row.full_name}</TableCell><TableCell>{row.reg_no}</TableCell><TableCell>{row.hostel} {row.room_number}</TableCell><TableCell>{row.semester}</TableCell><TableCell>KES {Number(row.amount_due).toLocaleString()}</TableCell><TableCell>KES {Number(row.amount_paid).toLocaleString()}</TableCell><TableCell>KES {Number(row.balance).toLocaleString()}</TableCell></TableRow>)}
                        {!report.balance_rows.length && <TableRow><TableCell colSpan={7} align="center">No approved bookings</TableCell></TableRow>}</TableBody></Table></TableContainer>
                <TableContainer component={Paper}><Table size="small"><TableHead><TableRow>{['Date', 'Student', 'Reg No', 'Room', 'Method', 'Reference', 'Amount', 'Status'].map(value => <TableCell key={value}>{value}</TableCell>)}</TableRow></TableHead>
                    <TableBody>{reportRows.map(row => <TableRow key={row.id}><TableCell>{new Date(row.payment_date).toLocaleDateString()}</TableCell><TableCell>{row.full_name}</TableCell><TableCell>{row.reg_no}</TableCell><TableCell>{row.hostel} {row.room_number}</TableCell><TableCell>{row.payment_method}</TableCell><TableCell>{row.mpesa_code || '—'}</TableCell><TableCell>KES {Number(row.amount).toLocaleString()}</TableCell><TableCell>{row.status}</TableCell></TableRow>)}
                        {!reportRows.length && <TableRow><TableCell colSpan={8} align="center">No payments for this period</TableCell></TableRow>}</TableBody></Table></TableContainer>
            </>}
        </>}

        {activeTab === 'Audit' && <><Button sx={{ mb: 1 }} onClick={() => csvDownload('hostel-admin-audit.csv', rows)}>Export CSV</Button>
            <TableContainer component={Paper}><Table size="small"><TableHead><TableRow>{['When', 'Staff', 'Action', 'Record', 'Details'].map(value => <TableCell key={value}>{value}</TableCell>)}</TableRow></TableHead>
                <TableBody>{rows.map(row => <TableRow key={row.id}><TableCell>{new Date(row.created_at).toLocaleString()}</TableCell><TableCell>{row.actor_name || 'Deleted account'}</TableCell><TableCell>{row.action}</TableCell><TableCell>{row.entity_type} {row.entity_id || ''}</TableCell><TableCell>{typeof row.details === 'string' ? row.details : JSON.stringify(row.details || {})}</TableCell></TableRow>)}
                    {!rows.length && <TableRow><TableCell colSpan={5} align="center">No audit activity recorded yet</TableCell></TableRow>}</TableBody></Table></TableContainer>
        </>}
        <Dialog open={Boolean(dateDialog)} onClose={() => setDateDialog(null)} maxWidth="xs" fullWidth>
            <Box component="form" onSubmit={saveStayDates}>
                <DialogTitle>Planned stay dates</DialogTitle>
                <DialogContent sx={{ display: 'grid', gap: 2, pt: '8px !important' }}>
                    <TextField type="date" label="Arrival" InputLabelProps={{ shrink: true }} value={dateDialog?.arrival_date || ''} onChange={e => setDateDialog({ ...dateDialog, arrival_date: e.target.value })} />
                    <TextField type="date" label="Departure" InputLabelProps={{ shrink: true }} value={dateDialog?.departure_date || ''} onChange={e => setDateDialog({ ...dateDialog, departure_date: e.target.value })} />
                </DialogContent>
                <DialogActions><Button onClick={() => setDateDialog(null)}>Cancel</Button><Button type="submit" variant="contained">Save dates</Button></DialogActions>
            </Box>
        </Dialog>
        <Dialog open={inspectionDialog} onClose={() => setInspectionDialog(false)} maxWidth="sm" fullWidth>
            <Box component="form" onSubmit={recordInspection}>
                <DialogTitle>Record room inspection</DialogTitle>
                <DialogContent sx={{ display: 'grid', gap: 2, pt: '8px !important' }}>
                    <TextField select label="Room" required value={inspectionForm.room_id} onChange={e => setInspectionForm({ ...inspectionForm, room_id: e.target.value })}>
                        {rooms.map(room => <MenuItem key={room.id} value={room.id}>{room.hostel} {room.room_number} · {room.campus}</MenuItem>)}
                    </TextField>
                    <TextField select label="Condition" value={inspectionForm.condition_status} onChange={e => setInspectionForm({ ...inspectionForm, condition_status: e.target.value })}>
                        <MenuItem value="good">Good</MenuItem><MenuItem value="attention_required">Attention required</MenuItem><MenuItem value="uninhabitable">Uninhabitable</MenuItem>
                    </TextField>
                    <TextField select label="Cleanliness" value={inspectionForm.cleanliness} onChange={e => setInspectionForm({ ...inspectionForm, cleanliness: e.target.value })}>
                        <MenuItem value="clean">Clean</MenuItem><MenuItem value="needs_cleaning">Needs cleaning</MenuItem><MenuItem value="poor">Poor</MenuItem>
                    </TextField>
                    <TextField select label="Safety" value={inspectionForm.safety_status} onChange={e => setInspectionForm({ ...inspectionForm, safety_status: e.target.value })}>
                        <MenuItem value="clear">No issue found</MenuItem><MenuItem value="issue_found">Issue found</MenuItem>
                    </TextField>
                    <TextField label="Notes / action needed" multiline minRows={3} value={inspectionForm.notes} onChange={e => setInspectionForm({ ...inspectionForm, notes: e.target.value })} />
                </DialogContent>
                <DialogActions><Button onClick={() => setInspectionDialog(false)}>Cancel</Button><Button type="submit" variant="contained" disabled={!rooms.length}>Save inspection</Button></DialogActions>
            </Box>
        </Dialog>
    </Box>;
}