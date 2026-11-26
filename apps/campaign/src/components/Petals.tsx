/**
 * Cherry-blossom petals drifting across the scene (they match the blossoms in the background video).
 * Each petal falls and sways on its own CSS animation; scrolling adds a gust that pushes them sideways
 * and spins them, so the air seems to move with the scroll. Off with reduced motion.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useLayoutEffect, useRef, type CSSProperties } from 'react';

const COUNT = 22;

// stable pseudo-random values, so the layout is the same on every load
const rand = (i: number, salt: number) => {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

const PETALS = Array.from({ length: COUNT }, (_, i) => ({
  left: rand(i, 1) * 100,
  size: 10 + rand(i, 2) * 14,
  fall: 11 + rand(i, 3) * 12,
  delay: -rand(i, 4) * 23,
  sway: 30 + rand(i, 5) * 60,
  depth: 0.4 + rand(i, 6) * 0.6,
  tint: rand(i, 7) > 0.5 ? 'var(--rosy)' : '#f2c9c2',
}));

/** Specks of light drifting up slowly, like dust in afternoon sun. */
const MOTES = Array.from({ length: 16 }, (_, i) => ({
  left: rand(i, 11) * 100,
  top: 20 + rand(i, 12) * 75,
  size: 2 + rand(i, 13) * 4,
  rise: 9 + rand(i, 14) * 10,
  delay: -rand(i, 15) * 18,
}));

export function Petals() {
  const root = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const gust = gsap.quickTo(root.current, '--gust', { duration: 0.9, ease: 'power3.out' });
        const st = ScrollTrigger.create({
          start: 0,
          end: 'max',
          onUpdate: (self) => gust(gsap.utils.clamp(-1, 1, self.getVelocity() / 2500)),
        });
        // let the air settle when scrolling stops
        const settle = () => gust(0);
        ScrollTrigger.addEventListener('scrollEnd', settle);
        return () => {
          st.kill();
          ScrollTrigger.removeEventListener('scrollEnd', settle);
        };
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <div className="petals" ref={root} aria-hidden="true">
      {MOTES.map((m, i) => (
        <span
          key={`m${i}`}
          className="mote"
          style={
            {
              '--left': `${m.left}%`,
              '--top': `${m.top}%`,
              '--size': `${m.size}px`,
              '--rise': `${m.rise}s`,
              '--delay': `${m.delay}s`,
            } as CSSProperties
          }
        />
      ))}
      {PETALS.map((p, i) => (
        <span
          key={i}
          className="petal"
          style={
            {
              '--left': `${p.left}%`,
              '--size': `${p.size}px`,
              '--fall': `${p.fall}s`,
              '--delay': `${p.delay}s`,
              '--sway': `${p.sway}px`,
              '--depth': p.depth,
              '--tint': p.tint,
            } as CSSProperties
          }
        >
          <span className="petal-sway">
            <svg viewBox="0 0 20 24" className="petal-shape">
              <path d="M10 1 C 16 5, 19 12, 15 19 C 13 22.5, 11 23, 10 21.5 C 9 23, 7 22.5, 5 19 C 1 12, 4 5, 10 1 Z" />
            </svg>
          </span>
        </span>
      ))}
    </div>
  );
}
