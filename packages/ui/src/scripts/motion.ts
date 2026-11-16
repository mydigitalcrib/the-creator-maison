/**
 * Reduced-motion helpers. Every animation on every site checks these first.
 */
const query =
  typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

/** True when the visitor has asked their device for less motion. */
export const prefersReducedMotion = (): boolean => query?.matches ?? false;

/** Runs `callback` whenever the visitor changes their reduced-motion setting. */
export const onReducedMotionChange = (callback: (reduce: boolean) => void): (() => void) => {
  if (!query) return () => {};
  const handler = (event: MediaQueryListEvent) => callback(event.matches);
  query.addEventListener('change', handler);
  return () => query.removeEventListener('change', handler);
};
