/**
 * The whole site is this one pinned scene. Scroll drives a single GSAP timeline, so scrolling back
 * plays everything in reverse. Time is measured in screens of scroll (1 = one viewport height).
 *
 * Nothing moves faster than life: the scroll sets where the scene should be, and the whole scene
 * (her and the words together, so they stay in sync) glides there at a calm pace, easing in and
 * out. Only a long jump (the "Send a brief" button, a big fling) travels faster. Her video also
 * never plays faster than natural speed, and if the page ever stalls for a moment she simply
 * continues from where she was (nothing catches up in one jump).
 *
 * Her video belongs to the scroll, from top to bottom: scrolling down plays it on, scrolling up
 * plays it back, stopping pauses it. It never plays by itself, and it never blends two pictures
 * of her (see PATH for how the ~10 s take covers the whole page).
 *
 *   0.00–6.00   Opening — the frame-by-frame video of the model:
 *               her name splits around her · 01 The hook (she lets go of the jacket, slides left)
 *               · 02 The story (she turns, slides right) · 03 The result (centered, name returns,
 *               tags pinned to her, two numbers).
 *   6.00–13.8   Chapters, in place next to her (desktop): the camera pans as she moves to one
 *               side (the meadow moves with her, a little less), the chapter (a storybook object)
 *               appears on the other side, never over her.
 *               04 Three little films · 05 The timetable · 06 A letter
 *               · 07 The journey so far (numbers count up) · 08 Send me a postcard (the brief).
 *
 * Small screens: only the opening is pinned; the chapters are stacked underneath (see App).
 * Reduced motion: nothing pinned or scrubbed — her final pose, chapters stacked underneath.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useLayoutEffect, useRef, useState } from 'react';
import { categories, formatMetric, metrics, profile, videos } from '../content';
import { FRAME_COUNT, FrameSequence, drawFrame, fitCanvas, type FrameSet } from '../frames';
import motionGraph from '../motion-graph.json';
import { setBriefTarget } from '../immersive';
import { Backdrop } from './Backdrop';
import { AboutPanel, BriefPanel, IndexPanel, ProofPanel, WorkPanel } from './Chapters';
import { Petals } from './Petals';
import { Split } from './Split';

gsap.registerPlugin(ScrollTrigger);

/**
 * Moments in the model video (Kling, 241 frames), as frame indices: 0 holding the jacket ·
 * ~45 lets go · ~100 hand on hip · ~130 turned away, looking over her shoulder · ~176 facing you
 * again · 200–240 resting poses (hand in pocket ↔ hands on hips). Kept as fractions, so a re-cut
 * video of the same choreography still lines up.
 */

/** Chapters and where each starts on the immersive timeline (in screens of scroll). */
const CHAPTERS = [
  { id: 'hook', name: 'The hook', start: 0 },
  { id: 'story', name: 'The story', start: 2.64 },
  { id: 'result', name: 'The result', start: 4.44 },
  { id: 'work', name: 'Three little films', start: 6.6 },
  { id: 'index', name: 'The timetable', start: 8.3 },
  { id: 'about', name: 'A letter', start: 9.9 },
  { id: 'proof', name: 'The journey so far', start: 11.7 },
  { id: 'brief', name: 'Send me a postcard', start: 13.2 },
] as const;
const TOTAL = 13.8;
/** Screens of scroll for the opening video: about real-life speed at a relaxed scroll. */
const OPENING = 6;
/** Her top speed in video frames per second (the video itself runs at 24). */
const MAX_FPS = 34;
/** The scene's calm pace, in screens of scroll per second (≈ 30 video frames/s in the opening). */
const SCENE_PACE = 0.75;
/** Further behind than this (in screens), the scene speeds up so long jumps don't drag. */
const SCENE_FAR = 2.5;
/** In the opening's own (0–1) time, where the three opening chapters start. */
const OPENING_STARTS = [0, 0.44, 0.74];
/** Longest step any motion may take in one rendered frame (ms): after a stall she just continues. */
const MAX_STEP_MS = 50;

// ---- her performance, as one continuous strip of video frames that the scroll moves along ----
/**
 * The opening plays the take as filmed (0 → last frame). The take is ~10 s and the page longer, so
 * the chapters continue it without ever blending two different poses (that shows her doubled):
 * they play it back from her resting pose to the moment she's most still (motionGraph.turn), then
 * forward again to her resting pose for the postcard. Both changes of direction happen where she
 * is nearly motionless, so they don't show. One picture at a time, always.
 */
const PATH: number[] = (() => {
  const last = FRAME_COUNT - 1;
  const turn = Math.max(1, Math.min(last - 1, motionGraph.turn));
  const path: number[] = [];
  for (let f = 0; f <= last; f++) path.push(f);
  for (let f = last - 1; f >= turn; f--) path.push(f);
  for (let f = turn + 1; f <= last; f++) path.push(f);
  return path;
})();

const [FIRST, ...REST] = profile.name.split(' ');
const LAST = REST.join(' ');
const pad = (n: number) => String(n).padStart(2, '0');

const countText = (value: number, target: number) =>
  target >= 10000
    ? new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
    : Number.isInteger(target)
      ? String(Math.round(value))
      : value.toFixed(1);

export function HeroSequence({ immersive }: { immersive: boolean }) {
  const root = useRef<HTMLElement>(null);
  const model = useRef<HTMLDivElement>(null);
  const glow = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const loader = useRef<HTMLParagraphElement>(null);
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);
  const chapterCount = immersive ? CHAPTERS.length : 3;

  useLayoutEffect(() => {
    const cv = canvas.current!;
    const set: FrameSet = window.matchMedia('(max-width: 767.98px)').matches ? 'mobile' : 'desktop';
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const LASTF = FRAME_COUNT - 1;
    const END = PATH.length - 1;
    /** Positions along the strip: target = where the scroll says she should be · frame = what's shown (follows at natural speed) */
    const state = { frame: reduce ? LASTF : 0, target: reduce ? LASTF : 0, vel: 0, snap: true };
    let drawnKey = '';

    const frameAt = (pos: number) => PATH[Math.max(0, Math.min(END, Math.round(pos)))];
    const render = (force = false) => {
      const src = frameAt(state.frame);
      // running fast (a long jump), draw only pictures that are ready: a not-yet-decoded one would
      // stall the page while it decodes, so the current picture simply stays a moment longer
      const fast = !force && Math.abs(state.vel) > MAX_FPS * 1.5;
      const img = fast ? seq.ready(src) : seq.frame(src);
      if (!img) return;
      cv.dataset.frame = String(src + 1);
      const key = `${src}|${img instanceof ImageBitmap}`;
      if (!force && key === drawnKey) return;
      drawnKey = key;
      drawFrame(cv, img);
    };

    /** Keep ready (pre-decoded) the pictures she's about to show, in the direction she's going. */
    const prefetch = () => {
      const want: number[] = [];
      const add = (pos: number) => {
        const src = PATH[Math.round(pos)];
        if (src !== undefined) want.push(src);
      };
      const dir = state.target >= state.frame ? 1 : -1;
      if (Math.abs(state.vel) > MAX_FPS * 1.5) {
        // running fast (a long jump): she skips frames, so prepare only the ones she'll land on in
        // the next few screen refreshes (preparing every frame would only waste the decoder)
        for (let k = 1; k <= 10; k++) add(Math.max(Math.min(state.frame + (state.vel * k) / 60, Math.max(state.target, state.frame)), Math.min(state.target, state.frame)));
        add(state.target);
      } else {
        const ahead = Math.min(30, Math.abs(state.target - state.frame) + 8);
        for (let k = -2; k < ahead; k++) add(state.frame + k * dir);
      }
      seq.want(want);
    };

    const seq = new FrameSequence(
      set,
      (loaded, total) => {
        if (!loader.current) return;
        const pct = Math.round((loaded / total) * 100);
        loader.current.textContent = `Loading frames ${pct}%`;
        loader.current.classList.toggle('is-done', pct >= 100);
      },
      () => render(),
    );
    // reduced motion only ever shows the final pose
    seq.load(reduce ? [LASTF] : undefined);

    fitCanvas(cv);
    const ro = new ResizeObserver(() => {
      fitCanvas(cv);
      render(true);
    });
    ro.observe(cv);

    /** The timeline, the scroll position it should reach (in its own time) and where it is now. */
    let scene: { tl: gsap.core.Timeline; st: ScrollTrigger; target: number; time: number; vel: number; rush: number | null } | null = null;
    let prev = performance.now();
    let raf = 0;
    // scrolling by hand cancels the brisk trip of "Send a brief": back to the calm pace
    const onManual = () => {
      if (scene) scene.rush = null;
    };
    for (const ev of ['wheel', 'touchstart', 'keydown'] as const) window.addEventListener(ev, onManual, { passive: true });
    const tick = (now: number) => {
      // elapsed time, but never more than one short step: if the page stalls for a moment, she
      // continues from where she was instead of jumping ahead to catch up
      const dt = Math.min(MAX_STEP_MS, now - prev);
      prev = now;

      // the scene glides toward the scroll: calm when close, quicker only when far behind
      if (scene) {
        const perUnit = (scene.st.end - scene.st.start) / window.innerHeight / scene.tl.duration(); // screens per timeline unit
        const diff = scene.target - scene.time;
        const farScreens = Math.max(0, Math.abs(diff) * perUnit - SCENE_FAR);
        // "Send a brief" travels briskly (it's a deliberate jump); scrolling keeps the calm pace
        const cap = (scene.rush !== null ? 7 : SCENE_PACE + farScreens * 1.0) / perUnit;
        const want = Math.max(-cap, Math.min(cap, diff * 3.2));
        scene.vel += (want - scene.vel) * Math.min(1, (dt / 1000) * 5);
        const step = scene.vel * (dt / 1000);
        if (Math.abs(diff) < 0.0004 || Math.abs(step) >= Math.abs(diff)) {
          scene.time = scene.target;
          scene.vel = 0;
          // the brisk trip ends once it has really arrived where the button was taking it
          if (scene.rush !== null && Math.abs(scene.time - scene.rush) < 0.02) scene.rush = null;
        } else scene.time += step;
        if (Math.abs(scene.tl.time() - scene.time) > 1e-6) scene.tl.time(scene.time);
      }

      // her video follows the scroll at natural speed: speeds up gently, slows down before arriving
      let moved = false;
      const diff = state.target - state.frame;
      if (state.snap) {
        // first paint (or a reload halfway down the page): no fast-forward, just be there
        state.frame = state.target;
        state.vel = 0;
        state.snap = false;
        moved = true;
      } else if (diff !== 0) {
        // natural speed, unless she's far behind (a long jump: the scrollbar dragged, "Send a
        // brief"), then the video runs faster to get there; never a blend of two pictures
        const fcap = MAX_FPS + Math.max(0, Math.abs(diff) - 20) * 6;
        const want = Math.max(-fcap, Math.min(fcap, diff * 4.5));
        state.vel += (want - state.vel) * Math.min(1, (dt / 1000) * 6);
        const step = state.vel * (dt / 1000);
        if (Math.abs(diff) < 0.05 || Math.abs(step) >= Math.abs(diff)) {
          state.frame = state.target;
          state.vel = 0;
        } else state.frame += step;
        moved = true;
      }
      prefetch();
      if (moved) render();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const setChapter = (i: number) => {
      if (i === activeRef.current) return;
      activeRef.current = i;
      setActive(i);
    };

    const ctx = gsap.context(() => {
      const q = gsap.utils.selector(root);
      const mm = gsap.matchMedia();

      mm.add(
        {
          desktop: '(min-width: 768px)',
          motion: '(prefers-reduced-motion: no-preference)',
        },
        (c) => {
          const { desktop, motion } = c.conditions as { desktop: boolean; motion: boolean };
          if (!motion) {
            // static final pose: the name split around her, the result caption, tags and numbers
            state.frame = state.target = LASTF;
            render(true);
            setChapter(2);
            gsap.set(q('.h-word--hook, .h-word--story, .cap--hook, .cap--story, .scroll-cue, .progress, .seal'), {
              autoAlpha: 0,
            });
            return;
          }

          const full = desktop && immersive;
          const U = full ? OPENING : 1;
          const total = full ? TOTAL : 1;
          const at = (p: number) => p * U;
          const vw = (n: number) => () => window.innerWidth * n;
          const mx = desktop ? 0.22 : 0.06;
          /** Slide her sideways (dir −1 left, +1 right), but never past the edge of the screen. */
          const side = (dir: number, amount: number, scale: number) => () => {
            const w = window.innerWidth;
            const width = (model.current?.offsetWidth ?? 0) * scale;
            const room = Math.max(0, (w - width) / 2 - 12);
            return dir * Math.min(w * amount, room);
          };

          // ---- keeping her clear of the words, measured against the real layout ----
          // REACH: how far her widest living pose spreads across her frame (left, right fractions).
          const [reachL, reachR] = motionGraph.reach as [number, number];
          const A = 0.5 - reachL; // from her centre to her furthest-left pixel, per frame width
          const B = reachR - 0.5; // … to her furthest-right pixel
          const AIR = 12; // breathing room between her and any words
          const frameW = () => model.current?.offsetWidth ?? 0;
          /**
           * In "The result" she stands between "Sinai" and "Rivodó", clear of both even in her widest
           * living pose. She stays as large as fits (never below MIN_HER, so she doesn't look shrunk);
           * when even that is too tight, the two words get a little smaller instead (anchored at their
           * outer corners). Measured row by row: she's wide at the elbows, narrow at the legs.
           */
          const ROWS = motionGraph.reachRows as ([number, number] | null)[];
          const MIN_HER = 0.85;
          const resultFit = () => {
            const base = desktop ? 0.93 : 0.97;
            const first = q('.h-word--first')[0] as HTMLElement | undefined;
            const last = q('.h-word--last')[0] as HTMLElement | undefined;
            const layer = first?.offsetParent as HTMLElement | null | undefined;
            const fw = frameW();
            const fh = model.current?.offsetHeight ?? 0;
            if (!first || !last || !layer || !fw || !fh) return { her: base, words: 1 };
            const mid = layer.clientWidth / 2;
            const air = AIR;
            const lift = AIR * 0.6; // a little air above her head too
            const H = layer.clientHeight;
            const fits = (s: number, k: number) => {
              // each word (scaled k from its outer bottom corner) as heights above her feet + its inner edge
              const words = [
                { b: H - first.offsetTop - first.offsetHeight, edge: first.offsetLeft + first.offsetWidth * k, side: -1, el: first },
                { b: H - last.offsetTop - last.offsetHeight, edge: last.offsetLeft + last.offsetWidth * (1 - k), side: 1, el: last },
              ];
              return ROWS.every((row, r) => {
                if (!row) return true;
                const lo = fh * s * (1 - (r + 1) / ROWS.length);
                const hi = fh * s * (1 - r / ROWS.length) + lift;
                return words.every(({ b, edge, side, el }) => {
                  if (hi < b || lo > b + el.offsetHeight * k) return true; // not at this word's height
                  return side < 0 ? mid - (0.5 - row[0]) * fw * s >= edge + air : mid + (row[1] - 0.5) * fw * s <= edge - air;
                });
              });
            };
            for (let s = base; s >= MIN_HER; s -= 0.005) if (fits(s, 1)) return { her: s, words: 1 };
            for (let k = 1; k > 0.55; k -= 0.01) if (fits(MIN_HER, k)) return { her: MIN_HER, words: k };
            return { her: MIN_HER, words: 0.55 };
          };
          gsap.set(q('.h-word--first'), { transformOrigin: '0% 100%' });
          gsap.set(q('.h-word--last'), { transformOrigin: '100% 100%' });
          /** In a chapter: beside the card (dir −1 she's left of it, +1 right), never under it, on screen. */
          const chapterPose = (dir: -1 | 1) => {
            const w = window.innerWidth;
            const fw = frameW();
            const card = q(dir > 0 ? '[data-panel="index"]' : '[data-panel="work"]')[0] as HTMLElement | undefined;
            if (!card || !fw) return { x: dir * w * 0.22, scale: 0.9 };
            const gap = AIR + 8;
            const edge = dir > 0 ? card.offsetLeft + card.offsetWidth + gap : card.offsetLeft - gap;
            const room = dir > 0 ? w - 6 - edge : edge - 6;
            const scale = Math.max(0.6, Math.min(0.9, room / ((A + B) * fw)));
            const cx = dir > 0 ? edge + A * fw * scale : edge - B * fw * scale;
            return { x: cx - w / 2, scale };
          };
          const starts = full ? CHAPTERS.map((ch) => ch.start) : OPENING_STARTS;

          gsap.set(q('.h-word--hook .ch, .h-word--story .ch'), { yPercent: 125 });
          gsap.set(q('.cap'), { clipPath: 'inset(0% 100% 0% 0%)' });
          gsap.set(q('.metric-pill'), { clipPath: 'inset(0% 0% 100% 0%)' });
          // transparent but drawn: the browser prepares each chapter ahead of time (no hitch on arrival)
          gsap.set(q('[data-panel]'), { opacity: 0 });

          const tl = gsap.timeline({
            paused: true,
            defaults: { ease: 'none' },
            // which chapter is on screen (for the counter top right and which videos play)
            onUpdate: () => {
              const t = tl.time();
              let i = 0;
              for (let k = 0; k < starts.length; k++) if (t >= starts[k] - 0.001) i = k;
              setChapter(i);
            },
          });
          // pins the scene and reports where the scroll is; the loop above glides the timeline there
          const st = ScrollTrigger.create({
            trigger: root.current,
            start: 'top top',
            end: full ? `+=${TOTAL * 100}%` : desktop ? `+=${OPENING * 100}%` : '+=260%',
            pin: true,
            anticipatePin: 1,
            onUpdate: (self) => {
              if (scene) scene.target = self.progress * tl.duration();
            },
            // sizes changed: re-measure everything that depends on the screen size
            onRefresh: (self) => {
              const t = tl.time();
              tl.progress(0).invalidate().time(t);
              if (scene) scene.target = self.progress * tl.duration();
            },
          });

          // ---------------- the opening (0 → 6 screens on desktop) ----------------
          const her = [model.current, glow.current];
          tl.to(state, { target: LASTF, duration: at(1) }, 0)
            .to(q('.progress-bar'), { scaleX: 1, duration: total }, 0)
            .fromTo(q('.backdrop-media'), { scale: 1.14, yPercent: 2 }, { scale: full ? 1.06 : 1, yPercent: 0, duration: at(1), ease: 'power1.out' }, 0)
            .to(q('.seal svg'), { rotate: 540, duration: at(1) }, 0)
            .to(q('.scroll-cue'), { autoAlpha: 0, duration: at(0.03) }, at(0.02))
            .to(q('.seal'), { autoAlpha: 0, duration: at(0.04) }, at(0.08));

          // the name splits off sideways, each word at its own speed
          tl.to(q('.h-word--first'), { x: vw(-0.8), duration: at(0.2), ease: 'power2.in' }, at(0.06))
            .to(q('.h-word--last'), { x: vw(0.9), duration: at(0.24), ease: 'power2.in' }, at(0.07));

          // her path: left, right, back to center (the shadow pool behind her follows)
          const upScale = desktop ? 1.05 : 1.02;
          tl.to(her, { x: side(-1, mx, upScale), scale: upScale, duration: at(0.16), ease: 'power2.inOut' }, at(0.14))
            .to(her, { x: side(1, mx * 0.9, 1), scale: 1, duration: at(0.16), ease: 'power2.inOut' }, at(0.44))
            .to(her, { x: 0, scale: () => resultFit().her, duration: at(0.14), ease: 'power2.inOut' }, at(0.74));

          // the little corner notes step aside while she walks over to their side (and come back
          // only once she has walked past them)
          tl.to(q('.h-corner--bl'), { autoAlpha: 0, duration: at(0.04) }, at(0.14))
            .to(q('.h-corner--bl'), { autoAlpha: 1, duration: at(0.04) }, at(0.52))
            .to(q('.h-corner--tr, .h-corner--br'), { autoAlpha: 0, duration: at(0.04) }, at(0.44))
            .to(q('.h-corner--tr, .h-corner--br'), { autoAlpha: 1, duration: at(0.04) }, at(0.82)); // once she's walked back toward the centre

          // 01 the hook
          tl.to(q('.h-word--hook .ch'), { yPercent: 0, stagger: at(0.012), duration: at(0.08), ease: 'power3.out' }, at(0.25)) // once she's walked past it
            .to(q('.cap--hook'), { clipPath: 'inset(0% 0% 0% 0%)', duration: at(0.06), ease: 'power2.out' }, at(0.25))
            .to(q('.h-word--hook .ch'), { yPercent: -135, stagger: at(0.01), duration: at(0.06), ease: 'power2.in' }, at(0.39))
            .to(q('.cap--hook'), { clipPath: 'inset(0% 0% 0% 100%)', duration: at(0.05) }, at(0.39));

          // 02 the story
          tl.to(q('.h-word--story .ch'), { yPercent: 0, stagger: at(0.012), duration: at(0.08), ease: 'power3.out' }, at(0.49))
            .to(q('.cap--story'), { clipPath: 'inset(0% 0% 0% 0%)', duration: at(0.06), ease: 'power2.out' }, at(0.55))
            .to(q('.h-word--story .ch'), { yPercent: -135, stagger: at(0.01), duration: at(0.06), ease: 'power2.in' }, at(0.68))
            .to(q('.cap--story'), { clipPath: 'inset(0% 0% 0% 100%)', duration: at(0.05) }, at(0.68));

          // 03 the result
          tl.to(q('.h-word--first'), { x: 0, scale: () => resultFit().words, duration: at(0.14), ease: 'power3.out' }, at(0.76))
            .to(q('.h-word--last'), { x: 0, scale: () => resultFit().words, duration: at(0.15), ease: 'power3.out' }, at(0.77))
            .to(q('.cap--result'), { clipPath: 'inset(0% 0% 0% 0%)', duration: at(0.06), ease: 'power2.out' }, at(0.83))
            .to(q('.metric-pill'), { clipPath: 'inset(0% 0% 0% 0%)', stagger: at(0.03), duration: at(0.05), ease: 'power2.out' }, at(0.84))
            .fromTo(q('.metric-pill--a'), { y: 70 }, { y: -30, duration: at(0.16) }, at(0.84))
            .fromTo(q('.metric-pill--b'), { y: 110 }, { y: -10, duration: at(0.16) }, at(0.84));

          const start = () => {
            const t = st.progress * tl.duration();
            scene = { tl, st, target: t, time: t, vel: 0, rush: null };
            tl.time(t);
          };
          if (!full) {
            start();
            return () => {
              scene = null;
              st.kill();
            };
          }

          // ---------------- the chapters (6 → 13.8 screens) ----------------
          /**
           * Between chapters the camera pans: she ends up on one side of the frame, and the meadow
           * moves the same way but less (parallax), so it reads as the camera moving past her, not
           * as her sliding over the grass. A gentle dip in depth on the way keeps it from feeling
           * like a rail. Her video plays on with the scroll the whole time.
           */
          const walk = (dir: -1 | 1, start: number) => {
            tl.to(her, { x: () => chapterPose(dir).x, duration: 0.8, ease: 'sine.inOut' }, start)
              .to(her, { scale: () => chapterPose(dir).scale - 0.03, y: () => -window.innerHeight * 0.012, duration: 0.4, ease: 'sine.inOut' }, start)
              .to(her, { scale: () => chapterPose(dir).scale, y: 0, duration: 0.4, ease: 'sine.inOut' }, start + 0.4)
              .to(q('.backdrop-media'), { xPercent: dir * 1.4, duration: 0.8, ease: 'sine.inOut' }, start);
          };
          const panel = (id: string) => q(`[data-panel="${id}"]`);
          const panelIn = (id: string, from: -1 | 1, start: number) => {
            tl.fromTo(panel(id), { opacity: 0, x: from * 60 }, { opacity: 1, x: 0, duration: 0.25, ease: 'power3.out', immediateRender: false }, start).fromTo(
              q(`[data-panel="${id}"] > *`),
              { y: 26, opacity: 0 },
              { y: 0, opacity: 1, stagger: 0.035, duration: 0.2, ease: 'power2.out' },
              start + 0.05,
            );
          };
          const panelOut = (id: string, to: -1 | 1, start: number) =>
            tl.to(panel(id), { opacity: 0, x: to * 40, duration: 0.2, ease: 'power2.in' }, start);

          // leave the result: notes, numbers and tags go, the name slides away
          tl.to(q('.cap--result'), { clipPath: 'inset(0% 0% 0% 100%)', duration: 0.15 }, 6.0)
            .to(q('.metric-pill'), { clipPath: 'inset(100% 0% 0% 0%)', stagger: 0.04, duration: 0.15 }, 6.0)
            .to(q('.h-corner--bl, .h-corner--br'), { autoAlpha: 0, duration: 0.15 }, 6.0)
            .to(q('.h-word--first'), { x: vw(-0.8), duration: 0.3, ease: 'power2.in' }, 6.02)
            .to(q('.h-word--last'), { x: vw(0.9), duration: 0.32, ease: 'power2.in' }, 6.04);

          // 04 the work — she walks left, polaroids are dealt on the right
          walk(-1, 6.05);
          panelIn('work', 1, 6.6);
          tl.fromTo(
            q('.fan-item .polaroid'), // (the card inside, so each slot keeps its tilt and hover lift)
            { x: 220, y: 60, rotation: 12, opacity: 0 },
            { x: 0, y: 0, rotation: 0, opacity: 1, stagger: 0.09, duration: 0.3, ease: 'power3.out', immediateRender: false },
            6.75,
          );
          panelOut('work', 1, 7.6);

          // 05 index — she walks right, the categories open on the left
          walk(1, 7.75);
          panelIn('index', -1, 8.3);
          panelOut('index', -1, 9.2);

          // 06 meet Sinai — the camera pans, her letter appears beside her
          walk(-1, 9.35);
          panelIn('about', 1, 9.9);
          panelOut('about', 1, 11.0);

          // 07 proof — she walks right, the numbers count up as you scroll
          walk(1, 11.15);
          panelIn('proof', -1, 11.7);
          const counter = { v: 0 };
          const nums = q('.panel--proof [data-count]') as HTMLElement[];
          const paint = () =>
            nums.forEach((el) => {
              const target = Number(el.dataset.count);
              el.textContent = countText(target * counter.v, target) + (el.dataset.suffix ?? '');
            });
          paint();
          // the tickets are dealt onto the table, then the numbers on them count up
          tl.fromTo(
            q('.ticket'),
            { y: 40, opacity: 0, rotation: -6 },
            { y: 0, opacity: 1, rotation: 0, stagger: 0.06, duration: 0.2, ease: 'power3.out', immediateRender: false },
            11.75,
          )
            .to(counter, { v: 1, duration: 0.45, ease: 'power2.out', onUpdate: paint }, 11.85)
            .fromTo(
              q('.lug-tag'),
              { y: -14, opacity: 0, rotation: 6 },
              { y: 0, opacity: 1, rotation: 0, stagger: 0.025, duration: 0.15, ease: 'back.out(2)', immediateRender: false },
              11.95,
            );
          panelOut('proof', -1, 12.5);

          // 08 write back — she walks left, the brief form waits on the right
          walk(-1, 12.65);
          panelIn('brief', 1, 13.2);
          // her video continues through the chapters, one strip picture per step of scroll
          tl.to(state, { target: END, duration: TOTAL - OPENING }, OPENING);
          tl.set({}, {}, TOTAL);
          start();

          // the header's "Send a brief" glides here
          setBriefTarget(() => {
            if (scene) scene.rush = 13.6;
            window.scrollTo({ top: st.start + (st.end - st.start) * (13.6 / TOTAL), behavior: 'smooth' });
          });
          return () => {
            setBriefTarget(null);
            scene = null;
            st.kill();
          };
        },
      );
    }, root);

    return () => {
      cancelAnimationFrame(raf);
      for (const ev of ['wheel', 'touchstart', 'keydown'] as const) window.removeEventListener(ev, onManual);
      ctx.revert();
      seq.cancel();
      ro.disconnect();
    };
  }, [immersive]);

  const views = metrics[0];
  const second = metrics[2] ?? metrics[1];
  const chapter = CHAPTERS[Math.min(active, chapterCount - 1)];

  return (
    <section ref={root} className="hero" aria-labelledby="hero-title">
      <h1 id="hero-title" className="visually-hidden">
        {profile.name} — {profile.role}
      </h1>


      <Backdrop />
      <div className="sunlight" aria-hidden="true">
        <span className="beam beam--1" />
        <span className="beam beam--2" />
        <span className="beam beam--3" />
      </div>
      <div className="h-glow" ref={glow} aria-hidden="true" />

      <div className="h-words" aria-hidden="true">
        <span className="h-word h-word--first display">
          <span className="tall">{FIRST}</span>
        </span>
        <span className="h-word h-word--last display">
          <span className="tall">
            <em>{LAST}</em>
          </span>
        </span>
        <span className="h-word h-word--hook display">
          <span className="tall">
            <em>
              <Split text="Hook" />
            </em>
          </span>
        </span>
        <span className="h-word h-word--story display">
          <span className="tall">
            <em>
              <Split text="Story" />
            </em>
          </span>
        </span>
      </div>

      <div className="h-model" ref={model}>
        <canvas
          ref={canvas}
          role="img"
          aria-label={`${FIRST} in a denim jacket and pink top. As you scroll she lets go of the jacket, turns, walks and strikes a pose.`}
        />
      </div>

      <div className="h-ui">
        <p className="h-corner h-corner--tl label">
          Portfolio — {new Date().getFullYear()}
          <br />
          <span className="muted">Now booking brand work</span>
        </p>
        <div className="h-corner h-corner--tr label">
          <p aria-live="polite">
            <span className="ch-num">{pad(active + 1)}</span> / {pad(chapterCount)} · <em className="ch-name">{chapter.name}</em>
          </p>
          <div className="progress" aria-hidden="true">
            <div className="progress-track">
              <div className="progress-bar" />
            </div>
          </div>
          <p ref={loader} className="loader" aria-live="off">
            Loading frames 0%
          </p>
        </div>
        <p className="h-corner h-corner--bl label">{profile.tagline}</p>
        <p className="h-corner h-corner--br label">
          {videos.length} videos · {categories.length} categories
          <br />
          <span className="scroll-cue">Scroll to play ↓</span>
        </p>

        <div className="cap cap--hook">
          <p className="label">01 — The hook</p>
          <p>The first second decides if they stay. Every video opens with a reason to keep watching.</p>
        </div>
        <div className="cap cap--story">
          <p className="label">02 — The story</p>
          <p>Products shown in real life, the way a friend would recommend them. Never like an ad.</p>
        </div>
        <div className="cap cap--result">
          <p className="label">03 — The result</p>
          <p>Brand videos people actually finish, save and share.</p>
        </div>

        {views && (
          <div className="metric-pill metric-pill--a">
            <span className="label">{views.label}</span>
            <span className="display">{formatMetric(views)}</span>
          </div>
        )}
        {second && (
          <div className="metric-pill metric-pill--b">
            <span className="label">{second.label}</span>
            <span className="display">{formatMetric(second)}</span>
          </div>
        )}

        <div className="seal" aria-hidden="true">
          <svg viewBox="0 0 100 100">
            <defs>
              <path id="seal-path" d="M50 10 a40 40 0 1 1 -0.1 0" />
            </defs>
            <text fill="currentColor" fontFamily="Fraunces, Georgia, serif" fontSize="8.6" fontStyle="italic" textLength="248" lengthAdjust="spacing">
              <textPath href="#seal-path" textLength="248" lengthAdjust="spacing">
                SCROLL TO PLAY · LOOK 01 · SCROLL TO PLAY ·
              </textPath>
            </text>
            <path d="M50 42 v16 M42 50 h16" stroke="currentColor" strokeWidth="1" />
          </svg>
        </div>
      </div>

      {immersive && (
        <div className="chapters">
          <WorkPanel active={chapter.id === 'work'} stacked={false} />
          <IndexPanel active={chapter.id === 'index'} stacked={false} />
          <AboutPanel active={chapter.id === 'about'} stacked={false} />
          <ProofPanel active={chapter.id === 'proof'} stacked={false} />
          <BriefPanel active={chapter.id === 'brief'} stacked={false} />
        </div>
      )}

      <Petals />
    </section>
  );
}
