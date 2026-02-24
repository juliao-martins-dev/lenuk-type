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
- ⏳ Results persistence + leaderboard routes


## Vercel deploy note (Next.js CVE block)

If Vercel reports `Vulnerable version of Next.js detected`, ensure:

1. `next` is pinned to a patched version in `package.json` (this repo pins `15.5.4`).
2. `eslint-config-next` matches the same major/minor patch line.
3. You redeploy the **latest commit** and clear old build cache once in Vercel.
