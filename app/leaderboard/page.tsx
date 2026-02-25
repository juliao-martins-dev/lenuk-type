"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Activity, Clock3, Target, Trophy, User, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { CountryFlag } from "@/components/ui/country-flag";
import { countryName } from "@/lib/countries";

interface LeaderboardItem {
  id: string;
  createdAt: string;
  userId: string;
  userName: string;
  country: string;
  mode: string;
  difficulty: string;
  durationSeconds: number;
  wpm: number;
  rawWpm: number;
  accuracy: number;
  errors: number;
}

type LeaderboardStatus = "loading" | "live" | "error";

const POLL_INTERVAL_MS = 5000;

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function getStatusBadgeClasses(status: LeaderboardStatus) {
  if (status === "live") {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300";
  }

  if (status === "error") {
    return "border-destructive/20 bg-destructive/10 text-destructive";
  }

  return "border-border/80 bg-background/70 text-muted-foreground";
}

function getModeChipClasses(mode: string) {
  return mode === "code"
    ? "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300"
    : "border-primary/20 bg-primary/10 text-primary";
}

function getDifficultyChipClasses(difficulty: string) {
  if (difficulty === "hard") {
    return "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300";
  }

  if (difficulty === "medium") {
    return "border-orange-500/20 bg-orange-500/10 text-orange-700 dark:text-orange-300";
  }

  return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
}

function rankPillClasses(rank: number) {
  if (rank === 1) {
    return "border-yellow-500/25 bg-yellow-500/10 text-yellow-700 dark:text-yellow-300";
  }

  if (rank === 2) {
    return "border-slate-400/25 bg-slate-400/10 text-slate-700 dark:text-slate-300";
  }

  if (rank === 3) {
    return "border-orange-700/20 bg-orange-700/10 text-orange-700 dark:text-orange-300";
  }

  return "border-border/80 bg-background/70 text-muted-foreground";
}

export default function LeaderboardPage() {
  const [items, setItems] = useState<LeaderboardItem[]>([]);
  const [status, setStatus] = useState<LeaderboardStatus>("loading");
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    let inFlight = false;
    let activeController: AbortController | null = null;

    async function load() {
      if (inFlight) return;
      if (document.visibilityState === "hidden") return;

      inFlight = true;
      activeController?.abort();
      activeController = new AbortController();

      try {
        const response = await fetch("/api/results", {
          cache: "no-store",
          signal: activeController.signal
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "failed");

        if (active) {
          setItems(Array.isArray(data.results) ? data.results : []);
          setStatus("live");
          setLastUpdatedAt(Date.now());
        }
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
        if (active) setStatus("error");
      } finally {
        inFlight = false;
      }
    }

    void load();

    const intervalId = window.setInterval(() => {
      void load();
    }, POLL_INTERVAL_MS);

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void load();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      active = false;
      activeController?.abort();
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  const stats = useMemo(() => {
    const total = items.length;
    const topWpm = total > 0 ? Math.max(...items.map((item) => item.wpm)) : 0;
    const avgAccuracy =
      total > 0 ? Math.round((items.reduce((sum, item) => sum + item.accuracy, 0) / total) * 10) / 10 : 0;
    const avgWpm = total > 0 ? Math.round((items.reduce((sum, item) => sum + item.wpm, 0) / total) * 10) / 10 : 0;

    return { total, topWpm, avgAccuracy, avgWpm };
  }, [items]);

  const lastUpdatedLabel = lastUpdatedAt ? new Date(lastUpdatedAt).toLocaleTimeString() : "Waiting for first sync";

  return (
    <main className="relative mx-auto min-h-screen w-full max-w-6xl px-4 py-8 md:py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_12%_8%,hsl(var(--primary)/0.18),transparent_36%),radial-gradient(circle_at_85%_5%,hsl(var(--primary)/0.12),transparent_34%)]"
      />

      <div className="space-y-5">
        <Card className="border border-border/80 bg-card/80 shadow-2xl shadow-black/10 backdrop-blur">
          <CardContent className="space-y-5 p-5 md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 rounded-full border bg-background/60 px-3 py-1 text-xs text-muted-foreground">
                  <Trophy className="h-3.5 w-3.5 text-primary" />
                  Live Leaderboard
                </div>
                <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Top Typing Runs</h1>
                <p className="max-w-2xl text-sm text-muted-foreground">
                  Best runs per player and configuration. Updates automatically while you practice.
                </p>
                <p className="text-xs text-muted-foreground/90">
                  Melhor resultaadu sira aktualiza automatikamente kada {POLL_INTERVAL_MS / 1000} segundos.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2">
                <div
                  role="status"
                  aria-live="polite"
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${getStatusBadgeClasses(status)}`}
                >
                  <span
                    aria-hidden
                    className={`inline-flex h-1.5 w-1.5 rounded-full ${
                      status === "live"
                        ? "bg-emerald-500 motion-safe:animate-pulse"
                        : status === "error"
                          ? "bg-destructive"
                          : "bg-muted-foreground"
                    }`}
                  />
                  Status: {status}
                </div>

                <Link
                  href="/"
                  className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Back to typing
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatCard icon={<Activity className="h-4 w-4" />} label="Entries" value={stats.total} />
              <StatCard icon={<Zap className="h-4 w-4" />} label="Top WPM" value={stats.topWpm} />
              <StatCard icon={<Target className="h-4 w-4" />} label="Avg Accuracy" value={`${stats.avgAccuracy}%`} />
              <StatCard icon={<Clock3 className="h-4 w-4" />} label="Last Sync" value={lastUpdatedLabel} compact />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 bg-card/80 shadow-xl shadow-black/5 backdrop-blur">
          <CardContent className="p-0">
            {status === "error" && items.length === 0 ? (
              <EmptyState
                title="Leaderboard temporarily unavailable"
                description="We could not load results right now. Please try again in a moment."
              />
            ) : items.length === 0 && status === "loading" ? (
              <LoadingState />
            ) : items.length === 0 ? (
              <EmptyState title="No leaderboard results yet" description="Finish a typing run to create the first entry." />
            ) : (
              <div className="overflow-auto rounded-xl">
                <table className="w-full min-w-[980px] text-left text-sm">
                  <thead className="sticky top-0 z-10 bg-card/95 backdrop-blur">
                    <tr className="border-b">
                      <Th>#</Th>
                      <Th>Player</Th>
                      <Th>Country</Th>
                      <Th align="right">WPM</Th>
                      <Th align="right">Raw</Th>
                      <Th align="right">Accuracy</Th>
                      <Th align="right">Errors</Th>
                      <Th>Mode</Th>
                      <Th>Difficulty</Th>
                      <Th>Duration</Th>
                      <Th>Last Time</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => {
                      const rank = index + 1;
                      const country = item.country ? countryName(item.country) : "";
                      const playerName = item.userName || item.userId;
                      const timestamp = formatTimestamp(item.createdAt);

                      return (
                        <tr
                          key={item.id}
                          className="border-b border-border/60 odd:bg-background/20 even:bg-background/5 transition-colors hover:bg-primary/5"
                        >
                          <Td>
                            <span
                              className={`inline-flex min-w-8 items-center justify-center rounded-full border px-2 py-0.5 text-xs font-semibold ${rankPillClasses(rank)}`}
                            >
                              {rank}
                            </span>
                          </Td>

                          <Td>
                            <div className="flex items-center gap-2">
                              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border bg-background/70">
                                <User className="h-4 w-4 text-primary" />
                              </span>
                              <div className="min-w-0">
                                <p className="truncate font-medium text-foreground">{playerName}</p>
                                <p className="truncate text-xs text-muted-foreground">{item.userId}</p>
                              </div>
                            </div>
                          </Td>

                          <Td>
                            {item.country ? (
                              <span className="inline-flex items-center gap-2">
                                <CountryFlag code={item.country} className="shadow-sm" />
                                <span className="truncate">{country || item.country}</span>
                                <span className="text-xs text-muted-foreground">{item.country}</span>
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </Td>

                          <Td align="right" className="tabular-nums font-semibold">
                            {item.wpm}
                          </Td>
                          <Td align="right" className="tabular-nums text-muted-foreground">
                            {item.rawWpm}
                          </Td>
                          <Td align="right" className="tabular-nums">
                            <span className="font-medium">{item.accuracy}%</span>
                          </Td>
                          <Td align="right" className="tabular-nums">
                            {item.errors}
                          </Td>

                          <Td>
                            <Chip className={getModeChipClasses(item.mode)}>{item.mode}</Chip>
                          </Td>
                          <Td>
                            <Chip className={getDifficultyChipClasses(item.difficulty)}>{item.difficulty}</Chip>
                          </Td>
                          <Td>
                            <Chip className="border-border/80 bg-background/70 text-foreground">{item.durationSeconds}s</Chip>
                          </Td>
                          <Td>
                            <span className="whitespace-nowrap text-muted-foreground" title={timestamp}>
                              {timestamp}
                            </span>
                          </Td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function StatCard({
  icon,
  label,
  value,
  compact = false
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-background/45 p-3 shadow-sm backdrop-blur">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="text-primary">{icon}</span>
        <span>{label}</span>
      </div>
      <p className={`mt-2 font-semibold ${compact ? "text-sm md:text-base" : "text-xl tabular-nums"}`}>{value}</p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-3 p-4 md:p-5" aria-live="polite">
      <p className="text-sm text-muted-foreground">Loading live leaderboard...</p>
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="h-14 animate-pulse rounded-xl border bg-background/40" />
      ))}
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-44 items-center justify-center p-6 text-center">
      <div className="max-w-md space-y-2">
        <p className="text-lg font-semibold tracking-tight">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function Chip({ children, className }: { children: ReactNode; className: string }) {
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${className}`}>{children}</span>;
}

function Th({ children, align = "left" }: { children: ReactNode; align?: "left" | "right" }) {
  return (
    <th
      className={`px-3 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align = "left",
  className
}: {
  children: ReactNode;
  align?: "left" | "right";
  className?: string;
}) {
  return <td className={`px-3 py-3 align-middle ${align === "right" ? "text-right" : "text-left"} ${className ?? ""}`}>{children}</td>;
}
