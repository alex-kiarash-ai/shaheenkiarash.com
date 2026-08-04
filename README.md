# shaheenkiarash.com

Modeling portfolio for Shaheen Kiarash.

> **Licensing, before anything else: the code is MIT, the photographs are not.**
> Every image here is All Rights Reserved and excluded from the licence. See [`LICENSE`](LICENSE) and [`LICENSE-photos.md`](LICENSE-photos.md). A public repository shows how the site is built; it does not release its contents.

Built with Astro and TypeScript, compiled to static HTML and CSS, served from Cloudflare's edge, deployed automatically by GitHub Actions.

Every word of that sentence is something I can explain in depth. That is the standard the project is held to, and it is why this repository is public: the build is part of the work.

## Build time versus runtime

All the TypeScript runs **once**, on the GitHub runner, when a commit lands on `main`. It reads the content files, generates responsive image variants from one master per photo, assembles the pages, and emits a `dist/` folder of plain HTML, CSS and images. That folder is what gets served.

Nothing dynamic runs at request time. There is no server, no container, no database, and no code path a visitor can reach. That is a deliberate choice rather than a limitation: for a four-page portfolio it is faster, cheaper, and there is nothing to patch.

## Layout

```
.github/workflows/deploy.yml   build, guard, deploy, then verify the deploy
deploy/wrangler.jsonc          Cloudflare static-assets config; the worker name is load-bearing
deploy/README.md               how the serving side is wired, and how to roll back
docs/architecture.md           what the system is and why
docs/decisions.md              one entry per decision, written as they happen
public/_redirects              301s for the URLs the v1 scope retired
src/content/portfolio/         one markdown entry per photo: order, alt, tags
src/assets/photos/             ~2400px web masters ONLY. Originals live in private storage
```

## Why not self-hosted

The original plan put this on a Hetzner VPS, because self-hosting is a good interview story. It was evaluated and rejected.

That box runs production automation, and its ports 80 and 443 are already held by the reverse proxy in front of it, so "a static folder behind the existing proxy" would have meant editing and restarting the container fronting live services. The domain also carries the contact address for this site through Cloudflare Email Routing, so repointing the apex would have put working email at risk for no visitor-facing gain.

Keeping a public surface off production infrastructure is the more defensible engineering decision, and it is a better answer in an interview than a virtual host file. The reasoning is in [`docs/decisions.md`](docs/decisions.md).

## Local development

```bash
npm ci
npm run dev      # local dev server
npm run build    # emit dist/
npm run preview  # serve the built output
```

## Deployment

Push to `main`. The workflow builds, refuses to ship an oversized image, deploys to Cloudflare, then verifies the live site: the homepage returns real HTML, a path that must 404 still does, the redirect map is in force, and the share card exists. A deploy that uploads successfully but serves the wrong thing fails the run.

Rollback is `wrangler rollback` against the previous version. Version history and IDs are in [`deploy/README.md`](deploy/README.md).
