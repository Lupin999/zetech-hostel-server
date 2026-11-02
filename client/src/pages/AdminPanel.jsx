import { Box, Tab, Tabs } from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AdminDashboard from './AdminDashboard';
import OperationsDashboard from './OperationsDashboard';

export default function AdminPanel() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const activeTab = searchParams.get('section') === 'operations' ? 1 : 0;

    const selectTab = (_, value) => {
        navigate(value === 1 ? '/admin?section=operations' : '/admin');
    };

    return (
        <Box>
            <Tabs value={activeTab} onChange={selectTab} variant="scrollable" scrollButtons="auto" sx={{ mb: 3 }}>
                <Tab label="Dashboard" />
                <Tab label="All admin controls" />
            </Tabs>
            {activeTab === 0 ? <AdminDashboard /> : <OperationsDashboard />}
        </Box>
    );
}
