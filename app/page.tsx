import dynamic from "next/dynamic";
import { Suspense } from "react";

const TypingSurface = dynamic(() => import("@/components/typing/typing-surface"), {
  loading: () => (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center px-4">
      <div className="rounded-2xl border border-border/60 bg-card/70 px-6 py-10 text-center shadow-lg">
        <p className="text-sm text-muted-foreground">Loading typing experience…</p>
      </div>
    </main>
  )
});

export default function HomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" aria-busy="true" />}>
      <TypingSurface />
    </Suspense>
  );
}
