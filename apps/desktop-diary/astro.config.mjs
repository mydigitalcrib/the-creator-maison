// @ts-check
import { defineConfig } from 'astro/config';
import { FONTS } from '@mfm/ui/fonts.mjs';

// Site C · Desktop Diary
export default defineConfig({
  devToolbar: { enabled: false },
  fonts: [FONTS.silkscreen, FONTS.instrumentSerif, FONTS.dmMono],
});
