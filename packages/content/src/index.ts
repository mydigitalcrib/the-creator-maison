/**
 * @mfm/content — the ONE shared content source for all 3 sites.
 *
 * Each site's `src/content.config.ts` wraps these configs in `defineCollection()`.
 * Edit the files in `packages/content/data/` once → every site updates.
 *
 * This file must not import `astro:content` (a virtual module that only exists
 * inside each app), so helpers that need `getCollection` take it as a parameter.
 */
import { z } from 'astro/zod';
import { file, glob } from 'astro/loaders';
import type { SchemaContext } from 'astro/content/config';

/** Path from any app folder (`apps/<site>/`) to the shared data folder. */
const DATA = '../../packages/content/data';

// ---------------------------------------------------------------------------
// Vocabularies
// ---------------------------------------------------------------------------

export const FORMATS = [
  'narrator',
  'storytelling',
  'engagement',
  'unboxing',
  'tutorial',
  'review',
  'day-in-the-life',
] as const;
export type Format = (typeof FORMATS)[number];

export const FORMAT_LABELS: Record<Format, string> = {
  narrator: 'Narrator',
  storytelling: 'Storytelling',
  engagement: 'Engagement',
  unboxing: 'Unboxing',
  tutorial: 'Tutorial',
  review: 'Review',
  'day-in-the-life': 'Day in the life',
};

export const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'other'] as const;
export type Platform = (typeof PLATFORMS)[number];

export const PLATFORM_LABELS: Record<Platform, string> = {
  tiktok: 'TikTok',
  instagram: 'Instagram',
  youtube: 'YouTube',
  other: 'Other',
};

// ---------------------------------------------------------------------------
// Collection configs (wrap each in defineCollection() inside the app)
// ---------------------------------------------------------------------------

/** About you. One entry, id "main". */
export const profile = {
  loader: file(`${DATA}/profile.json`),
  schema: z.object({
    name: z.string(),
    role: z.string(),
    tagline: z.string(),
    location: z.string(),
    email: z.email(),
    bio: z.array(z.string()).min(1),
    socials: z.array(z.object({ label: z.string(), url: z.url() })),
    /** True while this is placeholder text that still needs replacing. */
    placeholder: z.boolean().default(false),
  }),
};

/** Work categories (the folders / tabs / wheel slices / desktop icons). */
export const categories = {
  loader: file(`${DATA}/categories.json`),
  schema: z.object({
    title: z.string(),
    order: z.number().int(),
    blurb: z.string(),
    /** Vertical (9:16) short-form or horizontal (16:9) long-form. */
    length: z.enum(['short', 'long']),
  }),
};

/** One file per video in `data/videos/<category>/<slug>.md`. */
export const videos = {
  loader: glob({ pattern: '**/*.md', base: `${DATA}/videos` }),
  schema: ({ image }: SchemaContext) =>
    z.object({
      title: z.string(),
      brand: z.string(),
      category: z.string(),
      format: z.enum(FORMATS),
      platform: z.enum(PLATFORMS),
      /** Length in seconds. */
      duration: z.number().int().positive().optional(),
      poster: image().optional(),
      /** Video file URL (or path in an app's /public). Empty = placeholder frame. */
      src: z.string().optional(),
      /** WebVTT captions file URL. */
      captions: z.string().optional(),
      results: z
        .object({
          views: z.number().int().nonnegative().optional(),
          likes: z.number().int().nonnegative().optional(),
          shares: z.number().int().nonnegative().optional(),
          saves: z.number().int().nonnegative().optional(),
          note: z.string().optional(),
        })
        .optional(),
      order: z.number().int().default(0),
      featured: z.boolean().default(false),
      placeholder: z.boolean().default(false),
    }),
};

/** Brands you've worked with (only list ones you're allowed to name). */
export const clients = {
  loader: file(`${DATA}/clients.json`),
  schema: z.object({
    name: z.string(),
    category: z.string(),
    order: z.number().int(),
    placeholder: z.boolean().default(false),
  }),
};

/** Headline numbers for the Proof page. */
export const metrics = {
  loader: file(`${DATA}/metrics.json`),
  schema: z.object({
    label: z.string(),
    value: z.number().nonnegative(),
    suffix: z.string().default(''),
    context: z.string(),
    order: z.number().int(),
    placeholder: z.boolean().default(false),
  }),
};

// ---------------------------------------------------------------------------
// Helpers (pure — safe to import anywhere)
// ---------------------------------------------------------------------------

/** The last part of a video id: "beauty/skincare-routine" → "skincare-routine". */
export const videoSlug = (id: string): string => id.split('/').pop() ?? id;

export const categoryHref = (categoryId: string): string => `/work/${categoryId}/`;

export const videoHref = (video: { id: string; data: { category: string } }): string =>
  `/work/${video.data.category}/${videoSlug(video.id)}/`;

const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
/** 5627045 → "5.6M" */
export const formatCompact = (n: number): string => compact.format(n);

/** 95 → "1:35" */
export const formatDuration = (seconds: number): string =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

// ---------------------------------------------------------------------------
// Loading everything at once (pass in the app's getCollection)
// ---------------------------------------------------------------------------

type Entry<T> = { id: string; data: T };
type AnyGetCollection = (name: never) => Promise<Entry<unknown>[]>;

/**
 * Loads and sorts all shared content.
 *
 *   import { getCollection } from 'astro:content';
 *   const site = await loadSite(getCollection);
 */
export async function loadSite<G extends AnyGetCollection>(getCollection: G) {
  const get = getCollection as unknown as (name: string) => Promise<Entry<any>[]>;
  const [profiles, cats, vids, clientList, metricList] = await Promise.all([
    get('profile'),
    get('categories'),
    get('videos'),
    get('clients'),
    get('metrics'),
  ]);

  const profileEntry = profiles.find((p) => p.id === 'main') ?? profiles[0];
  if (!profileEntry) throw new Error('packages/content/data/profile.json needs a "main" entry');

  const byOrder = (a: Entry<{ order: number }>, b: Entry<{ order: number }>) =>
    a.data.order - b.data.order || a.id.localeCompare(b.id);

  const sortedCategories = [...cats].sort(byOrder);
  const sortedVideos = [...vids].sort(byOrder);

  for (const v of sortedVideos) {
    if (!sortedCategories.some((c) => c.id === v.data.category)) {
      throw new Error(`Video "${v.id}" uses unknown category "${v.data.category}"`);
    }
  }

  const videosByCategory = new Map(
    sortedCategories.map((c) => [c.id, sortedVideos.filter((v) => v.data.category === c.id)]),
  );

  return {
    profile: profileEntry.data as z.infer<typeof profile.schema>,
    categories: sortedCategories as Entry<z.infer<typeof categories.schema>>[],
    videos: sortedVideos as Entry<z.infer<ReturnType<typeof videos.schema>>>[],
    videosByCategory: videosByCategory as Map<string, Entry<z.infer<ReturnType<typeof videos.schema>>>[]>,
    clients: [...clientList].sort(byOrder) as Entry<z.infer<typeof clients.schema>>[],
    metrics: [...metricList].sort(byOrder) as Entry<z.infer<typeof metrics.schema>>[],
  };
}

export type Site = Awaited<ReturnType<typeof loadSite>>;
export type Video = Site['videos'][number];
export type Category = Site['categories'][number];
