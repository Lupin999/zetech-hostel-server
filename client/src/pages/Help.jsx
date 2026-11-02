import { Alert, Box, Chip, Paper, Typography } from '@mui/material';
import { useAuth } from '../context/AuthContext';

const roleGuides = [
    {
        role: 'Student',
        actions: 'Register with your admission number, programme, email, and required phone number. Browse rooms, submit a booking, pay the KES 12,000 M-Pesa deposit after approval, view receipts and balances, and use notices, menu, maintenance, complaint, and checkout services.',
    },
    {
        role: 'Admin',
        actions: 'Manage rooms and student accounts, approve bookings, handle payments and reports, check residents in or out, schedule hostel periods, manage requests and inspections, and review audit history.',
    },
];

export default function Help() {
    const { user } = useAuth();

    return (
        <Box sx={{ maxWidth: 900, mx: 'auto' }}>
            <Typography variant="h4" fontWeight={700} gutterBottom>How Zetech Hostel works</Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
                A quick guide to student admission details, hostel bookings, payments, check-in, and the two account roles.
            </Typography>

            <Paper sx={{ p: { xs: 2, md: 3 }, mb: 2 }}>
                <Typography variant="h6" fontWeight={700} gutterBottom>Student journey</Typography>
                <Box component="ol" sx={{ pl: 2.5, mb: 0 }}>
                    <li><Typography sx={{ mb: 1 }}>Create an account. Enter the registration number in the format <strong>BSE-01'0046/2024</strong>: programme code, group, student number, and admission year.</Typography></li>
                    <li><Typography sx={{ mb: 1 }}>Add a phone number you can access. It is required for account login by phone and for M-Pesa prompts. Phone login codes are currently sent to the email address on the account.</Typography></li>
                    <li><Typography sx={{ mb: 1 }}>Choose an available room and a valid future arrival date. Your booking stays pending until an admin reviews it.</Typography></li>
                    <li><Typography sx={{ mb: 1 }}>After approval, use the M-Pesa prompt to pay the KES 12,000 deposit. The room fee is shown separately; payment is credited toward hostel fees.</Typography></li>
                    <li><Typography sx={{ mb: 1 }}>Wait for an admin to check you in. A payment alone does not check you into a room.</Typography></li>
                    <li><Typography>After the admin checks you in, submit a checkout request from Student Services. The admin must approve it before the stay is completed.</Typography></li>
                </Box>
            </Paper>

            <Paper sx={{ p: { xs: 2, md: 3 }, mb: 2 }}>
                <Typography variant="h6" fontWeight={700} gutterBottom>What does “period” mean?</Typography>
                <Typography color="text.secondary">
                    A hostel period is the booking window configured by an admin for a particular campus and hostel. Its opening and closing dates decide when students may book. The period name is also used as the semester label on bookings. At the closing date, checked-in stays are automatically completed and beds released; approved bookings that never checked in are cancelled.
                </Typography>
            </Paper>

            <Alert severity="warning" sx={{ mb: 2 }}>
                Hostel payments are non-refundable and are credited toward hostel fees. Only a payment confirmed by Safaricom in this app is treated as paid. Do not enter or share a transaction code as proof of payment.
            </Alert>

            <Alert severity="info" sx={{ mb: 3 }}>
                The app checks the admission-number format and programme choice, but it is not connected to Zetech’s official student registry. It cannot confirm that a student is enrolled. That requires an authorized university database/API integration.
            </Alert>

            <Typography variant="h6" fontWeight={700} gutterBottom>What each role can do</Typography>
            <Box sx={{ display: 'grid', gap: 1.5 }}>
                {roleGuides.map(({ role, actions }) => (
                    <Paper key={role} sx={{ p: 2, display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                        <Chip label={role} color={role.toLowerCase() === user?.role ? 'primary' : 'default'} />
                        <Typography color="text.secondary">{actions}</Typography>
                    </Paper>
                ))}
            </Box>
        </Box>
    );
}
