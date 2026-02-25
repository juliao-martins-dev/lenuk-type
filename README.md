<div align="center">

# ❄️ LENUK TYPE
### *Type like a builder. Move like a machine.*

<p>
  <img src="https://img.shields.io/badge/Next.js-App%20Router-000000?logo=nextdotjs" alt="Next.js" />
  <img src="https://img.shields.io/badge/TypeScript-Strict-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/TailwindCSS-Modern-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind" />
  <img src="https://img.shields.io/badge/Vercel-Production-000000?logo=vercel" alt="Vercel" />
</p>

**A dark, premium, AI-assisted typing arena for developers.**

</div>

---

## 🧊 Why this project feels different

Lenuk Type is inspired by Monkeytype, but tuned for developer flow:
- short, high-signal typing sessions
- code-aware practice
- live performance feedback
- server-side persistence to a real leaderboard

It is designed to feel **cold, fast, and competitive** from the first click.

---

## ✨ Core Experience

- ⚡ **High-performance typing engine** with smooth keystroke handling
- 🎯 **Live stats**: WPM, raw WPM, accuracy, errors, countdown
- 👤 **First-visit username onboarding** + persistent user identity
- 🎉 **Completion celebration** with firework/clap vibe
- 🏆 **Live leaderboard** with auto-refresh and recent runs
- 📊 **Result persistence** to Google Sheets through SheetDB

---

## 🔐 Security-First Architecture

Sensitive operations are server-only via Next.js route handlers:

- `POST /api/results` → validate payload + save to SheetDB
- `GET /api/results` → fetch + normalize + sort leaderboard data

✅ Browser never calls SheetDB directly.

---

## 🧱 Tech Stack

- **Next.js** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **shadcn-inspired UI primitives**
- **SheetDB** (Google Sheets API layer)
- **Vercel** deployment

---

## ⚙️ Local Setup

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

## ⚡ 30-Second Demo Flow

1. Open the app and enter your name (first time only)
2. Select mode + duration
3. Complete a typing run
4. Watch your run auto-save
5. Open `/leaderboard` and see your rank live

---

## 🌐 Routes

- `/` → main typing game
- `/leaderboard` → live ranking board
- `/api/results` → server route for result save/fetch

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

## 🛣️ Roadmap

- [x] Core typing engine
- [x] Username onboarding + profile chip
- [x] SheetDB persistence + live leaderboard
- [x] Finish celebration UX
- [ ] AI challenge generation (`/api/generate-challenge`)
- [ ] Per-user history and filters
- [ ] Daily challenge mode

---

## 🧠 Vision

Lenuk Type is built to make typing practice feel like a modern dev tool:
**minimal UI, maximum signal, instant competitive feedback**.

If someone visits this repo, they should instantly feel:
> **clean architecture. fast product. serious execution.**