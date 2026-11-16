// @ts-check
import { defineConfig } from 'astro/config';
import { FONTS } from '@mfm/ui/fonts.mjs';

// Site A · Open File
export default defineConfig({
  devToolbar: { enabled: false },
  fonts: [FONTS.instrumentSerif, FONTS.dmMono],
});
