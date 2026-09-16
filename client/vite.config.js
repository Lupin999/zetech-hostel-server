import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // No 'base' set — Netlify serves from the root (/), not a subdirectory.
  // The old GitHub Pages base '/zetech-hostel-server/' is no longer needed.
});
