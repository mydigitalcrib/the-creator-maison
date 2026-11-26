/**
 * Frame-by-frame image sequence for the canvas.
 *
 * Progressive loading: frames load coarse → fine (every 16th, then 8th, 4th, 2nd, then the rest),
 * a few at a time, so the animation is scrubbable almost immediately. Until a frame is ready,
 * the nearest loaded frame is drawn instead.
 *
 * Smooth drawing: a plain image gets decoded again by the browser on every draw (~10 ms each).
 * So the frames that are about to be shown are kept pre-decoded (ImageBitmaps, ~2.5 ms to draw),
 * in a small least-recently-used cache, so memory stays modest. The player tells it what's next
 * with want(); anything not ready yet is drawn from the plain image (slower, but correct).
 * Bitmaps are decoded from each frame's compressed file (a Blob), which the browser does on a
 * background thread, at most a few at a time, so the page never freezes while they're prepared.
 */
import manifest from './frames.manifest.json';
import { asset } from './content';

export type FrameSet = 'desktop' | 'mobile';

export const FRAME_COUNT: number = manifest.count;
export const frameSize = (set: FrameSet) => manifest.sizes[set];

const url = (set: FrameSet, i: number) => asset(`frames/${set}/${String(i + 1).padStart(4, '0')}.webp`);

/** Load order: 0 and the last frame first, then halving steps. */
const loadOrder = (count: number) => {
  const order: number[] = [0, count - 1];
  const seen = new Set(order);
  for (let step = 16; step >= 1; step /= 2) {
    for (let i = 0; i < count; i += step) {
      if (!seen.has(i)) {
        seen.add(i);
        order.push(i);
      }
    }
  }
  return order;
};

export class FrameSequence {
  readonly images: (HTMLImageElement | null)[];
  private loadedCount = 0;
  private cancelled = false;
  /** Each frame's compressed file, for background decoding. */
  private readonly blobs: (Blob | null)[];
  /** Pre-decoded frames, least recently used first. */
  private readonly bitmaps = new Map<number, ImageBitmap>();
  private readonly pending = new Set<number>();
  /** Bitmaps being decoded in the background right now. */
  private inFlight = 0;
  private queue: number[] = [];

  constructor(
    readonly set: FrameSet,
    private readonly onProgress: (loaded: number, total: number) => void,
    private readonly onFrameReady: (index: number) => void,
    /** How many pre-decoded frames to keep (≈1.7 MB each on desktop). */
    private readonly capacity = 90,
  ) {
    this.images = new Array(FRAME_COUNT).fill(null);
    this.blobs = new Array(FRAME_COUNT).fill(null);
  }

  /**
   * Ask for these frames to be ready pre-decoded, most urgent first. Replaces the previous wish
   * list (what's no longer wanted soon is simply not started); decoding runs in the background.
   */
  want(indices: Iterable<number>) {
    if (typeof createImageBitmap !== 'function') return;
    const next: number[] = [];
    for (const i of indices) {
      if (i < 0 || i >= FRAME_COUNT) continue;
      const have = this.bitmaps.get(i);
      if (have) {
        // recently used: move to the back of the line
        this.bitmaps.delete(i);
        this.bitmaps.set(i, have);
        continue;
      }
      if (this.blobs[i] && !this.pending.has(i) && !next.includes(i)) next.push(i);
    }
    this.queue = next;
    this.pump();
  }

  private pump() {
    const MAX_IN_FLIGHT = 3;
    while (this.inFlight < MAX_IN_FLIGHT && this.queue.length) {
      const i = this.queue.shift()!;
      const blob = this.blobs[i];
      if (!blob || this.pending.has(i) || this.bitmaps.has(i)) continue;
      this.pending.add(i);
      this.inFlight++;
      createImageBitmap(blob)
        .then((bm) => {
          if (this.cancelled) return bm.close();
          this.bitmaps.set(i, bm);
          while (this.bitmaps.size > this.capacity) {
            const [oldest, old] = this.bitmaps.entries().next().value as [number, ImageBitmap];
            this.bitmaps.delete(oldest);
            old.close();
          }
          this.onFrameReady(i);
        })
        .catch(() => {})
        .finally(() => {
          this.pending.delete(i);
          this.inFlight--;
          if (!this.cancelled) this.pump();
        });
    }
  }

  /** What to draw for frame i: pre-decoded if ready, else the image, else the nearest loaded frame. */
  frame(i: number): CanvasImageSource | null {
    return this.bitmaps.get(i) ?? this.nearest(i);
  }

  /** Frame i only if it's already pre-decoded (cheap to draw right now), else undefined. */
  ready(i: number): ImageBitmap | undefined {
    return this.bitmaps.get(i);
  }

  get progress() {
    return this.loadedCount / FRAME_COUNT;
  }

  /** Start loading. `only` limits the work (e.g. the reduced-motion fallback needs one frame). */
  load(only?: number[], concurrency = 6) {
    const queue = only ?? loadOrder(FRAME_COUNT);
    let next = 0;
    const worker = async (): Promise<void> => {
      while (!this.cancelled && next < queue.length) {
        const i = queue[next++];
        const img = new Image();
        img.decoding = 'async';
        try {
          const blob = await (await fetch(url(this.set, i))).blob();
          this.blobs[i] = blob;
          img.src = URL.createObjectURL(blob);
          await img.decode();
        } catch {
          continue;
        }
        if (this.cancelled) return;
        this.images[i] = img;
        this.loadedCount++;
        this.onFrameReady(i);
        this.onProgress(this.loadedCount, only ? only.length : FRAME_COUNT);
      }
    };
    for (let k = 0; k < concurrency; k++) void worker();
  }

  cancel() {
    this.cancelled = true;
    for (const bm of this.bitmaps.values()) bm.close();
    this.bitmaps.clear();
  }

  /** The loaded frame closest to `index`. */
  nearest(index: number): HTMLImageElement | null {
    if (this.images[index]) return this.images[index];
    for (let d = 1; d < FRAME_COUNT; d++) {
      const lo = this.images[index - d];
      if (lo) return lo;
      const hi = this.images[index + d];
      if (hi) return hi;
    }
    return null;
  }
}

/** Keeps a canvas's backing store matched to its on-screen size (capped at 2× pixel density). */
export const fitCanvas = (canvas: HTMLCanvasElement) => {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.round(canvas.clientWidth * dpr);
  const h = Math.round(canvas.clientHeight * dpr);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
    return true;
  }
  return false;
};

/** Draws one frame (always a single picture of her, never two blended). */
export const drawFrame = (canvas: HTMLCanvasElement, img: CanvasImageSource | null) => {
  const ctx = canvas.getContext('2d');
  if (!ctx || !img) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
};
