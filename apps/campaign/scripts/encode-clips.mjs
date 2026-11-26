/**
 * Web copies of the work videos for the campaign: 540×960 H.264 (streams while it downloads),
 * plus a still poster for each, so a card is never an empty black box while the video loads.
 *
 *   node scripts/encode-clips.mjs
 *
 * Reads packages/content/media/*.mp4 → writes public/clips/<name>.mp4 and <name>.webp
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ffmpegPath from 'ffmpeg-static';

const app = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(app, '..', '..', 'packages', 'content', 'media');
const OUT = join(app, 'public', 'clips');
mkdirSync(OUT, { recursive: true });

const run = (args) => {
  const r = spawnSync(ffmpegPath, ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'inherit' });
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${args.join(' ')}`);
};

for (const file of readdirSync(SRC).filter((f) => f.endsWith('.mp4'))) {
  const name = file.replace(/\.mp4$/, '');
  const input = join(SRC, file);
  const mp4 = join(OUT, `${name}.mp4`);
  const poster = join(OUT, `${name}.webp`);
  if (!existsSync(mp4) || statSync(mp4).mtimeMs < statSync(input).mtimeMs) {
    run(['-i', input, '-vf', 'scale=540:-2:flags=lanczos', '-c:v', 'libx264', '-preset', 'slow', '-crf', '27', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', mp4]);
  }
  run(['-ss', '1', '-i', input, '-frames:v', '1', '-vf', 'scale=540:-2:flags=lanczos', '-c:v', 'libwebp', '-quality', '72', poster]);
  console.log(`clip: ${name} → ${(statSync(mp4).size / 1048576).toFixed(1)} MB`);
}
