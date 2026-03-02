"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  Clock3,
  Download,
  Home,
  RefreshCw,
  ShieldCheck,
  Target,
  Trophy,
  TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CountryFlag } from "@/components/ui/country-flag";
import { clearUserStats, readUserStats, type StoredRun, type UserStats } from "@/lib/user-stats";
import { SiteCreditsFooter } from "../ui/site-credits-footer";

function getStoredProfile() {
  if (typeof window === "undefined") return { name: "", country: "" };
  return {
    name: localStorage.getItem("lenuk-user-name") ?? "",
    country: localStorage.getItem("lenuk-user-country") ?? ""
  };
}

function formatDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || hours > 0) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);
  return parts.join(" ");
}

function formatDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

function buildView(stats: UserStats | null) {
  const safe = stats ?? {
    totals: {
      testsStarted: 0,
      testsCompleted: 0,
      timeTypingSeconds: 0,
      typedChars: 0,
      correctChars: 0,
      errors: 0
    },
    bestOverall: null,
    bestByDuration: { 15: null, 30: null, 60: null },
    recentRuns: [],
    createdAt: "",
    updatedAt: "",
    profile: { name: "", country: "" }
  };

  const runs = safe.recentRuns ?? [];
  const avgWpm = average(runs.map((run) => run.wpm));
  const avgAccuracy = average(runs.map((run) => run.accuracy));
  const maxRecentWpm = runs.length > 0 ? Math.max(...runs.map((run) => run.wpm)) : 0;
  const completionRate =
    safe.totals.testsStarted > 0 ? Math.min(100, Math.round((safe.totals.testsCompleted / safe.totals.testsStarted) * 100)) : 0;

  return {
    stats: safe,
    avgWpm,
    avgAccuracy,
    maxRecentWpm,
    completionRate,
    durationCards: [
      { label: "15s sprint", run: safe.bestByDuration[15] ?? null },
      { label: "30s focus", run: safe.bestByDuration[30] ?? null },
      { label: "60s endurance", run: safe.bestByDuration[60] ?? null }
    ],
    chartRuns: runs.slice(0, 22).reverse()
  };
}

export default function UserStatsClient() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [profile, setProfile] = useState(() => getStoredProfile());

  useEffect(() => {
    const load = () => {
      setStats(readUserStats());
      setProfile(getStoredProfile());
    };

    load();
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === "lenuk-user-stats-v1" || event.key.startsWith("lenuk-user-")) {
        load();
      }
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const view = useMemo(() => buildView(stats), [stats]);

  const handleReset = () => {
    clearUserStats();
    setStats(readUserStats());
  };

  const handleExport = () => {
    if (!stats) return;
    const blob = new Blob([JSON.stringify(stats, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "lenuktype-user-stats.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  const hasRuns = (stats?.recentRuns.length ?? 0) > 0;

  return (
    <main className="relative mx-auto min-h-screen w-full max-w-6xl px-4 py-8 md:py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_12%_10%,hsl(var(--primary)/0.18),transparent_34%),radial-gradient(circle_at_86%_6%,hsl(var(--primary)/0.16),transparent_30%),linear-gradient(transparent_92%,hsl(var(--primary)/0.05)_100%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,hsl(var(--border)/0.25)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.25)_1px,transparent_1px)] bg-[size:54px_54px] [mask-image:radial-gradient(circle_at_center,black,transparent_78%)]"
      />

      <div className="space-y-5 md:space-y-6">
        <Card className="relative overflow-hidden border border-border/80 bg-card/82 shadow-2xl shadow-black/10 backdrop-blur">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_-16%,hsl(var(--primary)/0.2),transparent_42%),radial-gradient(circle_at_100%_0,hsl(var(--primary)/0.14),transparent_30%)]"
          />
          <CardContent className="relative space-y-4 p-5 md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 rounded-full border bg-background/60 px-3 py-1 text-xs text-muted-foreground">
                  <BarChart3 className="h-3.5 w-3.5 text-primary" />
                  User stats
                </div>
                <div className="flex items-center gap-3 text-2xl font-semibold tracking-tight md:text-3xl">
                  <span>{profile.name || "Guest typist"}</span>
                  {profile.country ? <CountryFlag code={profile.country} className="shadow-sm" /> : null}
                </div>
                <p className="max-w-2xl text-sm text-muted-foreground">
                  Personal bests and history stay on this device only. Complete runs to grow your Lenuk Type profile without creating an account.
                </p>
                <p className="text-xs text-muted-foreground/90">
                  Last updated: {view.stats.updatedAt ? formatDate(view.stats.updatedAt) : "waiting for first run"}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2">
                <Link
                  href="/"
                  className="group inline-flex h-10 items-center gap-2 rounded-md border border-border/80 bg-background/80 px-3 text-sm font-medium transition hover:border-primary/50 hover:text-primary"
                >
                  <Home className="h-4 w-4" />
                  Back to typing
                </Link>
                <Button variant="ghost" className="h-10 px-3" onClick={handleExport} disabled={!hasRuns}>
                  <Download className="mr-2 h-4 w-4" />
                  Export JSON
                </Button>
                <Button variant="ghost" className="h-10 px-3 text-destructive" onClick={handleReset}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reset stats
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatTile icon={<Activity className="h-4 w-4" />} label="Tests started" value={view.stats.totals.testsStarted} />
              <StatTile icon={<Trophy className="h-4 w-4" />} label="Tests completed" value={view.stats.totals.testsCompleted} />
              <StatTile icon={<Clock3 className="h-4 w-4" />} label="Time typing" value={formatDuration(view.stats.totals.timeTypingSeconds)} />
              <StatTile icon={<ShieldCheck className="h-4 w-4" />} label="Completion rate" value={`${view.completionRate}%`} />
              <StatTile icon={<TrendingUp className="h-4 w-4" />} label="Best WPM" value={view.stats.bestOverall?.wpm ?? 0} />
              <StatTile icon={<Target className="h-4 w-4" />} label="Best accuracy" value={`${view.stats.bestOverall?.accuracy ?? 0}%`} />
              <StatTile icon={<Activity className="h-4 w-4" />} label="Avg WPM (last runs)" value={view.avgWpm} />
              <StatTile icon={<ShieldCheck className="h-4 w-4" />} label="Avg accuracy" value={`${view.avgAccuracy}%`} />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 bg-card/82 shadow-xl shadow-black/5 backdrop-blur">
          <CardContent className="space-y-3 p-4 md:p-5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-lg font-semibold tracking-tight">Best by duration</p>
                <p className="text-sm text-muted-foreground">Your top finished runs for each timer length.</p>
              </div>
              <Link href="/" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
                <ArrowLeft className="h-4 w-4" />
                Start another run
              </Link>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {view.durationCards.map(({ label, run }) => (
                <DurationCard key={label} label={label} run={run} />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 bg-card/80 shadow-xl shadow-black/5 backdrop-blur">
          <CardContent className="space-y-4 p-4 md:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-lg font-semibold tracking-tight">Recent runs</p>
                <p className="text-sm text-muted-foreground">Stored locally. Latest on the right.</p>
              </div>
              {!hasRuns ? null : (
                <p className="text-xs text-muted-foreground">
                  Showing last {view.chartRuns.length} of {stats?.recentRuns.length ?? 0} runs
                </p>
              )}
            </div>

            {hasRuns ? (
              <div className="space-y-4">
                <div className="relative h-44 rounded-xl border border-border/70 bg-background/60 p-3">
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.18)_1px,transparent_1px)] bg-[size:36px_1px]" aria-hidden />
                  <div className="absolute inset-0 bg-[linear-gradient(to_top,hsl(var(--border)/0.16)_1px,transparent_1px)] bg-[size:1px_32px]" aria-hidden />
                  <div className="relative flex h-full items-end justify-between gap-1">
                    {view.chartRuns.map((run, index) => {
                      const heightPercent = view.maxRecentWpm > 0 ? Math.max(4, Math.round((run.wpm / view.maxRecentWpm) * 100)) : 4;
                      return (
                        <div key={`${run.id}-${index}`} className="group relative flex-1">
                          <div
                            className="mx-auto w-full max-w-[18px] rounded-full bg-gradient-to-t from-primary/60 via-primary/80 to-primary shadow-sm shadow-primary/30 transition duration-150 group-hover:shadow-primary/50"
                            style={{ height: `${heightPercent}%` }}
                            aria-label={`${run.wpm} WPM`}
                          />
                          <div className="absolute -top-6 left-1/2 w-max -translate-x-1/2 rounded-md border bg-background/90 px-2 py-1 text-xs opacity-0 shadow-md transition group-hover:opacity-100">
                            <span className="font-semibold tabular-nums">{run.wpm}</span> wpm
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="overflow-auto rounded-xl border border-border/70 bg-background/70">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="bg-card/90">
                      <tr className="border-b">
                        <Th>When</Th>
                        <Th>Mode</Th>
                        <Th>Difficulty</Th>
                        <Th align="right">WPM</Th>
                        <Th align="right">Accuracy</Th>
                        <Th align="right">Errors</Th>
                        <Th align="right">Duration</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {view.chartRuns
                        .slice()
                        .reverse()
                        .map((run) => (
                          <tr key={run.id} className="border-b last:border-0">
                            <Td>{formatDate(run.at)}</Td>
                            <Td className="capitalize">{run.mode}</Td>
                            <Td className="capitalize">{run.difficulty}</Td>
                            <Td align="right" className="tabular-nums">
                              {run.wpm}
                            </Td>
                            <Td align="right" className="tabular-nums">
                              {run.accuracy}%
                            </Td>
                            <Td align="right" className="tabular-nums">
                              {run.errors}
                            </Td>
                            <Td align="right" className="tabular-nums">
                              {run.durationSeconds}s
                            </Td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/80 bg-background/60 px-4 py-10 text-center">
                <BarChart3 className="h-8 w-8 text-muted-foreground" />
                <p className="text-base font-semibold">No runs yet</p>
                <p className="max-w-md text-sm text-muted-foreground">
                  Start a typing run to see your personal stats. They are stored in your browser and never leave this device.
                </p>
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm font-semibold text-primary transition hover:bg-primary/15"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to typing zone
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border border-border/80 bg-card/80 shadow-md shadow-black/5 backdrop-blur">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4 md:p-5">
            <div>
              <p className="text-base font-semibold">Privacy first</p>
              <p className="text-sm text-muted-foreground">
                Everything on this page is saved in your browser&apos;s local storage. Clearing your browser data will delete it.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-300">
                <ShieldCheck className="h-3.5 w-3.5" />
                Local only
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/70 px-3 py-1 text-xs text-muted-foreground">
                <Download className="h-3.5 w-3.5" />
                Export anytime
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <SiteCreditsFooter className="mt-5" />
    </main>
  );
}

function StatTile({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl border bg-background/45 p-3 shadow-sm backdrop-blur">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="text-primary">{icon}</span>
        <span>{label}</span>
      </div>
      <p className="mt-2 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function DurationCard({ label, run }: { label: string; run: StoredRun | null }) {
  return (
    <div className="rounded-xl border border-border/70 bg-background/65 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">{label}</p>
        {run ? <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">PB</span> : null}
      </div>
      {run ? (
        <div className="mt-3 space-y-1 text-sm">
          <p className="flex items-center justify-between">
            <span className="text-muted-foreground">WPM</span>
            <span className="font-semibold tabular-nums">{run.wpm}</span>
          </p>
          <p className="flex items-center justify-between">
            <span className="text-muted-foreground">Accuracy</span>
            <span className="font-semibold tabular-nums">{run.accuracy}%</span>
          </p>
          <p className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{formatDate(run.at)}</span>
            <span>{run.durationSeconds}s • {run.difficulty}</span>
          </p>
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">Finish a run to set a personal best.</p>
      )}
    </div>
  );
}

function Th({ children, align = "left" }: { children: ReactNode; align?: "left" | "right" }) {
  return (
    <th
      className={`px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function Td({ children, align = "left", className }: { children: ReactNode; align?: "left" | "right"; className?: string }) {
  return <td className={`px-3 py-2 align-middle ${align === "right" ? "text-right" : "text-left"} ${className ?? ""}`}>{children}</td>;
}
