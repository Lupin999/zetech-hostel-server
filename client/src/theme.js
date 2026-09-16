import { createTheme } from '@mui/material/styles';

const glass = (mode) => ({
    backdropFilter: 'blur(12px)',
    backgroundColor: mode === 'dark' ? 'rgba(17,24,39,0.75)' : 'rgba(255,255,255,0.8)',
    border: mode === 'dark' ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)',
});

const getTheme = (mode) => createTheme({
    palette: {
        mode,
        primary: { main: '#1a237e', light: '#534bae', dark: '#000051' },
        secondary: { main: '#FFD700', light: '#ffe44d', dark: '#c7a600' },
        ...(mode === 'dark' ? {
            background: { default: '#0d1b2a', paper: '#111827' },
            text: { primary: '#f1f5f9', secondary: '#94a3b8' },
        } : {
            background: { default: '#f5f7fa', paper: '#ffffff' },
        }),
    },
    typography: {
        fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        h4: { fontWeight: 700 },
        h5: { fontWeight: 600 },
        h6: { fontWeight: 600 },
    },
    shape: { borderRadius: 12 },
    components: {
        MuiButton: { styleOverrides: { root: { textTransform: 'none', fontWeight: 600 } } },
        MuiCard: { styleOverrides: { root: { ...glass(mode), boxShadow: mode === 'dark' ? '0 4px 20px rgba(0,0,0,0.4)' : '0 2px 12px rgba(0,0,0,0.08)' } } },
        MuiPaper: { styleOverrides: { root: { boxShadow: mode === 'dark' ? '0 4px 20px rgba(0,0,0,0.4)' : '0 2px 12px rgba(0,0,0,0.08)' } } },
        MuiContainer: { styleOverrides: { root: { paddingLeft: 16, paddingRight: 16, '@media (min-width:600px)': { paddingLeft: 24, paddingRight: 24 } } } },
        MuiAppBar: { styleOverrides: { root: { backgroundColor: mode === 'dark' ? 'rgba(17,24,39,0.9)' : '#1a237e', backdropFilter: 'blur(10px)' } } },
        MuiCssBaseline: { styleOverrides: { a: { color: mode === 'dark' ? '#FFD700' : '#1a237e' } } },
    },
});

export default getTheme;
