<div align="center">

# ❄️ Lenuk Type

### *AI-assisted typing game for developers — speed, accuracy, and flow.*

[![Next.js](https://img.shields.io/badge/Next.js-App%20Router-000000?logo=nextdotjs)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.x-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?logo=vercel)](https://vercel.com/)

</div>

---

## ✨ What is Lenuk Type?

Lenuk Type is a modern Monkeytype-inspired typing game focused on **developer fluency**.
It combines a performant typing engine with result persistence and a live leaderboard so every run feels competitive.

---

## 🚀 Highlights

- ⚡ High-performance typing engine (optimized for smooth keystrokes)
- 🎯 Live metrics: WPM, raw WPM, accuracy, errors, time left
- 🧠 Modes for text and code typing practice
- 👤 First-visit username onboarding + persistent player identity
- 🎉 Finish celebration overlay (fire/clap + fireworks effect)
- 📊 Server-side result persistence to Google Sheets via SheetDB
- 🏆 Live leaderboard page with periodic refresh

---

## 🧱 Tech Stack

- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Styling:** TailwindCSS
- **UI:** lightweight shadcn-inspired component primitives
- **Data:** Google Sheets via SheetDB API
- **Deployment:** Vercel

---

## 🔐 Security Architecture (Important)

External APIs are called **server-side only** through route handlers:

- `POST /api/results` → validates payload + writes to SheetDB
- `GET /api/results` → fetches latest rows for leaderboard

The browser calls only internal routes (`/api/*`) and never talks directly to SheetDB.

---

## 📂 Project Structure

```text
app/
  api/results/route.ts
  leaderboard/page.tsx
  layout.tsx
  page.tsx
hooks/
  use-typing-engine.ts
lib/
  engine/typing-engine.ts
  sheetdb.ts
components/ui/
  button.tsx card.tsx tabs.tsx select.tsx tooltip.tsx progress.tsx
```

---

## ⚙️ Getting Started

```bash
npm install
npm run dev
```

Open: `http://localhost:3000`

Production build:

```bash
npm run build
npm start
```

---


## ⚡ Quick Demo Flow

1. Enter your name on first visit
2. Start typing (text/code mode)
3. Finish run and auto-save result
4. Open `/leaderboard` to see live ranking updates

---

## 🌐 Pages

- `/` → typing game
- `/leaderboard` → live ranked results view

---

## 🛣️ Roadmap

- [x] Core typing engine
- [x] SheetDB persistence + leaderboard
- [x] User onboarding + celebration UX
- [ ] AI challenge generation route (`/api/generate-challenge`)
- [ ] Advanced filtering/history per user

---

## 🧊 Vibe Goal

This repo is built to feel **clean, dark, fast, and competitive** —
so whether someone visits the app, reads the docs, or explores the code, it feels instantly polished.

