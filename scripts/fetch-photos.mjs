#!/usr/bin/env node
/**
 * Pulls the portfolio photographs in at build time.
 *
 * WHY. The repository is public and the photographs are not licensed for
 * redistribution. Committing them would put them in the git history
 * permanently, where deleting them later does nothing. So they live outside
 * the repo, this script fetches them during the build, and Astro optimises
 * them into `dist/`. The published site serves them from its own origin; the
 * repository never contains them at any commit.
 *
 * This is the same shape as the fallback the project planned for from the
 * start: if the photographer's grant is narrowed, nothing here changes. Only
 * PHOTO_SOURCE moves.
 *
 * PHOTO_SOURCE points at a dedicated photo-origin Worker, deployed separately
 * by scripts/deploy-assets.mjs. It deliberately does NOT point at the live
 * site: the cutover replaces that Worker, and a build that fetches from the
 * thing it is about to overwrite fails at the worst possible moment and looks
 * like the deploy broke the build.
 *
 * That origin serves the photographs and nothing else, carries
 * X-Robots-Tag: noindex and a robots.txt disallowing everything, so it does
 * not compete with the real site for the same images.
 *
 * If it is ever unreachable the build fails loudly rather than silently
 * shipping a portfolio with no photographs, which is the failure mode worth
 * having.
 */
import { mkdir, writeFile, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const SOURCE = process.env.PHOTO_SOURCE ?? 'https://shaheenkiarash-assets.shaheen-kiarash.workers.dev';
const DEST = path.join(process.cwd(), 'src', 'assets', 'photos');

// The curated set, in the order the live site shows them. Curation is content,
// not a build detail, so the ORDER lives in the content entries; this list is
// only what to fetch.
const FILES = [
  // The home hero. Portrait, and deliberately so: it is the existing chosen
  // frame and the only landscape files in the set top out well below what a
  // full-bleed hero needs, so the layout adapts to the asset rather than the
  // asset being stretched to fit a layout.
  'hero.jpg',
  'portfolio-1.jpg', 'portfolio-2.jpg', 'portfolio-3.jpg', 'portfolio-4.jpg',
  'portfolio-5.jpg', 'portfolio-6.jpg', 'portfolio-7.jpg', 'portfolio-8.jpg',
  'portfolio-9.jpg', 'portfolio-12.jpg', 'portfolio-13.jpg', 'portfolio-14.jpg',
  'portfolio-15.jpg', 'portfolio-16.jpg', 'portfolio-17.jpg', 'portfolio-18.jpg',
  'portfolio-20.jpg', 'portfolio-21.jpg', 'portfolio-22.jpg', 'portfolio-23.jpg',
  'portfolio-24.jpg', 'portfolio-25.jpg', 'portfolio-26.jpg', 'portfolio-27.jpg',
];

const MIN_BYTES = 20_000; // anything smaller is an error page, not a photograph

async function fetchOne(name) {
  const url = `${SOURCE}/${name}`;
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status} from ${url}`);

  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < MIN_BYTES) {
    throw new Error(`${name}: only ${buf.length} bytes, that is not a photograph`);
  }
  // JPEG magic. A 200 that returns an HTML error page is the failure this
  // catches, and it is a real one: static hosts love answering 200 with a
  // homepage for a missing file.
  if (!(buf[0] === 0xff && buf[1] === 0xd8)) {
    throw new Error(`${name}: not a JPEG (first bytes ${buf[0]?.toString(16)} ${buf[1]?.toString(16)})`);
  }
  await writeFile(path.join(DEST, name), buf);
  return buf.length;
}

async function main() {
  console.log(`fetch-photos: source ${SOURCE}`);
  await mkdir(DEST, { recursive: true });

  // Skip work when the set is already present and sane. Keeps local iteration
  // fast without ever making a stale cache the reason a build passed.
  if (existsSync(DEST)) {
    const have = (await readdir(DEST)).filter((f) => f.endsWith('.jpg'));
    if (have.length === FILES.length) {
      const sizes = await Promise.all(
        have.map(async (f) => (await stat(path.join(DEST, f))).size)
      );
      if (sizes.every((s) => s >= MIN_BYTES)) {
        console.log(`fetch-photos: ${have.length} photos already present, skipping`);
        return;
      }
    }
  }

  const results = await Promise.allSettled(FILES.map(fetchOne));
  const failed = results
    .map((r, i) => (r.status === 'rejected' ? `  ${FILES[i]}: ${r.reason.message}` : null))
    .filter(Boolean);

  if (failed.length) {
    console.error(`fetch-photos: ${failed.length} of ${FILES.length} failed`);
    failed.forEach((f) => console.error(f));
    // Hard fail. A portfolio site that builds green with no photographs in it
    // is worse than one that refuses to build.
    process.exit(1);
  }

  const total = results.reduce((n, r) => n + r.value, 0);
  console.log(
    `fetch-photos: ${FILES.length} photos, ${(total / 1024 / 1024).toFixed(1)} MB fetched`
  );
}

main().catch((err) => {
  console.error('fetch-photos: ' + err.message);
  process.exit(1);
});
