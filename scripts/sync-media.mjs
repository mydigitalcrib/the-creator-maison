/**
 * Copies shared media (packages/content/media) into every site's public/media,
 * so all 3 sites serve the same files at /media/<name>.
 * Runs automatically before `dev` and `build`.
 */
import { cpSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'packages/content/media');
if (!existsSync(src)) process.exit(0);

for (const site of readdirSync(join(root, 'apps'))) {
  const dest = join(root, 'apps', site, 'public', 'media');
  mkdirSync(dest, { recursive: true });
  for (const file of readdirSync(src)) {
    const from = join(src, file);
    const to = join(dest, file);
    if (existsSync(to) && statSync(to).mtimeMs >= statSync(from).mtimeMs) continue;
    cpSync(from, to);
  }
}
