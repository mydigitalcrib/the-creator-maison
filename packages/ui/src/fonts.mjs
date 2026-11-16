/**
 * Shared font definitions for Astro's built-in Fonts API.
 *
 * Why: Astro preloads the files and generates size-matched fallback fonts,
 * so text doesn't jump when the real font arrives (keeps layout shift < 0.1).
 * Files come from the installed @fontsource packages (Latin subset only):
 * no network needed to build.
 *
 * Use in a site's astro.config.mjs:   fonts: [FONTS.instrumentSerif, FONTS.dmMono]
 * Then in its layout <head>:          <Font cssVariable="--font-instrument-serif" preload />
 */
import { fontProviders } from 'astro/config';

const provider = fontProviders.local();

/** Path to a Latin .woff2 inside an installed @fontsource package. */
const file = (pkg, weight, style = 'normal') =>
  `@fontsource/${pkg}/files/${pkg}-latin-${weight}-${style}.woff2`;

/**
 * @param {string} name
 * @param {string} cssVariable
 * @param {string} pkg
 * @param {Array<[number, 'normal' | 'italic']>} variants
 * @param {string[]} fallbacks
 * @returns {any} (Astro wants non-empty tuples; plain JS can't express that)
 */
const family = (name, cssVariable, pkg, variants, fallbacks) => ({
  provider,
  name,
  cssVariable,
  fallbacks,
  options: {
    variants: variants.map(([weight, style]) => ({
      weight,
      style,
      src: [file(pkg, weight, style)],
    })),
  },
});

export const FONTS = {
  instrumentSerif: family(
    'Instrument Serif',
    '--font-instrument-serif',
    'instrument-serif',
    [
      [400, 'normal'],
      [400, 'italic'],
    ],
    ['Georgia', 'serif'],
  ),
  dmMono: family(
    'DM Mono',
    '--font-dm-mono',
    'dm-mono',
    [
      [400, 'normal'],
      [500, 'normal'],
    ],
    ['monospace'],
  ),
  silkscreen: family('Silkscreen', '--font-silkscreen', 'silkscreen', [[400, 'normal']], ['monospace']),
  bagelFatOne: family('Bagel Fat One', '--font-bagel-fat-one', 'bagel-fat-one', [[400, 'normal']], ['sans-serif']),
  shrikhand: family('Shrikhand', '--font-shrikhand', 'shrikhand', [[400, 'normal']], ['serif']),
};
