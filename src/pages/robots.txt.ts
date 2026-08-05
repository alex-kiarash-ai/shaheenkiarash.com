import type { APIRoute } from 'astro';
import { LIVE, SITE } from '../site';

// Generated rather than a static file, so it can never disagree with the
// noindex on the pages themselves. Both read the same LIVE flag.
export const GET: APIRoute = () => {
  const body = LIVE
    ? `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`
    : [
        '# The site is not live yet. Every page also carries a noindex meta tag;',
        '# this file and that tag are generated from the same flag in src/site.ts,',
        '# so they cannot drift apart.',
        'User-agent: *',
        'Disallow: /',
        '',
      ].join('\n');

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
