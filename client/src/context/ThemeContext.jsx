import { createContext, useContext, useState, useMemo } from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import getTheme from '../theme';

const ThemeContext = createContext();

export function ThemeModeProvider({ children }) {
    const [mode, setMode] = useState(() => localStorage.getItem('themeMode') || 'light');

    const toggleTheme = () => {
        setMode(prev => {
            const next = prev === 'light' ? 'dark' : 'light';
            localStorage.setItem('themeMode', next);
            return next;
        });
    };

    const theme = useMemo(() => getTheme(mode), [mode]);

    return (
        <ThemeContext.Provider value={{ mode, toggleTheme }}>
            <ThemeProvider theme={theme}>
                <CssBaseline />
                {children}
            </ThemeProvider>
        </ThemeContext.Provider>
    );
}

export const useThemeMode = () => useContext(ThemeContext);
