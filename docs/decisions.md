# Decisions

One entry per decision, written when it is taken rather than reconstructed later. By launch this is the case study, for free.

---

## 2026-08-04 — Static site generator: Astro

**Chosen for the image pipeline, not for fashion.** This is a photography portfolio: the single highest-value build-time job is turning one master per photo into responsive sizes and modern formats without hand-exporting anything. Astro does that natively and its responsive image handling has been stable since 5.10.

The second reason is the content model. Each photo is a markdown entry rather than a hardcoded `<img>`, which means the ordering, alt text and future categories are data. That decision is what makes the deferred work cheap (see the v1.1 note under redirects).

**Trade-off accepted:** a build step exists at all. For four pages that is worth it, because the alternative is hand-maintaining responsive markup for thirty images.

---

## 2026-08-04 — Hosting: Cloudflare Workers static assets, not the Hetzner VPS

The original specification called for self-hosting on an existing VPS, explicitly because self-hosting is part of the interview story. **Rejected, on evidence.**

1. **The box is production.** Ports 80 and 443 are held by the reverse proxy fronting live automation services. The spec's model, "a plain directory behind the existing proxy, no Docker for the site", does not exist on that machine: serving a host directory would mean adding a volume mount and restarting the container that fronts production.
2. **The zone carries working email.** The site's own contact address runs on Cloudflare Email Routing on the same domain. The VPS path needs an apex A-record repoint with MX surviving intact. The Cloudflare path needs no DNS change at all, and a cutover you never perform has no failure modes.
3. **The story is better.** "I evaluated self-hosting on my own VPS and rejected it, to keep a public surface off my production infrastructure" is a more senior sentence than a virtual host file. Deciding not to build something, for a stated reason, is the job.

**What was kept from the original plan:** everything that actually mattered. Public repo, CI on every push, build-time image pipeline, a written decision log, and a restore that gets tested rather than assumed.

**Deferred, not dead.** The VPS move keeps its own go/no-go. Reviving it would first require specifying the containerised-proxy serving mechanics, a hardened deploy user (ed25519, forced command, no supplementary groups), and atomic releases instead of a bare `rsync --delete`.

---

## 2026-08-04 — The four retired URLs get 301s, not silence

The v1 scope is four pages. The previous site had three search-intent pages and a `/now` page that are **indexed**, so dropping them silently would throw away earned search signal and produce 404s for anyone holding a link.

Each is redirected in `public/_redirects`, which Cloudflare Workers static assets supports natively, so no router worker and no meta-refresh stubs.

`/now` redirects rather than surviving because its generator was retired with the system that built it; keeping the page would have guaranteed it going stale. Availability moves to the About page as a sentence a human edits.

**The three intent pages are a v1.1 candidate, and cheap.** The content model already carries an empty `tags` field on every photo. Commercial, fitness and hair *are* those tags. Bringing them back is a content-collection filter and one dynamic route, not a restructure. The three redirect lines are kept adjacent so undoing this is deleting three lines.

**Not redirected, deliberately:** `/digitals`, which was pulled from public view and should keep 404ing. The comp card and portfolio PDFs keep their exact paths, because a printed comp card points into this site and a moved path breaks paper already in the world.

---

## 2026-08-04 — Typography: Cormorant Garamond and Inter

Cormorant Garamond carries the editorial character and is why the site does not read as a template.

Inter was challenged on the grounds that it is the most common sans on the web, and elegant-serif-plus-Inter is the most common pairing, so it was arguably the one place the design goes quiet. **Kept anyway, and the reasoning holds:** on this site the sans does almost no display work. It carries navigation, small tracked-out labels, captions and statistics, which is precisely what Inter is good at. All the character is carried by the serif and by the photographs, and a second opinionated typeface would have competed with both.

Both faces are self-hosted and subset, with no third-party font calls at runtime.

---

## 2026-08-04 — The build runs in CI, because it cannot run on the author's machine

Not a preference. The development machine runs Windows **Smart App Control**, which blocks unsigned native modules. Astro 7's toolchain is native all the way down: the compiler binding is blocked, and forcing its WASI fallback just moves the failure one layer deeper into the bundler, with the image processor waiting behind that. Chasing a WebAssembly variant for every native module in the chain is unbounded work for a temporary result.

**So `main` is the build.** Push, and CI compiles on Linux where no such policy exists. This costs a round trip per change and gains something worth having: the artefact that gets verified is the one that actually ships, built in the same environment every time, rather than one produced locally under conditions nobody else can reproduce.

It also happens to be exactly what this project already claimed. The architecture states that all TypeScript executes once, on the build server. That was written as a description of the runtime model; it turned out to be a description of the only workflow available.

**Options if local iteration becomes the bottleneck**, in preference order: install Node inside WSL, which is present and not subject to the Windows policy; or pin an Astro version whose toolchain is JavaScript rather than native. Neither is needed yet, and the second would be choosing a framework version for a local-machine reason, which is the wrong reason.

---

## 2026-08-04 — Palette: inherited, with one contrast fix

The near-black palette carries over from the previous site, which was reviewed and found to have a strong visual identity worth protecting. Neither end of the scale is a pure value: the canvas is a warm near-black and the ink a warm white, which is what keeps a high-contrast dark site from reading as harsh.

**One real defect was found by measuring rather than eyeballing.** The faintest ink token had been raised specifically to clear WCAG AA, and it did — at 4.51:1, by one hundredth. But that was measured against the canvas only, and the same token is used on two lighter surfaces where it fell to 4.32 and 3.98 and stopped passing. It was corrected to a value that clears 4.5:1 on all four surfaces while keeping the warm hue relationship.

The lesson worth keeping: a contrast fix measured against one background is half a fix.

---

## 2026-08-05 — Deploy credentials: least privilege, and staging as the default

Two decisions taken together, both about making the dangerous thing hard rather than remembering not to do it.

**The token was trimmed from Cloudflare's template.** The "Edit Cloudflare Workers" template ships with ten account-level permissions: KV, R2, Pages, Containers, Observability, Builds Configuration, Agents Configuration and Tail alongside the two that matter. This site has no bindings at all, which the deploy output confirms on every run, so seven of those govern capabilities that do not exist here. They were removed.

Workers Tail was removed separately and for a different reason. It streams live request logs, which means visitor IP addresses and requested URLs. Every other permission on this token moves configuration; that one reads people. A token living in a public repository's CI should not be able to watch the site's traffic.

What remains is Workers Scripts:Edit and Account Settings:Read on the account, Workers Routes:Edit scoped to this zone alone, and the two user-detail reads Cloudflare attaches to every token. Notably absent: any DNS or Email Routing access. This zone carries a live email address, so a token that could reach it would be a standing risk for no benefit.

**Trade-off accepted:** a too-narrow token fails at deploy time with an explicit permission error naming what it wanted, which costs one edit. A too-broad token fails silently, forever, and only matters on the day it leaks.

**Staging is the default deploy target, and production requires a second variable.** The deploy step previously ran a bare `wrangler deploy` against a config naming the worker the live domain is bound to. Enabling deploys for the first time would therefore have published a placeholder over the live site. Now `DEPLOY_TARGET` must equal `production` for that to be possible, and a separate guard refuses any production deploy whose build still carries `noindex`.

Verified rather than assumed: the first real deploy went to `shaheenkiarash-staging`, and the live site's homepage hashed identically before and after.

---

## 2026-08-05 — Correction: the mobile overflow that was not there

The previous commit claimed to fix a layout defect on narrow viewports. There was no defect. This entry exists because the claim is in the history and the history is public.

**What happened.** The pages were rendered with `chrome --headless --window-size=390,1500 --screenshot` and the output showed navigation running past the edge, body copy cut mid-word, and the measurements column entirely off-screen. That was diagnosed as a flex item refusing to shrink, and `flex-wrap` plus `min-width: 0` were shipped as the fix.

**What was actually true.** Chrome on Windows clamps its window to a minimum width of roughly 504 pixels. Asked for 390, it laid the page out at 504 and then cropped the screenshot to 390. Everything looked clipped because everything *was* clipped, by the screenshot rather than by the layout. A probe page confirmed it: requesting 390 reported `innerWidth=504`.

The tell was available and initially missed: the contact page, which has no measurements table, showed identical clipping. A fix targeting one component cannot explain a symptom on a page without that component.

**How it is now measured.** Layout viewport is set through the DevTools protocol's `Emulation.setDeviceMetricsOverride`, which no window minimum applies to, and horizontal overflow is reported as `documentElement.scrollWidth` against `innerWidth` rather than judged from an image. Measured that way, every page returns equal values at 390, 768 and 1440.

**The CSS was kept.** `min-width: 0` on flex children is correct regardless, and reverting sound code to score a point about provenance would be its own mistake. What changed is that the comment in the file no longer claims it repaired something.

**The rule taken from this:** a screenshot is evidence about the renderer as much as about the page. Before trusting one as a bug report, confirm the tool measured what it was asked to measure.

---

## 2026-08-05 — Photographs live outside the repository

The portfolio is built from 24 photographs that are not in this repository and never have been. They are fetched during the build, optimised into `dist`, and served from the site's own origin.

**Why not simply commit them.** The repository is public and the photographs are not licensed for redistribution. Git history is permanent: committing them and deleting them later leaves them fully recoverable at the earlier commit, and anyone who cloned in between keeps a copy regardless. There is no version of "add now, remove if the answer is no" that works.

**Why this costs a build script rather than a rewrite.** The content model was designed for it. Each frame is a markdown entry whose `src` is resolved at build time, so the source of the file is a configuration value rather than a structural assumption. Narrowing the licence changes where `PHOTO_SOURCE` points and nothing else.

**The fetch fails the build rather than degrading.** A portfolio that compiles green with no photographs in it would be a worse outcome than one that refuses to compile, so a missing file is a hard error. The script also checks JPEG magic bytes rather than trusting the status code, because static hosts commonly answer 200 with an HTML error page for a missing asset, and that would otherwise be written to disk as a "photograph".

**Curation was carried across, not regenerated.** The order, alt text and category of every frame come from the existing site. The ordering is not arbitrary: it interleaves so that two shirtless frames never sit adjacent while a clothed frame is still unplaced. Sorting by filename would have discarded that silently. Order values step by ten so a frame can be inserted later without renumbering the set.

**Known and deliberate: `PHOTO_SOURCE` is temporary.** It currently points at the live site, which serves these files today. The cutover replaces that site, so the source must move to durable private storage before then. This is recorded rather than left implicit, because the failure it would otherwise cause arrives at the worst possible moment and looks like the cutover broke the build.
