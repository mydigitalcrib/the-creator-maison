/**
 * Reads the shared content (packages/content/data) at build time: the same profile, categories,
 * videos, numbers and brands as the other sites. Edit those files and this site updates too.
 */
import categoriesFile from '../../../packages/content/data/categories.json';
import clientsFile from '../../../packages/content/data/clients.json';
import metricsFile from '../../../packages/content/data/metrics.json';
import profileFile from '../../../packages/content/data/profile.json';

export interface Profile {
  name: string;
  role: string;
  tagline: string;
  location: string;
  email: string;
  bio: string[];
  socials: { label: string; url: string }[];
  portrait?: string;
  gallery: string[];
}

export interface Category {
  id: string;
  title: string;
  blurb: string;
  order: number;
  length: 'short' | 'long';
}

export interface Video {
  id: string;
  slug: string;
  title: string;
  brand: string;
  category: string;
  format: string;
  platform: string;
  duration?: number;
  src?: string;
  results: { views?: number; likes?: number; shares?: number; saves?: number };
  order: number;
  featured: boolean;
  brief: string;
}

export interface Metric {
  id: string;
  label: string;
  value: number;
  suffix?: string;
  context: string;
  order: number;
  placeholder?: boolean;
}

const items = <T,>(file: unknown): T[] => (Array.isArray(file) ? file : (file as { items: T[] }).items);
const byOrder = <T extends { order: number }>(a: T, b: T) => a.order - b.order;

/** A file path in the site's public folder, prefixed with the base path (works under /the-creator-maison/). */
export const asset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;

// --- tiny frontmatter reader for the video files (flat keys + one nested "results" block)
const scalar = (raw: string): string | number | boolean => {
  const v = raw.trim();
  if (/^".*"$/.test(v) || /^'.*'$/.test(v)) return v.slice(1, -1);
  if (v === 'true' || v === 'false') return v === 'true';
  if (v !== '' && !Number.isNaN(Number(v))) return Number(v);
  return v;
};

const parseVideo = (path: string, text: string): Video => {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  const head = match?.[1] ?? '';
  const data: Record<string, unknown> = {};
  let nested: Record<string, unknown> | null = null;
  for (const line of head.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const indented = /^\s+/.test(line);
    const [, key, value] = line.match(/^\s*([\w-]+):\s*(.*)$/) ?? [];
    if (!key) continue;
    if (indented && nested) nested[key] = scalar(value);
    else if (value === '') data[key] = nested = {};
    else {
      nested = null;
      data[key] = scalar(value);
    }
  }
  const slug = path.split('/').pop()!.replace(/\.md$/, '');
  return {
    id: `${data.category}/${slug}`,
    slug,
    title: String(data.title ?? slug),
    brand: String(data.brand ?? ''),
    category: String(data.category ?? ''),
    format: String(data.format ?? ''),
    platform: String(data.platform ?? ''),
    duration: typeof data.duration === 'number' ? data.duration : undefined,
    src: typeof data.src === 'string' && data.src ? data.src : undefined,
    results: (data.results as Video['results']) ?? {},
    order: Number(data.order ?? 0),
    featured: data.featured === true,
    brief: (match?.[2] ?? '').trim(),
  };
};

const videoFiles = import.meta.glob('../../../packages/content/data/videos/*/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

export const profile = (profileFile as { main: Profile }).main;
export const categories = items<Category>(categoriesFile).sort(byOrder);
export const videos = Object.entries(videoFiles)
  .map(([path, text]) => parseVideo(path, text))
  .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
export const metrics = items<Metric>(metricsFile).sort(byOrder);

export const videosByCategory = new Map(categories.map((c) => [c.id, videos.filter((v) => v.category === c.id)]));

const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
export const formatCompact = (n: number) => compact.format(n);
export const formatMetric = (m: Metric) => `${m.value >= 10000 ? formatCompact(m.value) : m.value}${m.suffix ?? ""}`;

export const FORMAT_LABELS: Record<string, string> = {
  narrator: 'Narrator',
  storytelling: 'Storytelling',
  engagement: 'Engagement',
  unboxing: 'Unboxing',
  tutorial: 'Tutorial',
  review: 'Review',
  'day-in-the-life': 'Day in the life',
};

export const PLATFORM_LABELS: Record<string, string> = {
  tiktok: 'TikTok',
  instagram: 'Instagram',
  youtube: 'YouTube',
  other: 'Other',
};

export const formatDuration = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export interface Client {
  id: string;
  name: string;
  category: string;
  order: number;
  placeholder?: boolean;
}

export const clients = items<Client>(clientsFile).sort(byOrder);
export const anyPlaceholder = [...metrics, ...clients].some((x) => x.placeholder);
export const categoryTitle = (id: string) => categories.find((c) => c.id === id)?.title ?? id;

/** Three videos that each use a different clip (featured first), so nothing repeats side by side. */
export const featuredVideos = (() => {
  const seen = new Set<string>();
  const out: Video[] = [];
  for (const v of [...videos.filter((x) => x.featured), ...videos.filter((x) => !x.featured)]) {
    const key = v.src ?? v.id;
    if (out.length === 3) break;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
})();

/** One clip per category row, rotating so neighbouring rows preview different clips. */
export const previewFor = (categoryId: string, index: number) => {
  const clips = [...new Set(videos.map((v) => v.src).filter(Boolean))] as string[];
  const list = videosByCategory.get(categoryId) ?? [];
  const want = clips[index % Math.max(clips.length, 1)];
  return (list.find((v) => v.src === want) ?? list[0])?.src;
};

/** Work videos are served from the campaign's own web copies (public/clips, see scripts/encode-clips.mjs). */
export const clipUrl = (src: string) => asset(`clips/${src.split('/').pop()}`);
export const clipPoster = (src: string) => clipUrl(src).replace(/\.mp4$/, '.webp');
