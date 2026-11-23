// @ts-check
import { defineConfig } from 'astro/config';
import { FONTS } from '@mfm/ui/fonts.mjs';

// Site A · Open File
// SITE_URL / SITE_BASE are set by the GitHub Pages workflow (the site lives under /the-creator-maison/).
export default defineConfig({
  site: process.env.SITE_URL,
  base: process.env.SITE_BASE || '/',
  devToolbar: { enabled: false },
  fonts: [FONTS.anton, FONTS.dmMono, FONTS.interTightText],
});
