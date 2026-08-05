#!/usr/bin/env node
/**
 * Fetches the fixed-path assets the site must keep serving, into `public/`,
 * where Astro copies them to `dist/` untouched at their exact URLs.
 *
 * WHY EXACT PATHS MATTER, and why this is not a nice-to-have:
 *
 *   /comp-card.pdf  is printed on physical comp cards that are already in
 *   circulation. A deploy cannot fix paper. If this path 404s after the
 *   cutover, every card handed out becomes a dead link permanently.
 *
 *   /og-image.jpg   is referenced by every link to this site already shared
 *   anywhere. Losing it does not break the page, it silently makes every past
 *   share render as broken.
 *
 *   /shaheen-kiarash-portfolio.pdf is sent to clients by link.
 *
 * These are NOT run through Astro's image pipeline on purpose: optimisation
 * would rename them with a content hash, which is exactly the thing that must
 * not happen.
 *
 * They live outside the repo for the same reason as the photographs: the PDFs
 * contain the same unlicensed images, and this repository is public.
 */
import { mkdir, writeFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const SOURCE = process.env.PHOTO_SOURCE ?? 'https://shaheenkiarash-assets.shaheen-kiarash.workers.dev';
const DEST = path.join(process.cwd(), 'public');

// name -> [minimum plausible bytes, magic-byte check]
const FILES = {
  'comp-card.pdf':                 [500_000, (b) => b.slice(0, 4).toString() === '%PDF'],
  'shaheen-kiarash-portfolio.pdf': [500_000, (b) => b.slice(0, 4).toString() === '%PDF'],
  'og-image.jpg':                  [10_000,  (b) => b[0] === 0xff && b[1] === 0xd8],
  'favicon-32.png':                [200,     (b) => b.slice(0, 4).toString('hex') === '89504e47'],
  'apple-touch-icon.png':          [500,     (b) => b.slice(0, 4).toString('hex') === '89504e47'],
};

async function fetchOne(name, [minBytes, isValid]) {
  const url = `${SOURCE}/${name}`;
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status} from ${url}`);

  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < minBytes) throw new Error(`${name}: ${buf.length} bytes, expected at least ${minBytes}`);
  // A static host answering 200 with an HTML error page would otherwise be
  // written to disk and shipped as a "PDF".
  if (!isValid(buf)) throw new Error(`${name}: wrong file signature, that is not a ${path.extname(name)}`);

  await writeFile(path.join(DEST, name), buf);
  return buf.length;
}

async function main() {
  console.log(`fetch-static: source ${SOURCE}`);
  await mkdir(DEST, { recursive: true });

  const names = Object.keys(FILES);
  const present = await Promise.all(
    names.map(async (n) => {
      const p = path.join(DEST, n);
      if (!existsSync(p)) return false;
      return (await stat(p)).size >= FILES[n][0];
    })
  );
  if (present.every(Boolean)) {
    console.log(`fetch-static: ${names.length} fixed-path assets already present, skipping`);
    return;
  }

  const results = await Promise.allSettled(names.map((n) => fetchOne(n, FILES[n])));
  const failed = results
    .map((r, i) => (r.status === 'rejected' ? `  ${names[i]}: ${r.reason.message}` : null))
    .filter(Boolean);

  if (failed.length) {
    console.error(`fetch-static: ${failed.length} of ${names.length} failed`);
    failed.forEach((f) => console.error(f));
    // Hard fail. Shipping a build that silently drops /comp-card.pdf would
    // break printed material, and nothing downstream would notice.
    process.exit(1);
  }

  const total = results.reduce((n, r) => n + r.value, 0);
  console.log(`fetch-static: ${names.length} assets, ${(total / 1024 / 1024).toFixed(1)} MB`);
}

main().catch((err) => { console.error('fetch-static: ' + err.message); process.exit(1); });
