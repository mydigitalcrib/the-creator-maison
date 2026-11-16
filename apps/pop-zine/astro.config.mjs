// @ts-check
import { defineConfig } from 'astro/config';
import { FONTS } from '@mfm/ui/fonts.mjs';

// Site B · Pop Zine
export default defineConfig({
  devToolbar: { enabled: false },
  fonts: [FONTS.bagelFatOne, FONTS.shrikhand, FONTS.dmMono],
});
