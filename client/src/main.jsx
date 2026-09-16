import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeModeProvider } from './context/ThemeContext';
import App from './App.jsx';

// Register service worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
}

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <ThemeModeProvider>
            <App />
        </ThemeModeProvider>
    </StrictMode>
);
