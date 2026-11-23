# Michelle's portfolio: 3 sites, 1 content source

> **TL;DR:** Edit your content once in `packages/content/data/`, and all 3 sites update.

**Live (Site A):** https://mydigitalcrib.github.io/the-creator-maison/ — rebuilt and published by GitHub Pages on every push to `main` (see `.github/workflows/pages.yml`).

| Site | Style | Local address |
|---|---|---|
| **A** | Editorial drop: split name, cut-out photo, product-style tags | http://localhost:4321 |
| **B** | Pop Zine: collage, stickers, loud | http://localhost:4322 |
| **C** | Desktop Diary: pink computer desktop | http://localhost:4323 |

Where we are: see the status line at the top of [PLAN.md](PLAN.md).

---

## Where things live

```
packages/content/data/   ← YOUR CONTENT (edit here)
  profile.json             name, intro, bio, email, socials
  categories.json          the 6 categories
  videos/<category>/*.md   one file per video
  clients.json             brands you can name
  metrics.json             your numbers

packages/ui/             ← shared pieces (video player, contact form, fonts, base styles)

apps/open-file/          ← Site A
apps/pop-zine/           ← Site B
apps/desktop-diary/      ← Site C

tests/                   ← automatic checks
```

## Commands

Run these from this folder.

| What | Command |
|---|---|
| Work on one site (live reload) | `npm run dev:open-file` · `npm run dev:pop-zine` · `npm run dev:desktop-diary` |
| Build all 3 | `npm run build` |
| Check for code mistakes | `npm run check` |
| Run all browser tests (needs a build first) | `npm test` |
| Speed + accessibility scores (needs a build first) | `npm run lighthouse` |
| Screenshots of all 3 for comparing (needs a build first) | `npm run shots` → `screenshots/` |
| Everything, in order | `npm run verify` |

First time on a new computer: `npm install`, then `npm run test:install` (downloads the test browsers).

## Adding a video

1. Make a file: `packages/content/data/videos/<category>/<short-name>.md`
2. Copy the top section from an existing video file and change the details
3. Put the video file's address in `src:` (leave it out and the site shows a "coming soon" frame)
4. Write the story of the video below the `---` line
