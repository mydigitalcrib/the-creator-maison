/**
 * The chapters after the opening, as objects you'd find at a little countryside train station.
 * On desktop they appear in place inside the pinned scene, on the side opposite the model
 * (HeroSequence animates them). With reduced motion or on small screens they're stacked under it.
 *
 *   04 Three little films — polaroids taped up; tap one to open its story
 *   05 The timetable      — a painted station board: six stops (categories), open one for its films
 *   06 A letter           — bio and details, on letter paper with a pressed sprig
 *   07 The journey so far — numbers on train tickets (counted up by the scroll), brands on luggage tags
 *   08 Send me a postcard — the brief form as a postcard (opens the visitor's email app, no backend)
 */
import { gsap } from 'gsap';
import { createPortal } from 'react-dom';
import { memo, useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import {
  FORMAT_LABELS,
  PLATFORM_LABELS,
  anyPlaceholder,
  asset,
  categories,
  categoryTitle,
  clients,
  clipUrl,
  featuredVideos,
  formatCompact,
  formatMetric,
  metrics,
  previewFor,
  profile,
  videos,
  videosByCategory,
} from '../content';
import { FRAME_COUNT } from '../frames';
import { PanelVideo } from './PanelVideo';
import { useOpenVideo } from './VideoDrawer';

interface PanelProps {
  active: boolean;
  stacked: boolean;
}

const FIRST = profile.name.split(' ')[0];

/** A little ink sprig (decorative). */
export function Sprig({ className }: { className?: string }) {
  return (
    <svg className={`sprig ${className ?? ''}`} viewBox="0 0 120 60" aria-hidden="true" focusable="false">
      <path d="M4 52 C 30 44, 60 34, 116 8" />
      <path d="M26 45 C 22 36, 26 28, 34 24 C 36 33, 33 40, 26 45 Z" />
      <path d="M46 38 C 46 28, 52 22, 60 20 C 59 29, 54 35, 46 38 Z" />
      <path d="M66 30 C 68 20, 75 15, 83 14 C 80 23, 74 28, 66 30 Z" />
      <path d="M38 41 C 44 48, 52 50, 60 47 C 54 41, 46 39, 38 41 Z" />
      <path d="M60 33 C 67 39, 76 40, 83 36 C 77 31, 68 30, 60 33 Z" />
      <path d="M84 22 C 91 26, 99 26, 105 21 C 99 17, 91 18, 84 22 Z" />
    </svg>
  );
}

/* ------------------------------------------------------------------ 04 */
export const WorkPanel = memo(function WorkPanel({ active, stacked }: PanelProps) {
  const open = useOpenVideo();
  return (
    <section className={`panel panel--right panel--work ${active || stacked ? 'is-on' : ''}`} data-panel="work" aria-labelledby="ch-work" inert={!(active || stacked)}>
      <header className="paper-tag ch-head">
        <p className="ch-kicker">Chapter four</p>
        <h2 id="ch-work" className="ch-title">
          Three little <em>films</em>
        </h2>
      </header>
      <ul className="fan">
        {featuredVideos.map((v, i) => (
          <li key={v.id} className="fan-item" style={{ '--i': i } as CSSProperties}>
            <button type="button" className="polaroid" onClick={() => open(v)} aria-label={`${v.title}, for ${v.brand}: open its story`}>
              <span className="polaroid-media">
                <PanelVideo src={v.src} title={`${v.title}, for ${v.brand}`} playing={active || stacked} />
              </span>
              <span className="polaroid-caption">
                <em>{v.title}</em>
                <span className="polaroid-sub">
                  for {v.brand}
                  {v.results.views ? ` · ${formatCompact(v.results.views)} views` : ''}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <p className="scrap panel-hint">tap a photo to read its story ↗</p>
    </section>
  );
});

/* ------------------------------------------------------------------ 05 */
export const IndexPanel = memo(function IndexPanel({ active, stacked }: PanelProps) {
  const open = useOpenVideo();
  const [openId, setOpenId] = useState<string | null>(null);
  const preview = useRef<HTMLDivElement>(null);

  // hovering a stop plays one of its films next to the cursor (mouse only, motion allowed)
  useEffect(() => {
    const box = preview.current;
    if (!box || !(active || stacked)) return;
    const mm = gsap.matchMedia();
    mm.add('(pointer: fine) and (prefers-reduced-motion: no-preference)', () => {
      const video = box.querySelector('video')!;
      const xTo = gsap.quickTo(box, 'x', { duration: 0.45, ease: 'power3.out' });
      const yTo = gsap.quickTo(box, 'y', { duration: 0.45, ease: 'power3.out' });
      const rows = Array.from(document.querySelectorAll<HTMLElement>('.panel--index .ix-row'));
      const offs = rows.map((row) => {
        const enter = (e: PointerEvent) => {
          const src = row.dataset.preview;
          if (!src) return;
          if (video.getAttribute('src') !== clipUrl(src)) video.setAttribute('src', clipUrl(src));
          video.play().catch(() => {});
          gsap.set(box, { x: e.clientX + 26, y: e.clientY - box.offsetHeight / 2 });
          box.classList.add('is-on');
        };
        const move = (e: PointerEvent) => {
          xTo(e.clientX + 26);
          yTo(e.clientY - box.offsetHeight / 2);
        };
        const leave = () => {
          box.classList.remove('is-on');
          video.pause();
        };
        // once the panel goes, unload the film too (nothing keeps playing or lingering off screen)
        const unload = () => {
          leave();
          video.removeAttribute('src');
          video.load();
        };
        row.addEventListener('pointerenter', enter);
        row.addEventListener('pointermove', move);
        row.addEventListener('pointerleave', leave);
        return () => {
          row.removeEventListener('pointerenter', enter);
          row.removeEventListener('pointermove', move);
          row.removeEventListener('pointerleave', leave);
          unload();
        };
      });
      return () => offs.forEach((off) => off());
    });
    return () => mm.revert();
  }, [active, stacked]);

  return (
    <section className={`panel panel--left panel--index ${active || stacked ? 'is-on' : ''}`} data-panel="index" aria-labelledby="ch-index" inert={!(active || stacked)}>
      <div className="board">
        <span className="board-rivet board-rivet--tl" aria-hidden="true" />
        <span className="board-rivet board-rivet--tr" aria-hidden="true" />
        <span className="board-rivet board-rivet--bl" aria-hidden="true" />
        <span className="board-rivet board-rivet--br" aria-hidden="true" />
        <header className="ch-head board-head">
          <p className="ch-kicker">
            Chapter five · {categories.length} stops · {videos.length} films
          </p>
          <h2 id="ch-index" className="ch-title">
            The <em>timetable</em>
          </h2>
        </header>
        <ol className="ix">
          {categories.map((c, i) => {
            const list = videosByCategory.get(c.id) ?? [];
            const isOpen = openId === c.id;
            return (
              <li key={c.id} className={`ix-item ${isOpen ? 'is-open' : ''}`}>
                <h3>
                  <button
                    type="button"
                    className="ix-row"
                    aria-expanded={isOpen}
                    aria-controls={`ix-${c.id}`}
                    data-preview={previewFor(c.id, i)}
                    onClick={() => setOpenId(isOpen ? null : c.id)}
                  >
                    <span className="ix-stop">{i + 1}</span>
                    <span className="ix-name">{c.title}</span>
                    <span className="ix-dots" aria-hidden="true" />
                    <span className="ix-count">{list.length} films</span>
                  </button>
                </h3>
                <div className="ix-panel" id={`ix-${c.id}`} inert={!isOpen}>
                  <div className="ix-panel-inner">
                    <p className="ix-blurb">{c.blurb}</p>
                    <ul className="ix-videos">
                      {list.map((v) => (
                        <li key={v.id}>
                          <button type="button" className="ix-video" onClick={() => open(v)}>
                            <em>{v.title}</em>
                            <span className="ix-meta">
                              {v.brand} · {FORMAT_LABELS[v.format] ?? v.format}
                            </span>
                            <span className="ix-views">{v.results.views ? formatCompact(v.results.views) : ''}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
        <p className="board-foot">open a stop to see its films · tap a film for its story</p>
      </div>
      {/* rendered at the page level, so it can follow the cursor anywhere */}
      {createPortal(
        <div className="cursor-preview" ref={preview} aria-hidden="true">
          <video muted loop playsInline preload="none" />
        </div>,
        document.body,
      )}
    </section>
  );
});

/* ------------------------------------------------------------------ 06 */
const FORMATS = [...new Set(videos.map((v) => FORMAT_LABELS[v.format] ?? v.format))].join(', ');
const PLATFORMS = [...new Set(videos.map((v) => PLATFORM_LABELS[v.platform] ?? v.platform))].join(', ');

export const AboutPanel = memo(function AboutPanel({ active, stacked }: PanelProps) {
  return (
    <section className={`panel panel--right panel--about paper ${active || stacked ? 'is-on' : ''}`} data-panel="about" aria-labelledby="ch-about" inert={!(active || stacked)}>
      <Sprig className="sprig--corner" />
      <header className="ch-head">
        <p className="ch-kicker">Chapter six · a letter</p>
        <h2 id="ch-about" className="ch-title">
          Meet <em>{FIRST}</em>
        </h2>
      </header>
      <div className="letter">
        <p className="letter-hello">
          <em>Dear brand,</em>
        </p>
        {profile.bio.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
        <p className="letter-sign">
          <em>with love, {FIRST}</em>
        </p>
      </div>
      <dl className="notes">
        <div>
          <dt>From</dt>
          <dd>{profile.location}</dd>
        </div>
        <div>
          <dt>I make</dt>
          <dd>{profile.role}</dd>
        </div>
        <div>
          <dt>Formats</dt>
          <dd>{FORMATS}</dd>
        </div>
        <div>
          <dt>Find me on</dt>
          <dd>{PLATFORMS}</dd>
        </div>
      </dl>
    </section>
  );
});

/* ------------------------------------------------------------------ 07 */
export const ProofPanel = memo(function ProofPanel({ active, stacked }: PanelProps) {
  return (
    <section className={`panel panel--left panel--proof ${active || stacked ? 'is-on' : ''}`} data-panel="proof" aria-labelledby="ch-proof" inert={!(active || stacked)}>
      <header className="paper-tag ch-head">
        <p className="ch-kicker">Chapter seven</p>
        <h2 id="ch-proof" className="ch-title">
          The journey <em>so far</em>
        </h2>
      </header>
      <dl className="tickets">
        {metrics.map((m, i) => (
          <div key={m.id} className="ticket" style={{ '--tilt': `${[-2, 1.5, 1, -1.5][i % 4]}deg` } as CSSProperties}>
            <dt className="ticket-label">{m.label}</dt>
            <dd className="num" data-count={m.value} data-suffix={m.suffix ?? ''}>
              {formatMetric(m)}
            </dd>
            <dd className="ticket-no" aria-hidden="true">
              No. {String(i + 1).padStart(3, '0')}
            </dd>
          </div>
        ))}
      </dl>
      <div className="paper-tag tags-wrap">
        <h3 className="tags-title">Brands I&apos;ve travelled with</h3>
        <ul className="lug-tags">
          {clients.map((c) => (
            <li key={c.id} className="lug-tag">
              {c.name} <em>{categoryTitle(c.category)}</em>
            </li>
          ))}
        </ul>
        {anyPlaceholder && <p className="tags-note">placeholder names and numbers, real ones coming soon</p>}
      </div>
    </section>
  );
});

/* ------------------------------------------------------------------ 08 */
const DELIVERABLES = ['Short-form video', 'Long-form video', 'Photos', 'Usage rights / ads', 'Something else'];
const TIMELINES = ['As soon as possible', '2–4 weeks', '1–3 months', 'Flexible'];
const BUDGETS = ['Under $500', '$500 – $1,500', '$1,500 – $5,000', '$5,000+', 'Not sure yet'];

export const BriefPanel = memo(function BriefPanel({ active, stacked }: PanelProps) {
  const [status, setStatus] = useState('');

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const get = (k: string) => String(data.get(k) ?? '').trim();
    const wants = data.getAll('deliverables').map(String);
    const body = [
      `Name: ${get('name')}`,
      `Email: ${get('email')}`,
      `Brand: ${get('brand')}`,
      wants.length ? `Needs: ${wants.join(', ')}` : '',
      get('timeline') ? `Timeline: ${get('timeline')}` : '',
      get('budget') ? `Budget: ${get('budget')}` : '',
      '',
      get('message'),
    ]
      .filter((line, i, all) => line !== '' || all[i + 1] !== undefined)
      .join('\n');
    setStatus('Opening your email app with the brief filled in…');
    window.location.href = `mailto:${profile.email}?subject=${encodeURIComponent(`Brief from ${get('brand')}`)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <section id="brief" className={`panel panel--right panel--brief paper ${active || stacked ? 'is-on' : ''}`} data-panel="brief" aria-labelledby="ch-brief" inert={!(active || stacked)}>
      <header className="ch-head postcard-head">
        <p className="ch-kicker">Chapter eight</p>
        <h2 id="ch-brief" className="ch-title">
          Send me a <em>postcard</em>
        </h2>
      </header>
      <form className="postcard" onSubmit={onSubmit} noValidate aria-describedby="brief-note">
        <p id="brief-note" className="visually-hidden">
          Fields marked * are required.
        </p>
        <div className="postcard-msg">
          <label className="field field--msg">
            <span className="field-label">Tell me about the project *</span>
            <textarea name="message" rows={5} required />
          </label>
          <fieldset className="chips">
            <legend className="field-label">What do you need?</legend>
            {DELIVERABLES.map((d) => (
              <label key={d} className="chip">
                <input type="checkbox" name="deliverables" value={d} />
                {d}
              </label>
            ))}
          </fieldset>
        </div>
        <div className="postcard-addr">
          <div className="stamp" aria-hidden="true">
            <img src={asset(`frames/mobile/${String(FRAME_COUNT).padStart(4, '0')}.webp`)} alt="" width="400" height="480" loading="lazy" />
          </div>
          <span className="postmark" aria-hidden="true">
            <span>replies</span>
            <span>within a few days</span>
          </span>
          <label className="field">
            <span className="field-label">Your name *</span>
            <input name="name" autoComplete="name" required />
          </label>
          <label className="field">
            <span className="field-label">Email *</span>
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label className="field">
            <span className="field-label">Brand or company *</span>
            <input name="brand" autoComplete="organization" required />
          </label>
          <div className="field-pair">
            <label className="field">
              <span className="field-label">Timeline</span>
              <select name="timeline" defaultValue="">
                <option value="">Choose</option>
                {TIMELINES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">Budget</span>
              <select name="budget" defaultValue="">
                <option value="">Choose</option>
                {BUDGETS.map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </select>
            </label>
          </div>
        </div>
        <div className="postcard-foot">
          <button type="submit" className="submit">
            Send it off
          </button>
          <p className="brief-alt">
            or write to <a href={`mailto:${profile.email}`}>{profile.email}</a>
          </p>
          <p className="form-status" role="status" aria-live="polite">
            {status}
          </p>
        </div>
      </form>
      <ul className="socials">
        {profile.socials.map((s) => (
          <li key={s.label}>
            <a href={s.url} rel="me noopener">
              {s.label} ↗
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
});
