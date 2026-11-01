import { useEffect, useMemo, useState } from 'react';
import {
    Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent,
    DialogTitle, MenuItem, Paper, Tab, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Tabs, TextField, Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { formatHostelName, formatPaymentMethod, formatRoomNumber } from '../utils/helpers';

const tabsByRole = {
    admin: ['Stays', 'History', 'Checkout Requests', 'Periods', 'Students', 'Requests', 'Visitors', 'Inspections', 'Payments', 'Reports', 'Audit'],
    accounts: ['Payments', 'Reports'],
    warden: ['Stays', 'History', 'Checkout Requests', 'Requests', 'Visitors', 'Inspections'],
};

const addMonthsToDate = (dateValue, months) => {
    if (!dateValue) return undefined;
    const [year, month, day] = dateValue.split('-').map(Number);
    const targetMonth = month - 1 + months;
    const targetYear = year + Math.floor(targetMonth / 12);
    const normalizedMonth = targetMonth % 12;
    const lastDay = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
    return `${targetYear}-${String(normalizedMonth + 1).padStart(2, '0')}-${String(Math.min(day, lastDay)).padStart(2, '0')}`;
};

const parseAuditDetails = (details) => {
    if (!details) return {};
    if (typeof details !== 'string') return details;
    try { return JSON.parse(details); }
    catch { return { summary: details }; }
};

const presentAuditRow = (row) => {
    const details = parseAuditDetails(row.details);
    const changes = details.changes || {};
    const rawAction = row.action || '';
    const genericAction = /^(POST|PUT|PATCH|DELETE)\s+(.+)$/i.exec(rawAction);
    const method = genericAction?.[1]?.toUpperCase();
    const endpoint = (genericAction?.[2] || details.route || '')
        .replace(/^\/api\//, '')
        .split('/')
        .filter((part) => part && !/^\d+$/.test(part))
        .join('/');
    const status = String(changes.status || '').toLowerCase();
    const labels = {
        'user.role.updated': 'Changed user role',
        'stay.checked_in': 'Checked resident in',
        'stay.checked_out': 'Checked resident out',
        'stay.dates_updated': 'Updated resident stay dates',
        'stay.checkout_approved': 'Approved checkout request',
        'stay.checkout_declined': 'Declined checkout request',
        'bookings/status': status === 'approved' ? 'Approved booking' : status === 'rejected' ? 'Rejected booking' : 'Updated booking status',
        'bookings/suspend': 'Changed booking suspension',
        'payments/confirm': 'Confirmed payment',
        'notifications/send': 'Sent a message',
        'auth/login': 'Signed in',
        'auth/profile': 'Updated account profile',
        'rooms': method === 'DELETE' ? 'Removed room' : method === 'POST' ? 'Created room' : 'Updated room',
        'notices': method === 'DELETE' ? 'Removed notice' : method === 'POST' ? 'Posted notice' : 'Updated notice',
        'operations/checkout-requests/decision': 'Reviewed checkout request',
        'operations/inspections': 'Recorded room inspection',
        'operations/periods': method === 'POST' ? 'Created hostel period' : 'Updated hostel period',
        'operations/visitors': 'Updated visitor record',
        'operations/requests': 'Updated service request',
        'operations/stays': 'Updated resident stay',
    };
    const action = labels[rawAction] || labels[endpoint] ||
        rawAction.replaceAll('.', ' ').replaceAll('_', ' ');
    const entity = {
        bookings: 'Booking',
        payments: 'Payment',
        rooms: 'Room',
        users: 'User',
        notices: 'Notice',
        notifications: 'Notification',
    }[row.entity_type] || (row.entity_type || 'Record').replaceAll('_', ' ');
    const targetName = details.target_name;
    const roomNumber = changes.room_number;
    const record = targetName
        ? `User: ${targetName} (ID ${row.entity_id})`
        : roomNumber
            ? `Room ${roomNumber}${changes.hostel ? ` · ${formatHostelName(changes.hostel)}` : ''}`
            : `${entity}${row.entity_id ? ` ${row.entity_id}` : ''}`;
    const detailLines = [];
    if (details.previous_role || changes.role || details.role) {
        const roleName = (value) => String(value || '').replaceAll('_', ' ')
            .replace(/\b\w/g, (letter) => letter.toUpperCase());
        detailLines.push(`Role: ${details.previous_role ? `${roleName(details.previous_role)} → ` : ''}${roleName(changes.role || details.role)}`);
    }
    const displayChanges = { ...changes };
    delete displayChanges.role;
    delete displayChanges.room_number;
    const readableChanges = Object.entries(displayChanges)
        .map(([key, value]) => `${key.replaceAll('_', ' ')}: ${String(value)}`)
        .join('; ');
    if (readableChanges) detailLines.push(readableChanges);
    if (details.summary) detailLines.push(details.summary);
    if (!detailLines.length) detailLines.push('No additional details recorded');
    return { action, record, details: detailLines.join('; '), parsedDetails: details };
};

const csvDownload = (name, rows) => {
    if (!rows.length) return toast.error('There is no data to export');
    const quote = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
    const formatValue = (value) => value && typeof value === 'object' ? JSON.stringify(value) : value;
    const csv = [Object.keys(rows[0]), ...rows.map(row => Object.values(row).map(formatValue))].map(row => row.map(quote).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    URL.revokeObjectURL(url);
};

const auditCsvRows = (rows) => rows.map((row) => {
    const audit = presentAuditRow(row);

    return {
        Timestamp: row.created_at,
        'Staff member': row.actor_name || '',
        Email: row.actor_email || '',
        Action: audit.action,
        Record: audit.record,
        Details: audit.details,
    };
});

export default function OperationsDashboard() {
    const { user } = useAuth();
    const tabs = tabsByRole[user?.role] || [];
    const [tab, setTab] = useState(0);
    const [rows, setRows] = useState([]);
    const [financePayments, setFinancePayments] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [search, setSearch] = useState('');
    const [report, setReport] = useState(null);
    const [periodForm, setPeriodForm] = useState({
        campus: '', hostel: 'Boys', semester: '', opens_on: new Date().toISOString().slice(0, 10), duration_months: 3,
    });
    const [dateDialog, setDateDialog] = useState(null);
    const [inspectionDialog, setInspectionDialog] = useState(false);
    const [auditUpdatedAt, setAuditUpdatedAt] = useState(null);
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
            if (activeTab === 'History') setRows((await api.get('/operations/history', { params: { search } })).data);
            if (activeTab === 'Checkout Requests') setRows((await api.get('/operations/checkout-requests')).data);
            if (activeTab === 'Periods') {
                const [periodRes, roomRes] = await Promise.all([api.get('/operations/periods'), api.get('/rooms')]);
                setRows(periodRes.data);
                setRooms(roomRes.data);
                if (!periodForm.campus && roomRes.data.length) setPeriodForm((current) => ({ ...current, campus: roomRes.data[0].campus }));
            }
            if (activeTab === 'Students') setRows((await api.get('/operations/students', { params: { search } })).data);
            if (activeTab === 'Requests') setRows((await api.get('/operations/requests')).data);
            if (activeTab === 'Visitors') setRows((await api.get('/operations/visitors')).data);
            if (activeTab === 'Inspections') {
                const [inspectionRes, roomRes] = await Promise.all([api.get('/operations/inspections'), api.get('/rooms')]);
                setRows(inspectionRes.data);
                setRooms(roomRes.data);
            }
            if (activeTab === 'Payments') setFinancePayments((await api.get('/payments/all')).data);
            if (activeTab === 'Audit') {
                setRows((await api.get('/operations/audit')).data);
                setAuditUpdatedAt(new Date());
            }
        } catch (error) { toast.error(error.response?.data?.error || 'Could not load operations data'); }
    };

    useEffect(() => {
        if (!activeTab || activeTab === 'Reports') return undefined;
        let active = true;
        const request = activeTab === 'Stays' ? api.get('/operations/stays')
            : activeTab === 'History' ? api.get('/operations/history', { params: { search } })
                : activeTab === 'Checkout Requests' ? api.get('/operations/checkout-requests')
                    : activeTab === 'Periods' ? Promise.all([api.get('/operations/periods'), api.get('/rooms')])
            : activeTab === 'Students' ? api.get('/operations/students', { params: { search } })
                : activeTab === 'Requests' ? api.get('/operations/requests')
                        : activeTab === 'Visitors' ? api.get('/operations/visitors')
                            : activeTab === 'Inspections' ? Promise.all([api.get('/operations/inspections'), api.get('/rooms')])
                        : activeTab === 'Payments' ? api.get('/payments/all')
                            : api.get('/operations/audit');
        request.then(response => {
            if (!active) return;
            if (activeTab === 'Periods') {
                setRows(response[0].data);
                setRooms(response[1].data);
                setPeriodForm((current) => current.campus ? current : { ...current, campus: response[1].data[0]?.campus || '' });
            } else if (activeTab === 'Payments') {
                setFinancePayments(response.data);
            } else if (activeTab === 'Inspections') {
                setRows(response[0].data);
                setRooms(response[1].data);
            } else {
                setRows(response.data);
                if (activeTab === 'Audit') setAuditUpdatedAt(new Date());
            }
        })
            .catch(error => toast.error(error.response?.data?.error || 'Could not load operations data'));
        return () => { active = false; };
    }, [activeTab, search]);

    useEffect(() => {
        if (activeTab !== 'Audit') return undefined;
        const timer = window.setInterval(async () => {
            if (document.visibilityState !== 'visible') return;
            try {
                const response = await api.get('/operations/audit');
                setRows(response.data);
                setAuditUpdatedAt(new Date());
            } catch (error) {
                toast.error(error.response?.data?.error || 'Could not refresh audit activity');
            }
        }, 15000);
        return () => window.clearInterval(timer);
    }, [activeTab]);

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

    const updateRole = async (student, role) => {
        try {
            await api.patch(`/operations/students/${student.id}/role`, { role });
            await load();
            toast.success(`${student.full_name}'s role changed to ${role}.`);
        }
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

    const decideCheckout = async (row, decision) => {
        if (decision === 'approved' && !window.confirm(`Approve checkout for ${row.full_name} from ${formatHostelName(row.hostel)}, Room ${formatRoomNumber(row.room_number)}? Their stay will be completed and the bed released.`)) return;
        const note = decision === 'declined' ? window.prompt('Reason for declining (optional):') : '';
        if (note === null) return;
        try {
            await api.patch(`/operations/checkout-requests/${row.id}/decision`, { decision, note });
            await load();
            toast.success(`Checkout request ${decision}`);
        } catch (error) { toast.error(error.response?.data?.error || 'Could not decide checkout request'); }
    };

    const createHostelPeriod = async (event) => {
        event.preventDefault();
        try {
            await api.post('/operations/periods', { ...periodForm, duration_months: Number(periodForm.duration_months) });
            setPeriodForm((current) => ({ ...current, semester: '' }));
            await load();
            toast.success('Hostel period scheduled');
        } catch (error) { toast.error(error.response?.data?.error || 'Could not schedule hostel period'); }
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
            <TableBody>{rows.map(row => <TableRow key={row.id}><TableCell>{row.full_name}<br /><Typography variant="caption">{row.reg_no}</Typography></TableCell><TableCell>{formatHostelName(row.hostel)} {formatRoomNumber(row.room_number)} {row.bed_number && String(row.bed_number).trim() !== '0' ? `· Bed ${row.bed_number}` : ''}</TableCell><TableCell>{row.arrival_date ? new Date(row.arrival_date).toLocaleDateString() : '—'}</TableCell><TableCell>{row.departure_date ? new Date(row.departure_date).toLocaleDateString() : '—'}</TableCell><TableCell>{Number(row.confirmed_payments) ? <Chip size="small" color="success" label="Confirmed" /> : <Chip size="small" color="warning" label="Unpaid" />}</TableCell><TableCell>{row.checked_out_at ? 'Checked out' : row.checked_in_at ? `In since ${new Date(row.checked_in_at).toLocaleString()}` : 'Not checked in'}</TableCell><TableCell>{!row.checked_out_at && <Button size="small" onClick={() => setDateDialog({ id: row.id, arrival_date: row.arrival_date?.slice(0, 10) || '', departure_date: row.departure_date?.slice(0, 10) || '' })}>Dates</Button>}{!row.checked_in_at && !row.checked_out_at && <Button size="small" disabled={!Number(row.confirmed_payments)} onClick={() => changeStayStatus(row.id, 'check-in')}>Check in</Button>}{row.checked_in_at && !row.checked_out_at && <Button size="small" color="warning" onClick={() => changeStayStatus(row.id, 'check-out')}>Check out</Button>}</TableCell></TableRow>)}
                {!rows.length && <TableRow><TableCell colSpan={7} align="center">No approved stays</TableCell></TableRow>}</TableBody></Table></TableContainer>}

        {activeTab === 'History' && <>
            <TextField label="Search student, registration, semester, room" size="small" value={search} onChange={(event) => setSearch(event.target.value)} sx={{ mb: 2, minWidth: 320 }} />
            <TableContainer component={Paper}><Table size="small"><TableHead><TableRow>{['Student', 'Room / bed', 'Semester', 'Arrival date', 'Checked in', 'Checked out', 'Payment'].map((value) => <TableCell key={value}>{value}</TableCell>)}</TableRow></TableHead>
                <TableBody>{rows.map((row) => <TableRow key={row.id}><TableCell>{row.full_name}<br /><Typography variant="caption">{row.reg_no}</Typography></TableCell><TableCell>{formatHostelName(row.hostel)} {formatRoomNumber(row.room_number)} {row.bed_number && String(row.bed_number).trim() !== '0' ? `· Bed ${row.bed_number}` : ''}<br /><Typography variant="caption">{row.campus}</Typography></TableCell><TableCell>{row.semester}</TableCell><TableCell>{row.arrival_date ? new Date(row.arrival_date).toLocaleDateString() : '—'}</TableCell><TableCell>{row.checked_in_at ? new Date(row.checked_in_at).toLocaleString() : '—'}</TableCell><TableCell>{row.checked_out_at ? new Date(row.checked_out_at).toLocaleString() : '—'}</TableCell><TableCell>{Number(row.confirmed_payments) ? 'Confirmed' : 'No confirmed payment'}</TableCell></TableRow>)}
                    {!rows.length && <TableRow><TableCell colSpan={7} align="center">No completed stays found</TableCell></TableRow>}</TableBody></Table></TableContainer>
        </>}

        {activeTab === 'Checkout Requests' && <TableContainer component={Paper}><Table size="small"><TableHead><TableRow>{['Requested', 'Student', 'Room / bed', 'Semester', 'Reason', 'Status', 'Decision'].map((value) => <TableCell key={value}>{value}</TableCell>)}</TableRow></TableHead>
            <TableBody>{rows.map((row) => <TableRow key={row.id}><TableCell>{new Date(row.requested_at).toLocaleString()}</TableCell><TableCell>{row.full_name}<br /><Typography variant="caption">{row.reg_no}</Typography></TableCell><TableCell>{formatHostelName(row.hostel)} {formatRoomNumber(row.room_number)} {row.bed_number && String(row.bed_number).trim() !== '0' ? `· Bed ${row.bed_number}` : ''}</TableCell><TableCell>{row.semester}</TableCell><TableCell>{row.reason || '—'}</TableCell><TableCell><Chip size="small" color={row.status === 'pending' ? 'warning' : row.status === 'approved' ? 'success' : 'default'} label={row.status} /></TableCell><TableCell>{row.status === 'pending' && <><Button size="small" color="success" onClick={() => decideCheckout(row, 'approved')}>Approve</Button><Button size="small" color="error" onClick={() => decideCheckout(row, 'declined')}>Decline</Button></>}{row.decision_note || (row.reviewer_name ? `Reviewed by ${row.reviewer_name}` : '—')}</TableCell></TableRow>)}
                {!rows.length && <TableRow><TableCell colSpan={7} align="center">No checkout requests</TableCell></TableRow>}</TableBody></Table></TableContainer>}

        {activeTab === 'Periods' && <>
            <Alert severity="warning" sx={{ mb: 2 }}>When a period closes, checked-in residents in that hostel and campus are automatically checked out and their beds released. Approved bookings that were never checked in are cancelled.</Alert>
            <Paper component="form" onSubmit={createHostelPeriod} sx={{ p: 2, mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                <TextField select label="Campus" required value={periodForm.campus} onChange={(event) => setPeriodForm({ ...periodForm, campus: event.target.value })} sx={{ minWidth: 180 }}>
                    {[...new Set(rooms.map((room) => room.campus))].map((campus) => <MenuItem key={campus} value={campus}>{campus}</MenuItem>)}
                </TextField>
                <TextField select label="Hostel" required value={periodForm.hostel} onChange={(event) => setPeriodForm({ ...periodForm, hostel: event.target.value })}>
                    {['Boys', 'Girls'].map((hostel) => <MenuItem key={hostel} value={hostel}>{formatHostelName(hostel)}</MenuItem>)}
                </TextField>
                <TextField label="Semester / period name" required value={periodForm.semester} onChange={(event) => setPeriodForm({ ...periodForm, semester: event.target.value })} />
                <TextField type="date" label="Opens on" required InputLabelProps={{ shrink: true }} value={periodForm.opens_on} onChange={(event) => setPeriodForm({ ...periodForm, opens_on: event.target.value })} />
                <TextField select label="Duration" required value={periodForm.duration_months} onChange={(event) => setPeriodForm({ ...periodForm, duration_months: event.target.value })}>
                    {Array.from({ length: 4 }, (_, index) => index + 1).map((months) => <MenuItem key={months} value={months}>{months} {months === 1 ? 'month' : 'months'}</MenuItem>)}
                </TextField>
                <Button type="submit" variant="contained">Schedule period</Button>
            </Paper>
            <TableContainer component={Paper}><Table size="small"><TableHead><TableRow>{['Semester / period', 'Campus', 'Hostel', 'Opens', 'Closes', 'Duration', 'Status', 'Created by'].map((value) => <TableCell key={value}>{value}</TableCell>)}</TableRow></TableHead>
                <TableBody>{rows.map((row) => <TableRow key={row.id}><TableCell>{row.semester}</TableCell><TableCell>{row.campus}</TableCell><TableCell>{formatHostelName(row.hostel)}</TableCell><TableCell>{new Date(row.opens_on).toLocaleDateString()}</TableCell><TableCell>{new Date(row.closes_on).toLocaleDateString()}</TableCell><TableCell>{row.duration_months} months</TableCell><TableCell><Chip size="small" label={row.status} color={row.status === 'open' ? 'success' : row.status === 'scheduled' ? 'info' : 'default'} /></TableCell><TableCell>{row.created_by_name || 'System'}</TableCell></TableRow>)}
                    {!rows.length && <TableRow><TableCell colSpan={8} align="center">No hostel periods scheduled</TableCell></TableRow>}</TableBody></Table></TableContainer>
        </>}

        {activeTab === 'Students' && <>
            <TextField label="Search students" size="small" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') load(); }} sx={{ mb: 2, minWidth: 280 }} />
            <Button onClick={load} sx={{ ml: 1, mt: 0.5 }}>Search</Button>
            <TableContainer component={Paper}><Table size="small"><TableHead><TableRow>{['Student', 'Registration', 'Email', 'Phone', 'Current room', 'Role'].map(value => <TableCell key={value}>{value}</TableCell>)}</TableRow></TableHead>
                <TableBody>{rows.map(row => <TableRow key={row.id}><TableCell>{row.full_name}</TableCell><TableCell>{row.reg_no}</TableCell><TableCell>{row.email}</TableCell><TableCell>{row.phone || '—'}</TableCell><TableCell>{row.current_room || '—'}</TableCell><TableCell><TextField select size="small" value={row.role} onChange={e => updateRole(row, e.target.value)} disabled={row.id === user.id} sx={{ minWidth: 120 }}>{['student', 'admin', 'accounts', 'warden'].map(role => <MenuItem key={role} value={role}>{role}</MenuItem>)}</TextField></TableCell></TableRow>)}
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
                <TableBody>{rows.map(row => <TableRow key={row.id}><TableCell>{new Date(row.inspected_at).toLocaleString()}</TableCell><TableCell>{formatHostelName(row.hostel)} {formatRoomNumber(row.room_number)}</TableCell><TableCell>{row.inspector_name || '—'}</TableCell><TableCell>{row.condition_status.replace('_', ' ')}</TableCell><TableCell>{row.cleanliness.replace('_', ' ')}</TableCell><TableCell>{row.safety_status.replace('_', ' ')}</TableCell><TableCell><TextField select size="small" value={row.room_status} onChange={e => setRoomStatus(row.room_id, e.target.value)} sx={{ minWidth: 140 }}>{['available', 'full', 'maintenance'].map(status => <MenuItem key={status} value={status}>{status}</MenuItem>)}</TextField></TableCell><TableCell>{row.notes || '—'}</TableCell></TableRow>)}
                    {!rows.length && <TableRow><TableCell colSpan={8} align="center">No inspections recorded</TableCell></TableRow>}</TableBody></Table></TableContainer>
        </>}

        {activeTab === 'Payments' && <>
            <Typography variant="h6" sx={{ mb: 1 }}>Payment verification</Typography>
            <TableContainer component={Paper} sx={{ mb: 3 }}><Table size="small"><TableHead><TableRow>{['Date', 'Student', 'Registration', 'Room', 'Method', 'Reference', 'Amount', 'Status', 'Action'].map(value => <TableCell key={value}>{value}</TableCell>)}</TableRow></TableHead>
                <TableBody>{financePayments.map(payment => <TableRow key={payment.id}><TableCell>{new Date(payment.payment_date).toLocaleDateString()}</TableCell><TableCell>{payment.full_name}</TableCell><TableCell>{payment.reg_no}</TableCell><TableCell>{formatHostelName(payment.hostel)} {formatRoomNumber(payment.room_number)}</TableCell><TableCell>{formatPaymentMethod(payment.payment_method)}</TableCell><TableCell>{payment.mpesa_code || '—'}</TableCell><TableCell>KES {Number(payment.amount).toLocaleString()}</TableCell><TableCell>{payment.status}</TableCell><TableCell>{payment.status === 'pending' && <Button size="small" onClick={() => confirmPayment(payment)}>Confirm</Button>}</TableCell></TableRow>)}
                    {!financePayments.length && <TableRow><TableCell colSpan={9} align="center">No payments found</TableCell></TableRow>}</TableBody></Table></TableContainer>
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
                    <TableBody>{report.balance_rows.map(row => <TableRow key={row.booking_id}><TableCell>{row.full_name}</TableCell><TableCell>{row.reg_no}</TableCell><TableCell>{formatHostelName(row.hostel)} {formatRoomNumber(row.room_number)}</TableCell><TableCell>{row.semester}</TableCell><TableCell>KES {Number(row.amount_due).toLocaleString()}</TableCell><TableCell>KES {Number(row.amount_paid).toLocaleString()}</TableCell><TableCell>KES {Number(row.balance).toLocaleString()}</TableCell></TableRow>)}
                        {!report.balance_rows.length && <TableRow><TableCell colSpan={7} align="center">No approved bookings</TableCell></TableRow>}</TableBody></Table></TableContainer>
                <TableContainer component={Paper}><Table size="small"><TableHead><TableRow>{['Date', 'Student', 'Reg No', 'Room', 'Method', 'Reference', 'Amount', 'Status'].map(value => <TableCell key={value}>{value}</TableCell>)}</TableRow></TableHead>
                    <TableBody>{reportRows.map(row => <TableRow key={row.id}><TableCell>{new Date(row.payment_date).toLocaleDateString()}</TableCell><TableCell>{row.full_name}</TableCell><TableCell>{row.reg_no}</TableCell><TableCell>{formatHostelName(row.hostel)} {formatRoomNumber(row.room_number)}</TableCell><TableCell>{formatPaymentMethod(row.payment_method)}</TableCell><TableCell>{row.mpesa_code || '—'}</TableCell><TableCell>KES {Number(row.amount).toLocaleString()}</TableCell><TableCell>{row.status}</TableCell></TableRow>)}
                        {!reportRows.length && <TableRow><TableCell colSpan={8} align="center">No payments for this period</TableCell></TableRow>}</TableBody></Table></TableContainer>
            </>}
        </>}

        {activeTab === 'Audit' && <>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                <Button onClick={load} startIcon={<RefreshIcon />}>Refresh</Button>
                <Button onClick={() => csvDownload('hostel-admin-audit.csv', auditCsvRows(rows))}>Export CSV</Button>
                <Chip size="small" color="success" variant="outlined" label="Live · refreshes every 15 seconds" />
                <Typography variant="caption" color="text.secondary">
                    {auditUpdatedAt ? `Updated ${auditUpdatedAt.toLocaleTimeString()}` : 'Loading audit activity…'}
                </Typography>
            </Box>
            <TableContainer component={Paper}><Table size="small"><TableHead><TableRow>{['When', 'Staff', 'Action', 'Record', 'Details'].map(value => <TableCell key={value}>{value}</TableCell>)}</TableRow></TableHead>
                <TableBody>{rows.map(row => {
                    const audit = presentAuditRow(row);
                    return <TableRow key={row.id}>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{new Date(row.created_at).toLocaleString()}</TableCell>
                        <TableCell>{row.actor_name || 'Deleted account'}</TableCell>
                        <TableCell>{audit.action}</TableCell>
                        <TableCell>{audit.record}</TableCell>
                        <TableCell>{audit.details}</TableCell>
                    </TableRow>;
                })}
                    {!rows.length && <TableRow><TableCell colSpan={5} align="center">No audit activity recorded yet</TableCell></TableRow>}</TableBody></Table></TableContainer>
        </>}
        <Dialog open={Boolean(dateDialog)} onClose={() => setDateDialog(null)} maxWidth="xs" fullWidth>
            <Box component="form" onSubmit={saveStayDates}>
                <DialogTitle>Planned stay dates</DialogTitle>
                <DialogContent sx={{ display: 'grid', gap: 2, pt: '8px !important' }}>
                    <TextField type="date" label="Arrival" InputLabelProps={{ shrink: true }} value={dateDialog?.arrival_date || ''} onChange={e => setDateDialog({ ...dateDialog, arrival_date: e.target.value })} />
                    <TextField type="date" label="Departure" InputLabelProps={{ shrink: true }} inputProps={{ max: addMonthsToDate(dateDialog?.arrival_date, 4) }} helperText="A stay cannot exceed 4 months." value={dateDialog?.departure_date || ''} onChange={e => setDateDialog({ ...dateDialog, departure_date: e.target.value })} />
                </DialogContent>
                <DialogActions><Button onClick={() => setDateDialog(null)}>Cancel</Button><Button type="submit" variant="contained">Save dates</Button></DialogActions>
            </Box>
        </Dialog>
        <Dialog open={inspectionDialog} onClose={() => setInspectionDialog(false)} maxWidth="sm" fullWidth>
            <Box component="form" onSubmit={recordInspection}>
                <DialogTitle>Record room inspection</DialogTitle>
                <DialogContent sx={{ display: 'grid', gap: 2, pt: '8px !important' }}>
                    <TextField select label="Room" required value={inspectionForm.room_id} onChange={e => setInspectionForm({ ...inspectionForm, room_id: e.target.value })}>
                        {rooms.map(room => <MenuItem key={room.id} value={room.id}>{formatHostelName(room.hostel)} {formatRoomNumber(room.room_number)} · {room.campus}</MenuItem>)}
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