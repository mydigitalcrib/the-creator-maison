/**
 * Speed + accessibility scores for all 3 sites (Lighthouse, mobile emulation).
 *
 *   npm run build
 *   npm run lighthouse
 *
 * Thresholds live in lighthouserc.json (they match the quality bar in PLAN.md).
 * Reports land in .lighthouseci/<site>/.
 */
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const cli = require.resolve('@lhci/cli/src/cli.js');

// Use Chrome if installed; otherwise the Chromium that Playwright downloaded.
if (!process.env.CHROME_PATH) {
  const { chromium } = await import('@playwright/test');
  process.env.CHROME_PATH = chromium.executablePath();
}

const SITES = [
  { name: 'open-file', port: 4321 },
  { name: 'pop-zine', port: 4322 },
  { name: 'desktop-diary', port: 4323 },
];
const PATHS = ['/', '/work/beauty/', '/work/beauty/glass-skin-in-five/', '/contact/'];
const only = process.argv[2];

let failed = false;
for (const site of SITES.filter((s) => !only || s.name === only)) {
  console.log(`\n=== Lighthouse · ${site.name} ===`);
  const result = spawnSync(
    process.execPath,
    [
      cli,
      'autorun',
      '--config=lighthouserc.json',
      `--collect.startServerCommand=npm run preview -w @mfm/${site.name}`,
      ...PATHS.map((p) => `--collect.url=http://localhost:${site.port}${p}`),
      `--upload.outputDir=.lighthouseci/${site.name}`,
    ],
    { stdio: 'inherit', env: process.env },
  );
  if (result.status !== 0) failed = true;
}
process.exit(failed ? 1 : 0);
