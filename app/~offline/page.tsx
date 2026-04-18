import Link from "next/link";

export const metadata = {
  title: "Offline",
};

export default function OfflinePage() {
  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
        You&apos;re offline
      </h1>
      <p className="max-w-md text-sm text-[hsl(var(--sub))]">
        No internet right now — but the typing arena is cached, so you can keep
        practicing. Runs you finish while offline save to your local stats and
        will sync to the leaderboard next time you&apos;re online.
      </p>
      <Link
        href="/"
        className="mt-2 inline-flex items-center gap-2 rounded-xl border border-[hsl(var(--caret))]/50 bg-[hsl(var(--caret))]/10 px-5 py-2.5 text-sm font-bold uppercase tracking-wider text-[hsl(var(--caret))] transition hover:bg-[hsl(var(--caret))]/20"
      >
        Start typing
      </Link>
    </main>
  );
}
