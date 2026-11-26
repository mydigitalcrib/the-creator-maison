import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// SITE_BASE is set when the site is served from a sub-path (e.g. GitHub Pages: /the-creator-maison/).
export default defineConfig({
  base: process.env.SITE_BASE || '/',
  plugins: [react()],
  server: {
    port: 4325,
    // the shared content lives two folders up (packages/content)
    fs: { allow: [fileURLToPath(new URL('../..', import.meta.url))] },
  },
  build: {
    target: 'es2022',
    assetsInlineLimit: 0,
  },
});
