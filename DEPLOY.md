# Deploy: Vercel

This app is a **fully static** Next.js site: every page is prerendered from the
committed `data/*.json`, so there is no server, no database and nothing to render at
request time. `npm run build` produces `./out`, which Vercel serves from its CDN.

Hosting is free on Vercel's **Hobby** plan (non-commercial use only).

## One-time setup

1. **Sign in** at <https://vercel.com> with GitHub.
2. **Add New… → Project** (or <https://vercel.com/new>), pick
   `JohnnyBrenes/championsLeague` and click **Import**.
   - If it isn't listed, use **Adjust GitHub App Permissions** to grant access.
   - Hobby can only connect **personal** repos, not repos owned by a GitHub
     organization. This one is personal, so it's fine.
3. **Configure** — nothing to change. Framework Preset is auto-detected as Next.js
   and the static export is picked up automatically.
   - **Environment Variables: leave empty.** The data is committed to the repo; the
     `FOOTBALL_DATA_TOKEN` is only used by the GitHub Action, never by the build.
4. **Deploy** (~1–2 min). Live at `https://<project>.vercel.app`.

## How updates flow

```
GitHub Action (cron)  →  sync-data.mjs  →  data/*.json changed?
                                              │ yes
                                              ▼
                                     commit & push to main
                                              │
                                              ▼
                                    Vercel rebuilds & deploys
```

- Any push to `main` triggers a redeploy; every branch gets a preview URL.
- On match nights the Action polls hourly and commits only when a score actually
  changed, so results appear within ~1 h of the final whistle.
- Hobby allows **100 deployments/day** — far above what a couple of match nights a
  week produce.

## Install on a phone (PWA)

- iPhone: open the URL in **Safari** → **Share** → **Add to Home Screen**.
- Android: open in **Chrome** → menu → **Install app**.

## Why the site is still a static export

`next.config.ts` sets `output: "export"` even though Vercel could run a server. That
is deliberate:

- Every page is built from committed JSON, so there is nothing to compute per request.
- It keeps the site **portable** — the same `out/` folder deploys to Cloudflare Pages,
  Netlify or GitHub Pages if we ever need to move (see `CHAMPIONS_MIGRATION.md` §8.5).
- It fails the build early if someone adds a server feature by accident.

Consequences to respect:

- No route handlers (`app/**/route.ts`) unless they declare
  `export const dynamic = "force-static"`.
- No server actions, `cookies()`, `headers()`, `revalidate` / ISR.
- No `next/image` optimization — we set `images: { unoptimized: true }`. Club crests
  are small local PNGs, so there is nothing to gain from the optimizer.

`app/manifest.ts` is a route handler and therefore carries an explicit
`export const dynamic = "force-static"`. **Keep it** — without it the build fails with
`export const dynamic not configured on route "/manifest.webmanifest"`.

## Analytics

`@vercel/analytics` is wired into `app/layout.tsx` and works with the static export.
Enable it in the Vercel dashboard under **Analytics**. It is the one Vercel-specific
dependency in the project; dropping it is a two-line change if we ever move hosts.

## Local check before pushing

```bash
npm run build     # must pass; writes ./out
npx serve out     # optional: preview the exported site
```

## Alternative: Vercel CLI

```bash
npm i -g vercel
vercel login
vercel          # preview deploy
vercel --prod   # production deploy
```
