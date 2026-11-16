import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeModeProvider } from './context/ThemeContext';
import App from './App.jsx';

// Register service worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => {
                // Tell any waiting SW to activate immediately
                if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
            })
            .catch(() => {
                // SW registration failing is non-fatal — app still works
            });
    });
}

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <ThemeModeProvider>
            <App />
        </ThemeModeProvider>
    </StrictMode>
);
