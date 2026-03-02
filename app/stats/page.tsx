import dynamic from "next/dynamic";
import { Suspense } from "react";

const UserStatsClient = dynamic(() => import("@/components/stats/user-stats-client"), {
  loading: () => (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4">
      <div className="rounded-2xl border border-border/60 bg-card/70 px-6 py-10 text-center shadow-lg">
        <p className="text-sm text-muted-foreground">Loading your local stats…</p>
      </div>
    </main>
  )
});

export default function StatsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" aria-busy="true" />}>
      <UserStatsClient />
    </Suspense>
  );
}
