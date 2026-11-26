/**
 * Turns the model video (green screen) into transparent WebP frames for the scroll animation.
 *
 *   npm run frames -w @mfm/campaign
 *   node scripts/extract-frames.mjs --only-cut     (only the frames with a rebuilt crown)
 *
 * 1. FFmpeg decodes the video, crops to the model (which also cuts out the AI watermark in the
 *    bottom-right corner) and streams raw RGB frames.
 * 2. Each frame is keyed here: a pixel is background when green clearly beats both red and blue
 *    (FFmpeg's own chromakey also ate the dark denim, so it isn't used). Edge pixels are un-mixed
 *    from the green and de-spilled, so hair has no green fringe.
 * 3. Her head: in the source video the top of her head leaves the frame now and then (a few
 *    pixels of hair are simply missing), which shows as a flat cut whenever she's shown smaller.
 *    So every frame gets PAD rows of air above her (the bottom rows, which the page fades out
 *    anyway, are dropped), and in the cut frames the missing crown is rebuilt from the nearest
 *    frames where her whole head is visible (matched in width and position, blended over time).
 * 4. FFmpeg encodes the RGBA frames to WebP (with alpha) at two sizes: desktop and mobile.
 *
 * The video is decoded twice: first to learn the shape of her head in every frame, then to write.
 *
 * Output: public/frames/{desktop,mobile}/0001.webp … and src/frames.manifest.json
 */
import { spawn } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ffmpegPath from 'ffmpeg-static';

const app = join(dirname(fileURLToPath(import.meta.url)), '..');
const INPUT = join(app, 'media-src', 'model.mp4');
const OUT = join(app, 'public', 'frames');

// Where the model is in the 1280×720 source (Kling video): she never leaves x 388–938;
// the watermark sits at x 1124–1248, bottom right, so this crop leaves it out.
const CROP = { w: 600, h: 720, x: 360, y: 0 };
// Green dominance (g − max(r, b)): her pixels ≤ 4, the backdrop ≥ 51.
const SOLID_AT = 8;
const CLEAR_AT = 46;
const SIZES = [
  { name: 'desktop', width: 600, quality: 80 },
  { name: 'mobile', width: 400, quality: 74 },
];
/** Rows of air added above her (the frame keeps its size: as many rows are dropped at the bottom). */
const PAD = 24;
/** Rows of the top of each frame remembered in the first pass (enough to cover the crown of her head). */
const TOP = 90;
/** --only-cut: re-encode only the frames whose crown is rebuilt (after changing that step). */
const ONLY_CUT = process.argv.includes('--only-cut');

const W = CROP.w;
const H = CROP.h;
const FRAME = W * H * 3;
const ROW = W * 4;

/** Decode the cropped video, calling onFrame(rgb, index) for each frame. */
const decode = (onFrame) =>
  new Promise((resolve, reject) => {
    const decoder = spawn(
      ffmpegPath,
      ['-hide_banner', '-loglevel', 'error', '-i', INPUT, '-an', '-vf', `crop=${W}:${H}:${CROP.x}:${CROP.y}`, '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1'],
      { stdio: ['ignore', 'pipe', 'inherit'] },
    );
    // fill one frame buffer at a time (no re-copying of partial data)
    const frame = Buffer.alloc(FRAME);
    let filled = 0;
    let count = 0;
    decoder.stdout.on('data', (chunk) => {
      let offset = 0;
      while (offset < chunk.length) {
        const n = Math.min(FRAME - filled, chunk.length - offset);
        chunk.copy(frame, filled, offset, offset + n);
        filled += n;
        offset += n;
        if (filled < FRAME) break;
        filled = 0;
        const more = onFrame(frame, count++);
        if (more === false) {
          decoder.stdout.pause();
          // the caller's writer is full: resume when it drains
          onFrame.resume = () => decoder.stdout.resume();
        }
      }
    });
    decoder.on('close', (code) => (code === 0 ? resolve(count) : reject(new Error(`ffmpeg decoder exited with ${code}`))));
  });

/** The backdrop's average color in this frame, from the far-left and far-right strips. */
const backdrop = (rgb) => {
  let r = 0, g = 0, b = 0, n = 0;
  for (let y = 0; y < H; y += 4) {
    for (const x of [2, 12, 22, W - 3, W - 13, W - 23]) {
      const i = (y * W + x) * 3;
      if (rgb[i + 1] - Math.max(rgb[i], rgb[i + 2]) < CLEAR_AT) continue;
      r += rgb[i]; g += rgb[i + 1]; b += rgb[i + 2]; n++;
    }
  }
  return n ? [r / n, g / n, b / n] : [0, 130, 66];
};

const key = (rgb) => {
  const out = Buffer.alloc(W * H * 4);
  const [br, bg, bb] = backdrop(rgb);
  for (let p = 0, i = 0, o = 0; p < W * H; p++, i += 3, o += 4) {
    let r = rgb[i], g = rgb[i + 1], b = rgb[i + 2];
    const k = g - Math.max(r, b);
    let a = k <= SOLID_AT ? 1 : k >= CLEAR_AT ? 0 : 1 - (k - SOLID_AT) / (CLEAR_AT - SOLID_AT);
    if (a > 0 && a < 1) {
      // un-mix the green backdrop out of edge pixels (hair strands)
      r = (r - (1 - a) * br) / a;
      g = (g - (1 - a) * bg) / a;
      b = (b - (1 - a) * bb) / a;
    }
    // de-spill: nothing she wears is green, so green may never beat red and blue
    g = Math.min(g, Math.max(r, b));
    out[o] = Math.max(0, Math.min(255, r));
    out[o + 1] = Math.max(0, Math.min(255, g));
    out[o + 2] = Math.max(0, Math.min(255, b));
    out[o + 3] = Math.round(a * 255);
  }
  return out;
};

// ---------------- her head ----------------
const SOLID = 128;
/** Leftmost / rightmost solid pixel of row y (or null), optionally only within [from, to]. */
const extent = (top, y, from = 0, to = W - 1) => {
  let l = -1;
  let r = -1;
  // (whole pixels only: a fractional x would read another colour channel as the alpha)
  for (let x = Math.max(0, Math.ceil(from)); x <= Math.min(W - 1, Math.floor(to)); x++) {
    if (top[y * ROW + x * 4 + 3] < SOLID) continue;
    if (l < 0) l = x;
    r = x;
  }
  return l < 0 ? null : [l, r];
};
/** Is the top of her head cut off by the edge of the source frame? */
const isCut = (top) => {
  const e = extent(top, 0);
  return !!e && e[1] - e[0] >= 2;
};
/** A complete head's outline: per depth below the crown, its width and centre. */
const profile = (top) => {
  let crown = -1;
  for (let y = 0; y < TOP && crown < 0; y++) if (extent(top, y)) crown = y;
  if (crown < 0) return null;
  const first = extent(top, crown);
  const c = (first[0] + first[1]) / 2;
  const rows = [];
  for (let y = crown; y < TOP; y++) {
    const e = extent(top, y, c - 160, c + 160);
    rows.push(e ? { w: e[1] - e[0] + 1, c: (e[0] + e[1]) / 2 } : { w: 0, c });
  }
  return { crown, rows };
};
/**
 * The missing crown of a cut frame (PAD rows, RGBA), taken from a reference frame with a whole
 * head: find how deep the cut is (where the reference head is as wide as the cut), then copy the
 * reference's rows above that depth, lined up with this frame's head.
 */
const crownFrom = (cutTop, refTop) => {
  const cap = Buffer.alloc(PAD * ROW);
  const p = profile(refTop);
  const e = extent(cutTop, 0);
  if (!p || !e) return { cap, depth: 0 };
  const w0 = e[1] - e[0] + 1;
  const c0 = (e[0] + e[1]) / 2;
  // the depth below the reference's crown where its head is as wide as the cut (between rows:
  // interpolated, with nothing above the crown), rounded to whole rows
  const i = p.rows.findIndex((r) => r.w >= w0);
  const at = i < 0 ? p.rows.length - 1 : i;
  const wPrev = at > 0 ? p.rows[at - 1].w : 0;
  const exact = at - 1 + (w0 - wPrev) / Math.max(1, p.rows[at].w - wPrev);
  const depth = Math.max(0, Math.min(PAD - 2, Math.round(exact)));
  const dx = Math.round(c0 - p.rows[depth].c);
  for (let k = 1; k <= depth; k++) {
    const ys = p.crown + depth - k; // reference row k rows above the depth of the cut
    const yt = PAD - k; // cap row k rows above this frame's top edge
    for (let x = 0; x < W; x++) {
      const xs = x - dx;
      if (xs < 0 || xs >= W) continue;
      refTop.copy(cap, yt * ROW + x * 4, ys * ROW + xs * 4, ys * ROW + xs * 4 + 4);
    }
  }
  return { cap, depth };
};
/** Mix two caps (premultiplied), wa + wb = 1. */
const mix = (a, b, wa) => {
  const out = Buffer.alloc(a.length);
  const wb = 1 - wa;
  for (let i = 0; i < a.length; i += 4) {
    const A = a[i + 3] * wa + b[i + 3] * wb;
    if (A < 0.5) continue;
    for (let ch = 0; ch < 3; ch++) out[i + ch] = Math.round((a[i + ch] * a[i + 3] * wa + b[i + ch] * b[i + 3] * wb) / A);
    out[i + 3] = Math.round(A);
  }
  return out;
};

// ---------------- pass 1: the top of every frame ----------------
const tops = [];
await decode((rgb) => {
  tops.push(Buffer.from(key(rgb).subarray(0, TOP * ROW)));
});
const N = tops.length;
const cut = tops.map(isCut);
const caps = new Map();
const repaired = [];
for (let f = 0; f < N; f++) {
  if (!cut[f]) continue;
  let a = f;
  while (a >= 0 && cut[a]) a--;
  let b = f;
  while (b < N && cut[b]) b++;
  const fromA = a >= 0 ? crownFrom(tops[f], tops[a]) : null;
  const fromB = b < N ? crownFrom(tops[f], tops[b]) : null;
  const wa = fromA && fromB ? (b - f) / (b - a) : fromA ? 1 : 0;
  caps.set(f, fromA && fromB ? mix(fromA.cap, fromB.cap, wa) : (fromA ?? fromB).cap);
  repaired.push(`${f}:${Math.round((fromA?.depth ?? 0) * wa + (fromB?.depth ?? 0) * (1 - wa))}`);
}
tops.length = 0;

// ---------------- pass 2: key, add the air above her (and her crown), encode ----------------
/** One frame as it's published: PAD rows of air (with her rebuilt crown, if any), then the keyed picture. */
const publish = (rgb, f) => {
  const keyed = key(rgb);
  const out = Buffer.alloc(W * H * 4);
  caps.get(f)?.copy(out, 0);
  keyed.copy(out, PAD * ROW, 0, (H - PAD) * ROW);
  return out;
};
const scaleTo = (s, i) => `[v${i}]scale=${s.width}:-2:flags=lanczos,format=yuva420p[o${i}]`;
const splitTo = `[0:v]split=${SIZES.length}${SIZES.map((_, i) => `[v${i}]`).join('')}`;
const webp = (s) => ['-c:v', 'libwebp', '-quality', String(s.quality), '-compression_level', '6'];

if (ONLY_CUT) {
  // quicker: re-encode just the frames with a rebuilt crown (the others are already published)
  const jobs = [];
  await decode((rgb, f) => {
    if (caps.has(f)) jobs.push([f, publish(rgb, f)]);
  });
  for (const [f, out] of jobs) {
    await new Promise((resolve, reject) => {
      const name = String(f + 1).padStart(4, '0') + '.webp';
      const enc = spawn(
        ffmpegPath,
        [
          '-hide_banner', '-loglevel', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-i', 'pipe:0',
          '-filter_complex', [splitTo, ...SIZES.map(scaleTo)].join(';'),
          ...SIZES.flatMap((s, i) => ['-map', `[o${i}]`, ...webp(s), '-frames:v', '1', '-update', '1', join(OUT, s.name, name)]),
        ],
        { stdio: ['pipe', 'inherit', 'inherit'] },
      );
      enc.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited with ${code}`))));
      enc.stdin.end(out);
    });
  }
  console.log(`crown rebuilt and re-encoded in ${jobs.length} frames (frame:rows) ${repaired.join(' ')}`);
  process.exit(0);
}

rmSync(OUT, { recursive: true, force: true });
for (const s of SIZES) mkdirSync(join(OUT, s.name), { recursive: true });

// encoder: raw RGBA in → two WebP image sequences out
const filter = [splitTo, ...SIZES.map(scaleTo)].join(';');
const encoder = spawn(
  ffmpegPath,
  [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-r', '24', '-i', 'pipe:0',
    '-filter_complex', filter,
    ...SIZES.flatMap((s, i) => [
      '-map', `[o${i}]`, ...webp(s),
      '-f', 'image2', join(OUT, s.name, '%04d.webp'),
    ]),
  ],
  { stdio: ['pipe', 'inherit', 'inherit'] },
);
const encoded = new Promise((resolve, reject) => encoder.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg encoder exited with ${code}`)))));

const onFrame = (rgb, f) => {
  const ok = encoder.stdin.write(publish(rgb, f));
  if (!ok) encoder.stdin.once('drain', () => onFrame.resume?.());
  return ok;
};
const frames = await decode(onFrame);
encoder.stdin.end();
await encoded;

const manifest = {
  count: frames,
  fps: 24,
  sizes: Object.fromEntries(SIZES.map((s) => [s.name, { width: s.width, height: Math.round((H * s.width) / W / 2) * 2 }])),
};
// the app imports this file (files in public/ can't be imported from code)
writeFileSync(join(app, 'src', 'frames.manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`frames: ${frames} → public/frames/{${SIZES.map((s) => s.name).join(',')}}`);
console.log(`crown rebuilt in ${repaired.length} frames (frame:rows) ${repaired.join(' ')}`);
