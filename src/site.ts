/**
 * The going-live switch, and the page inventory that follows from it.
 *
 * Discoverability was previously three unrelated things: a `noindex` prop
 * repeated on every page, a robots policy, and a sitemap. Three places to
 * remember means three places to get half-right, and the failure mode is
 * silent in both directions: a site that quietly stays invisible after launch,
 * or a placeholder that quietly gets indexed before it is ready.
 *
 * So it is one boolean. Flipping LIVE to true is the entire cutover as far as
 * search engines are concerned: every page drops `noindex`, robots.txt starts
 * allowing crawlers and advertises the sitemap, and the sitemap starts being
 * worth reading. One line, one review, one thing to get wrong instead of three.
 */
export const SITE = 'https://shaheenkiarash.com';

/**
 * FALSE until the production cutover.
 *
 * Do not flip this to publish to staging: staging deploys carry the same build,
 * and a `true` here would invite crawlers to index the workers.dev copy as a
 * duplicate of the real site.
 */
export const LIVE = false;

/** Every indexable page, in the order a reader would meet them. */
export const PAGES = [
  { path: '/', changefreq: 'monthly', priority: '1.0' },
  { path: '/portfolio', changefreq: 'monthly', priority: '0.9' },
  { path: '/about', changefreq: 'yearly', priority: '0.7' },
  { path: '/contact', changefreq: 'yearly', priority: '0.7' },
] as const;
