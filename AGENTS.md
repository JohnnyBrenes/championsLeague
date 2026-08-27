<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project

A bilingual (ES/EN) PWA showing the **UEFA Champions League 2026/27** calendar:
league phase table, fixtures, clubs, top scorers and the knockout bracket.

> **Migration in progress.** This repo is a fork of a World Cup 2026 calendar and
> most of the code still models a World Cup (groups A–L, 48 national teams, flag
> emoji, best-third qualification, single-leg knockouts). **Read
> `CHAMPIONS_MIGRATION.md` before touching `lib/`, `data/` or `scripts/`** — it is
> the source of truth for the target data model and the order of the work.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 (`@theme` tokens in
`app/globals.css`, no `tailwind.config`) · static site, no server code.

## Commands

```bash
npm run dev      # dev server (the .claude/launch.json profile uses port 3001)
npm run build    # production build — must pass before any commit
npm run lint     # eslint
npm run sync     # pull fresh data from the API into data/*.json
```

`npm run sync` needs `FOOTBALL_DATA_TOKEN` in the environment or in `.env.local`
(git-ignored). Never commit the token; in CI it comes from a GitHub Actions secret.

## Architecture

- `data/*.json` — the entire dataset, committed to the repo. There is no database
  and no runtime fetching: pages import JSON directly, so **a data refresh is a
  git commit**, which is what triggers a redeploy.
- `scripts/sync-data.mjs` — the only writer of `data/`. Fetches football-data.org,
  maps it to `lib/types.ts` and rewrites the JSON. It must stay **idempotent** and
  must never replace good committed data with an empty/partial response — keep the
  retry + fallback guards when editing it.
- `.github/workflows/update-results.yml` — runs the sync on a schedule and commits
  only when `data/` actually changed.
- `lib/` — pure logic (`standings.ts`, `bracket.ts`, `time.ts`) with no React;
  `lib/data.ts` is the single accessor for teams/matches.
- `components/` + `app/` — presentation only. All user-facing strings go through
  `useI18n()` / `locales/{es,en}.json`; never hardcode copy in a component.

## Conventions

- Keep comments explaining **why** (upstream quirks, format rules), not what.
- Every new UI string needs a key in **both** `locales/es.json` and `locales/en.json`.
- Times are stored as UTC ISO strings and formatted only through `lib/time.ts`.
- The app must build as a fully static export (`output: "export"`) — no server
  actions, route handlers, `cookies()`/`headers()`, or ISR.
- Trademark hygiene (see `CHAMPIONS_MIGRATION.md` §6.1): never reproduce the UEFA
  or Champions League logo, the "starball", the official wordmark or typeface. The
  visual identity is our own "European night" theme; the competition is referred to
  in plain descriptive text only. Club crests are used small and informational, and
  the footer keeps the "unofficial / not affiliated" disclaimer.

## Deploy

Vercel (Hobby plan), building the static export from `main`. See `DEPLOY.md`. The
export is kept deliberately host-agnostic: `@vercel/analytics` is the only
Vercel-specific dependency, so the same `out/` folder can move to another host.
