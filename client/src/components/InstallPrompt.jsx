import { useState, useEffect } from 'react';
import { Snackbar, Button, Box, Typography } from '@mui/material';
import { GetApp } from '@mui/icons-material';

export default function InstallPrompt() {
    const [prompt, setPrompt] = useState(null);
    const [show, setShow] = useState(false);

    useEffect(() => {
        const handler = (e) => {
            e.preventDefault();
            setPrompt(e);
            // Only show if not dismissed before
            if (!localStorage.getItem('pwa-dismissed')) setShow(true);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstall = async () => {
        if (!prompt) return;
        prompt.prompt();
        const result = await prompt.userChoice;
        if (result.outcome === 'accepted') setShow(false);
        setPrompt(null);
    };

    const handleDismiss = () => {
        setShow(false);
        localStorage.setItem('pwa-dismissed', 'true');
    };

    return (
        <Snackbar open={show} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            message={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <GetApp />
                    <Typography variant="body2">Install Zetech Hostel App</Typography>
                </Box>
            }
            action={
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button color="secondary" size="small" variant="contained" onClick={handleInstall}>Install</Button>
                    <Button color="inherit" size="small" onClick={handleDismiss}>Dismiss</Button>
                </Box>
            }
        />
    );
}
