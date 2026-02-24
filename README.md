# lenuk-type

AI-assisted typing game built with Next.js App Router and TypeScript.

## Quick start

1. Install dependencies:
   ```bash
   npm install
   ```
2. Run development server:
   ```bash
   npm run dev
   ```
3. Open `http://localhost:3000`.

## Current status

- ✅ Phase 1 typing engine (high-performance ref-driven engine)
- ⏳ AI challenge generation route
- ✅ Results persistence + leaderboard routes

## Vercel deploy note (Next.js CVE block)

If Vercel reports `Vulnerable version of Next.js detected`, ensure:

1. `next` is pinned to a patched version in `package.json` (this repo pins `15.5.9`).
2. `eslint-config-next` matches the same exact patch line.
3. You redeploy the **latest commit** and clear old build cache once in Vercel (Project Settings → Build & Development Settings → Clear Cache, then redeploy).


## API routes

- `POST /api/results`: validates and saves finished runs to SheetDB server-side.
- `GET /api/results`: fetches latest rows from SheetDB, sorts by WPM desc, returns top 50.
- `GET /leaderboard`: live leaderboard page that auto-refreshes every 5 seconds.
