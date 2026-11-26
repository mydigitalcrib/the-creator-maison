/**
 * A muted looping video that plays only while `playing` is true (never with reduced motion),
 * with optional Play/Pause and Sound buttons. Turning sound on mutes every other video.
 */
import { useEffect, useRef, useState } from 'react';
import { clipPoster, clipUrl } from '../content';

const SOUND_EVENT = 'campaign:sound';
const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

interface Props {
  src?: string;
  title: string;
  playing: boolean;
  controls?: boolean;
}

export function PanelVideo({ src, title, playing, controls = false }: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  const userPaused = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [inView, setInView] = useState(false);

  // only play while it's actually on screen
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.3 });
    io.observe(v);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (playing && inView && !userPaused.current && !reduceMotion()) v.play().catch(() => {});
    else v.pause();
  }, [playing, inView]);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onSound = (e: Event) => {
      if ((e as CustomEvent).detail !== v) {
        v.muted = true;
        setMuted(true);
      }
    };
    v.addEventListener('play', onPlay);
    v.addEventListener('pause', onPause);
    window.addEventListener(SOUND_EVENT, onSound);
    return () => {
      v.removeEventListener('play', onPlay);
      v.removeEventListener('pause', onPause);
      window.removeEventListener(SOUND_EVENT, onSound);
    };
  }, []);

  if (!src) {
    return (
      <div className="pv-empty label" role="img" aria-label={`${title}: video coming soon`}>
        Video coming soon
      </div>
    );
  }

  const togglePlay = () => {
    const v = ref.current!;
    if (v.paused) {
      userPaused.current = false;
      v.play().catch(() => {});
    } else {
      userPaused.current = true;
      v.pause();
    }
  };

  const toggleSound = () => {
    const v = ref.current!;
    v.muted = !v.muted;
    setMuted(v.muted);
    if (!v.muted) {
      window.dispatchEvent(new CustomEvent(SOUND_EVENT, { detail: v }));
      if (v.paused) {
        userPaused.current = false;
        v.play().catch(() => {});
      }
    }
  };

  return (
    <>
      <video ref={ref} className="pv" muted loop playsInline preload="metadata" poster={clipPoster(src)} aria-label={title}>
        <source src={clipUrl(src)} type="video/mp4" />
      </video>
      {controls && (
        <div className="pv-controls">
          <button type="button" className="pv-btn label" onClick={togglePlay} aria-label={`${isPlaying ? 'Pause' : 'Play'} ${title}`}>
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          <button type="button" className="pv-btn label" onClick={toggleSound} aria-pressed={!muted} aria-label={`Sound for ${title}`}>
            Sound {muted ? 'off' : 'on'}
          </button>
        </div>
      )}
    </>
  );
}
