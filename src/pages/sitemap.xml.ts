import type { APIRoute } from 'astro';
import { LIVE, PAGES, SITE } from '../site';

// The path must keep existing: the previous site had a sitemap at this URL and
// search engines remember that. An empty-but-valid sitemap before launch is
// better than a 404, which reads as a site that broke rather than one that is
// waiting.
export const GET: APIRoute = () => {
  const entries = LIVE ? PAGES : [];
  const urls = entries
    .map(
      (p) =>
        `  <url>\n    <loc>${SITE}${p.path}</loc>\n    <changefreq>${p.changefreq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>`
    )
    .join('\n');

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    (LIVE ? '' : '<!-- Empty until launch. See LIVE in src/site.ts. -->\n') +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}${urls ? '\n' : ''}</urlset>\n`;

  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
