/**
 * All content comes from the shared package (packages/content/data).
 * Don't add site-only content here: every site should show the same work.
 */
import { defineCollection } from 'astro:content';
import * as shared from '@mfm/content';

export const collections = {
  profile: defineCollection(shared.profile),
  categories: defineCollection(shared.categories),
  videos: defineCollection(shared.videos),
  clients: defineCollection(shared.clients),
  metrics: defineCollection(shared.metrics),
};
