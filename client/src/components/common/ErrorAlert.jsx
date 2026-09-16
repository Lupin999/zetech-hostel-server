import { Alert, AlertTitle } from '@mui/material';

export default function ErrorAlert({ title = 'Error', message }) {
    if (!message) return null;
    return (
        <Alert severity="error" sx={{ mb: 2 }}>
            <AlertTitle>{title}</AlertTitle>
            {message}
        </Alert>
    );
}
