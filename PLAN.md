# Portfolio Build Plan: 3 Websites

> **TL;DR:** One project, three websites. All three read from **one shared content file**, so you add a video once and it appears on all 3 sites. We build in **7 small phases**, and you approve each one before the next starts.

**Where we are:** Phase 1 of 6 done · waiting for your OK to start Phase 2 (first look)

---

## The 3 sites

| | Site | Feels like | Big idea |
|---|---|---|---|
| **A** | **Open File** | elegant + girly | Tabbed folders slide out and open into spreads |
| **B** | **Pop Zine** | fun + loud | Collage, stickers, a spinning wheel of categories |
| **C** | **Desktop Diary** | cute + nostalgic | A pink computer desktop (on phones: a phone home screen) |

### The look of each site

| | Colors | Fonts (candidates; final pick after type tests) |
|---|---|---|
| **A** | Paper `#F5EFE7` · Blush `#F3C6D3` · Raspberry `#B8214A` · Oxblood `#4E0D1C` · Ink `#1B1416` · Lime `#DDF36B` (highlighter only) | Editorial serif with a strong italic (Instrument Serif / Fraunces) + small mono + **your own handwriting**, digitized |
| **B** | Bubblegum `#FF9ACB` · Hot pink `#FF2E88` · Acid lime `#D6F55A` · Cream `#FFF5E6` · Cherry `#E3263F` · Ink `#161214` | Puffy display face for headlines + chunky retro sans + mono + handwriting |
| **C** | Powder pink `#F7D6E0` · Raspberry `#B8214A` · Cream `#FFF8F1` · Lilac `#CDB8F5` · Pixel black `#111111` | Pixel font for the "system" (e.g. Silkscreen) + editorial serif for content + mono |

---

## How it fits together

```
        ONE shared content source
  (your videos, about, clients, numbers)
                    │
        shared building blocks
  (video player, contact form, accessibility helpers)
                    │
     ┌──────────────┼──────────────┐
  Site A         Site B         Site C
  Open File      Pop Zine       Desktop Diary
```

---

## Sitemap: same pages on all 3, dressed differently

| Page | A · Open File | B · Pop Zine | C · Desktop Diary |
|---|---|---|---|
| **Home** | Big name + portrait + tab stack | Collage hero + category wheel | Desktop with folders (phone: home screen) |
| **Category** (×6) | Folder opens into a spread | Zine spread | Folder window (phone: an app) |
| **Video** | Focused viewer + callout notes | Polaroid-style viewer | Media player window (phone: stories) |
| **About** | Personal file + ID-style pass card | Scrapbook page | Notes app |
| **Proof** | Big numbers + client index | Sticker stats + client ticker | Stats app |
| **Contact** | Brief form styled as a "project slip" | Envelope form | Mail app compose window |
| **404** | Empty folder | Torn page | "File not found" error window |

- **Categories are placeholders** until you confirm yours: Beauty · Fashion · Wellness · Tech · Apps · Storytelling
- **Every video gets its own link** (e.g. `/work/beauty/brand-name`), so you can send a brand one specific video

### User journey (a brand manager visiting)

1. Arrives from your link in bio or an email
2. Knows who you are **within 3 seconds** (name, what you do, your face)
3. Picks a category → watches 2–3 videos
4. Checks proof (numbers, clients)
5. Sends you a brief through the form

---

## Interactions: must-have vs nice-to-have

### All 3 sites: must-have
- Videos play **muted, only while on screen**, with captions, tap for sound and a poster image
- Everything works with **keyboard, touch and mouse**
- **Reduced motion** setting on → crossfades only, no autoplay
- A **plain list of all work** is always one click away

### Site A · Open File
- **Must:** tab pull + folder-open transition · tab rail (desktop: right edge / phone: bottom drawer) · swipe through videos on phone
- **Nice:** callout lines draw in · handwritten notes "write themselves" · 1–2 draggable stickers · pixel-cursor sparkle Easter egg

### Site B · Pop Zine
- **Must:** category wheel (with arrow keys + list fallback) · ticker bands (with pause button) · zine spreads
- **Nice:** draggable/peelable stickers · sparkle cursor trail (desktop only) · wobbly "jelly" type on hover

### Site C · Desktop Diary
- **Must:** folders open as windows (accessible dialogs) · phone home screen + stories viewer · dock/taskbar navigation
- **Nice:** drag windows around (desktop only) · boot-up intro (skippable, once per visit) · dock icons grow on hover

---

## Tech stack

| Need | Tool | Why |
|---|---|---|
| Site framework | **Astro** | Fast static pages that ship almost no JavaScript by default. Interactive "islands" only where needed. Content collections check that every video entry has what it needs |
| Shared content | **Astro content collections** in a shared package | Edit once → all 3 sites update |
| Animation | **GSAP** (free, including Flip, Draggable, ScrollTrigger) | Flip = folder-open morph · Draggable = stickers & windows · ScrollTrigger = scroll storytelling. One library covers all 3 sites |
| Page transitions | **View Transitions** (built into Astro) | Smooth page-to-page morphs with no extra library; older browsers just get a normal page load |
| Styling | **Plain CSS + design tokens** per site | No framework lock-in; each site gets its own colors, fonts and spacing |
| Project setup | **npm workspaces** (already on your computer) | 3 sites + shared packages in one folder |
| Fonts | **Astro Fonts API** (built in) with the font files installed locally | Preloads fonts and uses size-matched fallbacks, so text doesn't jump while loading |
| Video hosting | **Decide when your videos are ready:** self-hosted MP4 vs a streaming service (Mux / Cloudflare Stream / Bunny Stream) | Depends on how many videos you have and how big they are |
| Contact form | **Decide before launch:** a form service (e.g. Formspree / Netlify Forms) | No server for you to maintain |
| Hosting | **Netlify / Vercel / Cloudflare Pages** | Free tier, auto-deploys, a preview link for every change |
| Testing | **Playwright + axe-core + Lighthouse CI** | Cross-browser, accessibility and speed checks on every change |

**Not using, on purpose:** React (not needed) · smooth-scroll hijacking (bad for accessibility) · 3D/WebGL (heavy, not needed for this look). We can revisit if one specific effect truly needs it.

**Your computer:** Node 26, npm 11 and git are installed. Confirmed in Phase 1: Astro 7 runs fine on Node 26.

---

## Phases

Each phase ends with something you can **see and click**. Nothing moves on without your OK.

- [x] **Phase 0: Content & basics** (you + me) · done 2026-11-16 → see [CONTENT.md](CONTENT.md)
  - Collect: categories, videos, photos, bio, clients/numbers you can show, domain
  - Decide video hosting + form service
  - ✅ **Done when:** the content list is filled in (placeholders are fine for gaps)

- [x] **Phase 1: Foundation** · done 2026-11-16, waiting for your OK
  - Project setup, shared content with placeholder data, shared video player + form, testing setup, preview deploys
  - ✅ **Done when:** all 3 sites build and open on preview links · tests run automatically · 0 accessibility errors on the blank shells
  - **Result:** 3 sites × 30 pages build · 0 type errors · browser tests pass in Chromium, Firefox, WebKit + phone · Lighthouse 100/100 (speed/accessibility) on every tested page
  - **Not yet:** online preview links. They need a hosting account (you create it, I connect it). For now the sites run on your computer.

- [ ] **Phase 2: First look (all 3 homepages + 1 category each)**
  - ✅ **Done when:** you can click through all 3 on desktop **and** phone · each site's signature move works (folder open / wheel / window)

- [ ] **Phase 3: Finish Site A (Open File)**
- [ ] **Phase 4: Finish Site B (Pop Zine)**
- [ ] **Phase 5: Finish Site C (Desktop Diary)**
  - ✅ **Done when (each):** every page built · all must-have interactions work · passes the quality bar below
  - Order of 3–5 can change. Start with your favorite if you like

- [ ] **Phase 6: Real content, polish, launch**
  - Swap placeholders for your real content · final browser testing · domains · go live
  - ✅ **Done when:** the quality bar passes with real content · all 3 sites are live

---

## Quality bar (every site, every phase)

| Check | Target |
|---|---|
| Lighthouse (mobile): Performance | ≥ 90 |
| Lighthouse: Accessibility | 100 |
| Main content visible (LCP) | < 2.5 s on mobile 4G |
| Layout jumping (CLS) | < 0.1 |
| Response to taps/clicks (INP) | < 200 ms |
| axe accessibility scan | 0 serious or critical issues |
| JavaScript per page | ≤ 150 KB gzipped (videos not counted) |
| Narrowest screen | 360 px wide, no sideways scrolling |
| Tap targets | ≥ 44 × 44 px |
| Keyboard | Everything reachable, visible focus ring |
| Reduced motion | No autoplay, no parallax, crossfades only |

---

## Accessibility

- Real HTML structure: headings, landmarks, buttons that are actually buttons
- Folder tabs use the accessible **tabs** pattern · windows are **dialogs** that hold and return focus · the wheel is a **list** you can move through with arrow keys
- Captions on every video · never autoplay with sound
- Text contrast at least 4.5:1 (lime and pink only as backgrounds behind dark text)
- Script and handwriting are decoration; the real text is always there for screen readers
- A pause button on anything that moves for more than 5 seconds (like tickers)

---

## Responsive strategy

Each site is designed **twice on purpose**, not squished:

- **A:** side tab rail → bottom file drawer · video spread → full-screen vertical swipe
- **B:** wide collage → stacked zine pages · wheel → swipeable carousel
- **C:** desktop + windows → phone home screen + full-screen apps and stories

Breakpoints: **360 / 768 / 1024 / 1440+**

---

## Browser testing

- **Automatic, every change:** Playwright on Chromium, Firefox and WebKit (Safari's engine) · axe · Lighthouse
- **By hand, every phase:** iPhone Safari · Android Chrome · Mac Safari · Windows Chrome, Edge, Firefox · Samsung Internet before launch
- **Every phase:** a keyboard-only run-through · screen reader spot check (NVDA on Windows, VoiceOver on iPhone) · reduced motion turned on

---

## What I'll need from you (whenever it's ready, tracked in [CONTENT.md](CONTENT.md))

1. What you do + your categories
2. Your videos (files or links)
3. Photos of you
4. Clients and numbers you're allowed to show
5. Domain(s) + any deadline
