/**
 * A video's details, opened in place over the scene (no page change): the video with sound,
 * its specs and the brief, and the other videos in the same category.
 * Esc, the × button or a click outside closes it; focus returns to what opened it.
 * While it's open the page doesn't scroll, so the scene underneath stays put.
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  FORMAT_LABELS,
  PLATFORM_LABELS,
  categoryTitle,
  formatCompact,
  formatDuration,
  videosByCategory,
  type Video,
} from '../content';
import { PanelVideo } from './PanelVideo';

const DrawerContext = createContext<(v: Video) => void>(() => {});
export const useOpenVideo = () => useContext(DrawerContext);

export function DrawerProvider({ children }: { children: ReactNode }) {
  const [video, setVideo] = useState<Video | null>(null);
  const opener = useRef<HTMLElement | null>(null);

  const open = useCallback((v: Video) => {
    opener.current = document.activeElement as HTMLElement | null;
    setVideo(v);
  }, []);

  const close = useCallback(() => {
    setVideo(null);
    opener.current?.focus?.({ preventScroll: true });
  }, []);

  return (
    <DrawerContext.Provider value={open}>
      {children}
      {video && <Drawer video={video} onClose={close} onPick={setVideo} />}
    </DrawerContext.Provider>
  );
}

function Drawer({ video: v, onClose, onPick }: { video: Video; onClose: () => void; onPick: (v: Video) => void }) {
  const closeBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeBtn.current?.focus({ preventScroll: true });
    const html = document.documentElement;
    const prevOverflow = html.style.overflow;
    html.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      html.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const siblings = videosByCategory.get(v.category) ?? [];
  const specs = [
    ['Brand', v.brand],
    ['Category', categoryTitle(v.category)],
    ['Format', FORMAT_LABELS[v.format] ?? v.format],
    ['Platform', PLATFORM_LABELS[v.platform] ?? v.platform],
    ['Length', v.duration ? formatDuration(v.duration) : undefined],
    ['Views', v.results.views !== undefined ? formatCompact(v.results.views) : undefined],
    ['Likes', v.results.likes !== undefined ? formatCompact(v.results.likes) : undefined],
    ['Shares', v.results.shares !== undefined ? formatCompact(v.results.shares) : undefined],
    ['Saves', v.results.saves !== undefined ? formatCompact(v.results.saves) : undefined],
  ].filter(([, value]) => value);

  return (
    <div className="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title" onClick={onClose}>
      <div className="drawer-card" onClick={(e) => e.stopPropagation()}>
        <button ref={closeBtn} type="button" className="drawer-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <div className="drawer-media">
          <PanelVideo key={v.id} src={v.src} title={`${v.title}, for ${v.brand}`} playing controls />
        </div>
        <div className="drawer-info">
          <p className="label muted">
            {categoryTitle(v.category)} · {v.brand}
          </p>
          <h2 id="drawer-title" className="display drawer-title">
            <em>{v.title}</em>
          </h2>
          <dl className="spec label">
            {specs.map(([k, value]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <div className="drawer-brief">
            <p className="label muted">The brief</p>
            <p>{v.brief}</p>
          </div>
          {siblings.length > 1 && (
            <div className="drawer-more">
              <p className="label muted">More {categoryTitle(v.category).toLowerCase()}</p>
              <ul>
                {siblings.map((s) => (
                  <li key={s.id}>
                    <button type="button" className="drawer-pick" aria-current={s.id === v.id ? 'true' : undefined} onClick={() => onPick(s)}>
                      <em>{s.title}</em>
                      <span className="label muted">{s.results.views ? `${formatCompact(s.results.views)} views` : s.brand}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
