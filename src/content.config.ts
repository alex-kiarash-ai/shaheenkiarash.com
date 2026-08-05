import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * The photo content model.
 *
 * Deliberately defined before a single photograph exists, because the point of
 * the model is that ordering, alt text and categories are DATA rather than
 * markup. Adding a photo later is a new markdown file, not an edit to a
 * template, and reordering the portfolio is changing numbers in frontmatter.
 *
 * `tags` is present and allowed to be empty on purpose. The v1 scope is one
 * curated stream with no category filter, but tag-driven routes are the planned
 * v1.1 change and the three retired SEO URLs redirect in anticipation of it.
 * Carrying the empty field now means that change is a routing addition instead
 * of a schema migration across every entry.
 */
const photos = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/photos' }),
  schema: ({ image }) =>
    z.object({
      /** Web master, ~2400px. Astro generates every smaller variant at build. */
      src: image(),

      /** Required, never optional. An unlabelled photograph is inaccessible. */
      alt: z.string().min(1),

      /** Lower sorts first. Gaps are fine and make inserting a frame cheap. */
      order: z.number().int(),

      /** Season stamp, e.g. "Stockholm — Spring 2026". A dated caption is the
          cheapest credibility signal a portfolio has. */
      caption: z.string().optional(),

      /** Empty in v1 by design. See the note above. */
      tags: z.array(z.string()).default([]),

      /** Rights provenance travels WITH the photo, so a file can never be
          published without an answer to "who shot this and may we show it". */
      photographer: z.string().optional(),

      /** Set false for any frame whose repo-redistribution grant is not
          confirmed; the build can then exclude it without deleting it. */
      cleared: z.boolean().default(false),

      /** Breaks the 4:5 crop. Reserved for a hero frame. */
      wide: z.boolean().default(false),
    }),
});

export const collections = { photos };
