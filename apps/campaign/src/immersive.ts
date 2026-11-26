import { useEffect, useState } from 'react';

/**
 * The immersive version (every chapter inside the pinned scene) needs a desktop-size screen and motion.
 * Otherwise the chapters are stacked under the scene.
 */
export const IMMERSIVE_QUERY = '(min-width: 768px) and (prefers-reduced-motion: no-preference)';

export function useImmersive() {
  const [immersive, setImmersive] = useState(() => window.matchMedia(IMMERSIVE_QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia(IMMERSIVE_QUERY);
    const onChange = () => setImmersive(mq.matches);
    mq.addEventListener('change', onChange);
    // the window may have been resized between the first render and now (e.g. a panel opening):
    // check again, or the page could get stuck in the stacked small-screen layout
    onChange();
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return immersive;
}

/** "Send a brief" takes you to the last chapter, on this same page. The scene registers how to get there. */
let briefTarget: (() => void) | null = null;
export const setBriefTarget = (fn: (() => void) | null) => {
  briefTarget = fn;
};
export const goToBrief = () => {
  if (briefTarget) briefTarget();
  else document.getElementById('brief')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};
