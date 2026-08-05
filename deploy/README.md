# Deploying this site

Operational doc. Everything here is true today, not a plan.

## What serves it

A **Cloudflare Workers static-assets deployment**. No `main`, no Worker script, no bindings: nothing
runs at request time. A visitor gets HTML, CSS and images from Cloudflare's edge, and there is no
server process anywhere to patch or restart.

`wrangler.jsonc` in this directory is the whole configuration. Two of its settings are load-bearing
rather than cosmetic:

- `not_found_handling: "404-page"` serves a real 404 instead of an SPA-style fallback. Without it,
  every unknown path would quietly return the homepage, which is how a site ends up with dozens of
  URLs that all look alive to a crawler and say nothing to a human.
- `html_handling: "auto-trailing-slash"` is what makes the inherited URLs resolve. The pages indexed
  from the previous version of this site carry no trailing slash, and this setting is the reason they
  still land.

**The Worker name is load-bearing.** The custom domain is bound to the *name*, so a deploy under a
different name creates a second Worker and silently leaves the domain pointing at the old one. This is
why the staging path overrides the name on the command line and never edits `wrangler.jsonc`.

## Staging and production

Two repository variables have to be right before the live site can move. That is deliberate.

| Variable | Effect |
|---|---|
| `DEPLOY_ENABLED` | Master switch. Unless it is `true`, the deploy job skips entirely and only the build runs. |
| `DEPLOY_TARGET` | `production` publishes to the live Worker. **Anything else, including unset, goes to staging.** |
| `STAGING_WORKER_NAME` | Staging Worker name. Defaults to `shaheenkiarash-staging`. |
| `STAGING_URL` | Where the post-deploy checks run against on staging. If unset, the checks are **skipped and the run says so loudly** rather than passing silently. |
| `SITE_URL` | Production check target. Defaults to the live apex. |

Staging is the default because the production Worker is the one serving the real portfolio. Before
this split existed, enabling deploys for the first time would have published a placeholder over a live
site. A guard also refuses any production deploy whose build still carries `noindex`, so the
placeholder cannot reach the apex even if both variables are set by mistake.

## Credentials

One secret, `CLOUDFLARE_API_TOKEN`, scoped to **Workers Scripts: Edit** and nothing more, plus
`CLOUDFLARE_ACCOUNT_ID`. Both live in GitHub Actions secrets in a protected environment. **No token,
key or account identifier is committed to this repository, and none ever will be** — it is public, so
this is a property of the design rather than a rule someone has to remember.

The account and zone identifiers are deliberately not written here either. They are operational
values kept outside this repo.

## To deploy a change

Push to `main`. That is the whole procedure.

CI builds the site, runs the guard that fails if any image over 2MB reached `dist/` (this repo carries
web-sized masters only; full-resolution originals live in private storage), deploys to the resolved
target, and then verifies. Verification is not optional and not a formality:

1. The homepage returns real HTML.
2. A path that must 404 still 404s, which catches a fallback silently serving the homepage.
3. The redirect map is actually in force.
4. The `og:image` share card is present, because a missing one is invisible until someone pastes the
   link somewhere and it looks broken.

"It uploaded" is not "it works". A deploy that uploads and fails these checks is a failed deploy.

## Rollback

Fastest path is the Cloudflare dashboard: the Worker, then Deployments, then pick a previous version
and roll back. The command-line equivalent is `wrangler rollback --name <worker-name> <version-id>`.

Every deploy is a version, so rollback is always available and does not depend on this repository
being in any particular state.

## Two things this project never touches

- **DNS and MX on the zone.** The zone carries a live email address, so no record change is part of
  this project under any circumstances.
- **Full-resolution originals.** They stay in private storage. If the photographer's grant is ever
  narrowed, the masters move to a build-time fetch and this repository stays public and unchanged in
  structure. That was designed in so a "no" costs a configuration change rather than a rebuild.
