#!/usr/bin/env node
/**
 * Publishes the photo origin: a Worker that serves the portfolio JPEGs only.
 *
 * Run by hand, and rarely. It exists so the site build has a photo source that
 * survives the cutover. Until now PHOTO_SOURCE pointed at the live site, which
 * the cutover replaces, so the first build afterwards would have failed at the
 * worst possible moment and looked like the deploy broke the build.
 *
 * Deliberately NOT wired into CI. CI fetches FROM this origin to build the
 * site; having it also publish this origin would make the build depend on its
 * own output. Photos change rarely. A human runs this when they do.
 *
 *   node scripts/deploy-assets.mjs            # build the payload and deploy
 *   node scripts/deploy-assets.mjs --dry-run  # build and show, upload nothing
 */
import { mkdir, copyFile, writeFile, readdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'src', 'assets', 'photos');
// Fixed-path assets ride the same origin. /comp-card.pdf is printed on cards
// already in circulation, so its URL is not ours to change.
const STATIC = path.join(ROOT, 'src', 'assets', 'static');
const OUT = path.join(ROOT, 'deploy', 'assets-dist');
const DRY = process.argv.includes('--dry-run');

if (!existsSync(SRC)) {
  console.error('deploy-assets: no photos on disk. Run `npm run fetch:photos` first.');
  process.exit(1);
}

const photos = (await readdir(SRC)).filter((f) => f.toLowerCase().endsWith('.jpg'));
if (photos.length === 0) {
  console.error('deploy-assets: photo directory is empty');
  process.exit(1);
}

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
for (const f of photos) await copyFile(path.join(SRC, f), path.join(OUT, f));

let statics = [];
if (existsSync(STATIC)) {
  statics = await readdir(STATIC);
  for (const f of statics) await copyFile(path.join(STATIC, f), path.join(OUT, f));
}

// This origin exists for the build, not for readers. Keeping it out of search
// results avoids a second, uncredited copy of the portfolio competing with the
// real site for the same images.
await writeFile(path.join(OUT, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
await writeFile(
  path.join(OUT, '_headers'),
  [
    '/*',
    '  X-Robots-Tag: noindex',
    // Immutable: filenames are stable and content does not change under them.
    // A rename is how a photo is replaced.
    '  Cache-Control: public, max-age=31536000, immutable',
    '',
  ].join('\n')
);

console.log(`deploy-assets: staged ${photos.length} photos + ${statics.length} fixed-path assets + robots.txt + _headers`);

if (DRY) {
  console.log('deploy-assets: --dry-run, nothing uploaded');
  process.exit(0);
}

const res = spawnSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['wrangler', 'deploy', '--config', 'deploy/wrangler.assets.jsonc'],
  { stdio: 'inherit', cwd: ROOT }
);
process.exit(res.status ?? 1);
