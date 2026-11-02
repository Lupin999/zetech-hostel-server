import { useMemo } from 'react';
import {
    Box, Chip, List, ListItemButton, ListItemText, ListSubheader,
    Paper, Typography, useMediaQuery, useTheme,
} from '@mui/material';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import HotelOutlinedIcon from '@mui/icons-material/HotelOutlined';
import MeetingRoomOutlinedIcon from '@mui/icons-material/MeetingRoomOutlined';
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import CampaignOutlinedIcon from '@mui/icons-material/CampaignOutlined';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AdminDashboard from './AdminDashboard';
import OperationsDashboard from './OperationsDashboard';

const navigationGroups = [
    {
        label: 'WORKSPACE',
        items: [
            { key: 'overview', label: 'Overview', icon: DashboardOutlinedIcon, view: 'dashboard', dashboardTab: 'bookings' },
        ],
    },
    {
        label: 'ACCOMMODATION',
        items: [
            { key: 'boys-rooms', label: 'Boys hostel', icon: HotelOutlinedIcon, view: 'dashboard', dashboardTab: 'boys' },
            { key: 'girls-rooms', label: 'Girls hostel', icon: HotelOutlinedIcon, view: 'dashboard', dashboardTab: 'girls' },
            { key: 'periods', label: 'Booking periods', icon: MeetingRoomOutlinedIcon, view: 'operations', operationsTab: 'Periods' },
            { key: 'inspections', label: 'Room inspections', icon: FactCheckOutlinedIcon, view: 'operations', operationsTab: 'Inspections' },
        ],
    },
    {
        label: 'STUDENTS',
        items: [
            { key: 'residents', label: 'Current stays', icon: PeopleOutlineIcon, view: 'operations', operationsTab: 'Stays' },
            { key: 'stay-history', label: 'Stay history', icon: HistoryOutlinedIcon, view: 'operations', operationsTab: 'History' },
            { key: 'users', label: 'User accounts', icon: PeopleOutlineIcon, view: 'operations', operationsTab: 'Users' },
            { key: 'checkout-requests', label: 'Checkout requests', icon: AssignmentOutlinedIcon, view: 'operations', operationsTab: 'Checkout Requests' },
        ],
    },
    {
        label: 'SERVICE & COMMUNICATION',
        items: [
            { key: 'requests', label: 'Student requests', icon: AssignmentOutlinedIcon, view: 'operations', operationsTab: 'Requests' },
            { key: 'notices', label: 'Notices', icon: CampaignOutlinedIcon, view: 'dashboard', dashboardTab: 'notices' },
        ],
    },
    {
        label: 'FINANCE & OVERSIGHT',
        items: [
            { key: 'payments', label: 'Payments', icon: PaymentsOutlinedIcon, view: 'operations', operationsTab: 'Payments' },
            { key: 'reports', label: 'Reports', icon: AssessmentOutlinedIcon, view: 'operations', operationsTab: 'Reports' },
            { key: 'activity', label: 'Activity log', icon: HistoryOutlinedIcon, view: 'operations', operationsTab: 'Audit' },
        ],
    },
];

const allItems = navigationGroups.flatMap((group) => group.items);

export default function AdminPanel() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const requestedSection = searchParams.get('section');
    const activeKey = requestedSection === 'operations'
        ? 'residents'
        : allItems.some((item) => item.key === requestedSection) ? requestedSection : 'overview';
    const activeItem = useMemo(() => allItems.find((item) => item.key === activeKey), [activeKey]);

    const selectSection = (key) => {
        navigate(key === 'overview' ? '/admin' : `/admin?section=${key}`);
    };

    return (
        <Box>
            <Box sx={{ mb: 3 }}>
                <Typography variant="h4" fontWeight={700}>Admin workspace</Typography>
                <Typography color="text.secondary">
                    Manage hostel operations from one place. Choose a work area to get started.
                </Typography>
            </Box>

            <Box sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '230px minmax(0, 1fr)' },
                gap: 2.5,
                alignItems: 'start',
            }}>
                <Paper
                    component="nav"
                    aria-label="Admin work areas"
                    sx={{
                        position: { md: 'sticky' },
                        top: 16,
                        maxHeight: { md: 'calc(100vh - 32px)' },
                        overflowY: 'auto',
                    }}
                >
                    <List dense sx={{
                        display: { xs: 'flex', md: 'block' },
                        overflowX: { xs: 'auto', md: 'visible' },
                        py: 1,
                    }}>
                        {navigationGroups.map((group) => (
                            <Box component="li" key={group.label} sx={{ listStyle: 'none', minWidth: { xs: 'max-content', md: 'auto' } }}>
                                {!isMobile && (
                                    <ListSubheader disableSticky sx={{ bgcolor: 'transparent', fontSize: 10, fontWeight: 800, letterSpacing: 1.1, lineHeight: '32px' }}>
                                        {group.label}
                                    </ListSubheader>
                                )}
                                {group.items.map((item) => {
                                    const Icon = item.icon;
                                    return (
                                        <ListItemButton
                                            key={item.key}
                                            selected={activeKey === item.key}
                                            onClick={() => selectSection(item.key)}
                                            sx={{
                                                mx: { xs: 0.5, md: 1 },
                                                borderRadius: 1.5,
                                                minHeight: 40,
                                                whiteSpace: 'nowrap',
                                            }}
                                        >
                                            <Icon fontSize="small" sx={{ mr: 1.25, color: activeKey === item.key ? 'primary.main' : 'text.secondary' }} />
                                            <ListItemText primary={item.label} primaryTypographyProps={{ variant: 'body2', fontWeight: activeKey === item.key ? 700 : 500 }} />
                                        </ListItemButton>
                                    );
                                })}
                            </Box>
                        ))}
                    </List>
                </Paper>

                <Box component="main" sx={{ minWidth: 0 }}>
                    {activeKey !== 'overview' && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                            <Typography variant="h5" fontWeight={700}>{activeItem.label}</Typography>
                            <Chip label="Admin" size="small" color="primary" variant="outlined" />
                        </Box>
                    )}
                    {activeItem.view === 'dashboard'
                        ? <AdminDashboard key={activeKey} initialTab={activeItem.dashboardTab} hideSectionNavigation />
                        : <OperationsDashboard key={activeKey} initialTab={activeItem.operationsTab} hideNavigation />}
                </Box>
            </Box>
        </Box>
    );
}
