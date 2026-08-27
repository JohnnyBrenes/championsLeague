# Deploy: Cloudflare Pages

This app is a **fully static** Next.js site: every page is prerendered from the
committed `data/*.json`, so there is no server, no database and nothing to render at
request time. `npm run build` produces `./out`, which any static host can serve.

We host on **Cloudflare Pages** (free tier: unlimited sites and bandwidth).

## One-time setup

1. **Create a Cloudflare account** at <https://dash.cloudflare.com> (free, no card).
2. **Workers & Pages** → **Create** → **Pages** → **Connect to Git** → authorize
   GitHub and pick `JohnnyBrenes/championsLeague`.
3. **Build settings**:

   | Field | Value |
   |---|---|
   | Framework preset | Next.js (Static HTML Export) |
   | Build command | `npm run build` |
   | Build output directory | `out` |
   | Environment variable | `NODE_VERSION` = `22` |

   **No API token is needed here.** The data is committed to the repo; the
   `FOOTBALL_DATA_TOKEN` is only used by the GitHub Action, never by the build.
4. **Save and Deploy** (~1–2 min). The site goes live at
   `https://<project>.pages.dev`.

## How updates flow

```
GitHub Action (cron)  →  sync-data.mjs  →  data/*.json changed?
                                              │ yes
                                              ▼
                                     commit & push to main
                                              │
                                              ▼
                              Cloudflare Pages rebuilds & deploys
```

- Any push to `main` triggers a rebuild; every branch gets a preview URL.
- On match nights the Action polls hourly and commits only when a score actually
  changed, so results appear within ~1 h of the final whistle.
- Free tier allows **500 builds/month**. Champions League plays ~2 days a week, so
  we are far from that ceiling.

## Install on a phone (PWA)

- iPhone: open the URL in **Safari** → **Share** → **Add to Home Screen**.
- Android: open in **Chrome** → menu → **Install app**.

## Constraints to respect

The static export is what makes free hosting possible. It breaks if anyone adds:

- route handlers (`app/**/route.ts`) that are not `export const dynamic = "force-static"`
- server actions, `cookies()`, `headers()`, `revalidate` / ISR
- `next/image` optimization (we set `images: { unoptimized: true }`)
- `@vercel/*` packages — they only work on Vercel

`app/manifest.ts` is a route handler and therefore carries an explicit
`export const dynamic = "force-static"`. Keep it.

## Local check before pushing

```bash
npm run build     # must pass; writes ./out
npx serve out     # optional: preview the exported site
```

## Alternative: deploy from the workflow

Avoids depending on the Git integration and deploys right after a data commit. Add to
the end of `.github/workflows/update-results.yml`:

```yaml
      - run: npm ci && npm run build
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy out --project-name=<project>
```

Requires an API token with the *Cloudflare Pages: Edit* permission.

## Other free options

See `CHAMPIONS_MIGRATION.md` §8.5 for the comparison with GitHub Pages, Netlify and
Render. Note that GitHub Pages would additionally need
`basePath: "/championsLeague"` unless a custom domain is used.
