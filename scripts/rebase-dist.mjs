/**
 * Points a built site's root-relative links at its base path, for GitHub Pages project sites
 * (served from /<repo>/ instead of /). Astro already prefixes its own assets; this handles the
 * links and media paths written in the pages ("/work/", "/media/…").
 *
 *   node scripts/rebase-dist.mjs apps/open-file/dist /the-creator-maison/
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';

const [dir, baseArg] = process.argv.slice(2);
if (!dir || !baseArg) throw new Error('usage: node scripts/rebase-dist.mjs <dist> <base>');
const base = `/${baseArg.replace(/^\/+|\/+$/g, '')}`;
const name = base.slice(1).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const attr = new RegExp(`(\\s(?:href|src|poster|action|data-preview|data-src)=")/(?!/)(?!${name}(?:/|"))`, 'g');
const cssUrl = new RegExp(`url\\((['"]?)/(?!/)(?!${name}/)`, 'g');

let files = 0;
const walk = (d) => {
  for (const entry of readdirSync(d)) {
    const p = join(d, entry);
    if (statSync(p).isDirectory()) walk(p);
    else if (['.html', '.css'].includes(extname(p))) {
      const before = readFileSync(p, 'utf8');
      const after = before.replace(attr, `$1${base}/`).replace(cssUrl, `url($1${base}/`);
      if (after !== before) {
        writeFileSync(p, after);
        files++;
      }
    }
  }
};
walk(dir);
console.log(`rebase-dist: pointed links at ${base}/ in ${files} files`);
