import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// VITE_BASE wordt door de GitHub Actions workflow gezet (zie .github/workflows/deploy.yml).
// Voor lokaal draaien (`npm run dev`) is dit '/'.
// Voor deploy naar https://<gebruiker>.github.io/<repo>/ wordt dit '/<repo>/'.
// Voor deploy naar een custom domein (CNAME-bestand in /public) zet je VITE_BASE='/'.
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE || '/',
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1500,
  },
});
