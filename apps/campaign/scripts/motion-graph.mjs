/**
 * Measures her movement in the model video, for the page:
 *
 * - turn: the frame where she's most still in the first half of her performance. After the
 *   opening, the chapters play the take back to this frame and then forward again; turning
 *   around on a still moment makes the change of direction invisible. (No crossfades between
 *   different poses: those show her doubled.)
 * - reach / reachRows: how far she spreads sideways in her poses (overall, and at each height),
 *   so text can be kept clear of her even in her widest pose.
 *
 *   npm run motion -w @mfm/campaign      (run after `npm run frames`)
 *
 * Output: src/motion-graph.json  { count, from, stepMedian, turn, reach, reachRows }. Frames are 0-based.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ffmpegPath from 'ffmpeg-static';

const app = join(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(join(app, 'src', 'frames.manifest.json'), 'utf8'));
const N = manifest.count;

// the frames shown from "The result" on (the very start is the opening's own moment)
const FROM = Math.round((N - 1) * 0.3);
// where to look for the turning point: far enough back that the chapters get about as many frames
// per screen of scroll as the opening, not so far that they replay the opening's first moves
const TURN_FROM = Math.round((N - 1) * 0.33);
const TURN_TO = Math.round((N - 1) * 0.42);
const W = 30;
const H = 36;

// decode every frame small, with transparency (ffmpeg's webp decoder keeps the alpha channel)
const r = spawnSync(
  ffmpegPath,
  ['-hide_banner', '-loglevel', 'error', '-i', join(app, 'public', 'frames', 'desktop', '%04d.webp'), '-vf', `scale=${W}:${H}:flags=area`, '-pix_fmt', 'rgba', '-f', 'rawvideo', 'pipe:1'],
  { maxBuffer: 1 << 28 },
);
if (r.status !== 0) throw new Error('ffmpeg failed to decode the frames');
const buf = r.stdout;
const FS = W * H * 4;
if (buf.length / FS !== N) throw new Error(`expected ${N} frames, got ${buf.length / FS}`);

// how different two frames are: premultiplied colour + alpha (the silhouette weighs most)
const dist = (a, b) => {
  let s = 0;
  for (let p = 0; p < W * H; p++) {
    const o = a * FS + p * 4;
    const q = b * FS + p * 4;
    const aa = buf[o + 3] / 255;
    const ab = buf[q + 3] / 255;
    for (let c = 0; c < 3; c++) {
      const d = (buf[o + c] / 255) * aa - (buf[q + c] / 255) * ab;
      s += d * d;
    }
    const d = (aa - ab) * 2;
    s += d * d;
  }
  return Math.sqrt(s / (W * H * 4));
};

// her movement at each frame (the step to the next one), smoothed over ±2 frames
const step = Array.from({ length: N - 1 }, (_, i) => dist(i, i + 1));
const moving = step.map((_, i) => {
  const around = step.slice(Math.max(0, i - 2), i + 3);
  return around.reduce((a, b) => a + b, 0) / around.length;
});
const stepMed = step.toSorted((a, b) => a - b)[Math.floor(step.length / 2)];
let turn = TURN_FROM;
for (let i = TURN_FROM; i <= TURN_TO; i++) if (moving[i] < moving[turn]) turn = i;

// How far she reaches sideways in any of her poses from FROM on (fraction of the frame width,
// from the left edge)…
let reachLeft = 1;
let reachRight = 0;
for (let f = FROM; f < N; f++) {
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (buf[f * FS + (y * W + x) * 4 + 3] < 60) continue;
      reachLeft = Math.min(reachLeft, x / W);
      reachRight = Math.max(reachRight, (x + 1) / W);
    }
  }
}
// …and at each height (top to bottom, H rows), since she's widest at the elbows and much
// narrower at the hips and legs. null = she's never in that row.
const reachRows = Array.from({ length: H }, (_, y) => {
  let l = 1;
  let rr = 0;
  for (let f = FROM; f < N; f++) {
    for (let x = 0; x < W; x++) {
      if (buf[f * FS + (y * W + x) * 4 + 3] < 60) continue;
      l = Math.min(l, x / W);
      rr = Math.max(rr, (x + 1) / W);
    }
  }
  return rr > l ? [+l.toFixed(3), +rr.toFixed(3)] : null;
});

const out = { count: N, from: FROM, stepMedian: +stepMed.toFixed(4), turn, reach: [+reachLeft.toFixed(3), +reachRight.toFixed(3)], reachRows };
writeFileSync(join(app, 'src', 'motion-graph.json'), JSON.stringify(out) + '\n');
console.log(
  `motion: turns at frame ${turn} (movement ${(moving[turn] / stepMed).toFixed(2)}× a typical step; the last frame ${(moving[N - 2] / stepMed).toFixed(2)}×) · reach ${out.reach.join('–')}`,
);
