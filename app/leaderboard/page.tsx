"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Activity, Crown, Medal, Search, Target, Trophy, User, X, Zap } from "lucide-react";
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
type SortOption = "leaderboard" | "wpm" | "accuracy" | "latest";

const POLL_INTERVAL_MS = 5000;
const relativeTimeFormatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
const DIFFICULTY_WEIGHTS: Record<string, number> = {
  easy: 1,
  medium: 1.08,
  hard: 1.16
};

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function formatRelativeTime(value: string, now: number) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "unknown";

  const diffMs = date.getTime() - now;
  const absMs = Math.abs(diffMs);

  if (absMs < 60_000) return "just now";
  if (absMs < 3_600_000) return relativeTimeFormatter.format(Math.round(diffMs / 60_000), "minute");
  if (absMs < 86_400_000) return relativeTimeFormatter.format(Math.round(diffMs / 3_600_000), "hour");
  return relativeTimeFormatter.format(Math.round(diffMs / 86_400_000), "day");
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
    return "border-yellow-500/35 bg-yellow-500/15 text-yellow-700 dark:text-yellow-300";
  }

  if (rank === 2) {
    return "border-slate-400/35 bg-slate-400/15 text-slate-700 dark:text-slate-300";
  }

  if (rank === 3) {
    return "border-orange-700/30 bg-orange-700/12 text-orange-700 dark:text-orange-300";
  }

  return "border-border/80 bg-background/70 text-muted-foreground";
}

function podiumCardClasses(rank: number) {
  if (rank === 1) {
    return "border-yellow-500/30 bg-[linear-gradient(135deg,hsl(47_96%_53%/.16),transparent_56%),linear-gradient(180deg,hsl(var(--card)/.97),hsl(var(--card)/.95))]";
  }

  if (rank === 2) {
    return "border-slate-400/30 bg-[linear-gradient(135deg,hsl(215_14%_67%/.2),transparent_56%),linear-gradient(180deg,hsl(var(--card)/.97),hsl(var(--card)/.95))]";
  }

  return "border-amber-700/30 bg-[linear-gradient(135deg,hsl(32_95%_44%/.15),transparent_56%),linear-gradient(180deg,hsl(var(--card)/.97),hsl(var(--card)/.95))]";
}

function rowClasses(rank: number) {
  if (rank <= 3) {
    return "border-b border-border/70 bg-[linear-gradient(90deg,hsl(var(--primary)/0.08),transparent_30%)] hover:bg-[linear-gradient(90deg,hsl(var(--primary)/0.12),transparent_40%)]";
  }

  return "border-b border-border/60 odd:bg-background/20 even:bg-background/5 transition-colors hover:bg-primary/5";
}

function optionLabel(option: string) {
  if (option === "all") return "All";
  if (option === "leaderboard") return "Leaderboard";
  if (option === "wpm") return "WPM";
  if (option === "latest") return "Latest";
  if (option === "accuracy") return "Accuracy";
  return option.charAt(0).toUpperCase() + option.slice(1);
}

function difficultyWeight(difficulty: string) {
  return DIFFICULTY_WEIGHTS[difficulty] ?? 1;
}

function rankScore(item: LeaderboardItem) {
  const accuracyMultiplier = Math.min(1.03, Math.max(0.75, item.accuracy / 100));
  return item.wpm * accuracyMultiplier * difficultyWeight(item.difficulty);
}

function compareByLeaderboardRank(a: LeaderboardItem, b: LeaderboardItem) {
  const scoreDiff = rankScore(b) - rankScore(a);
  if (Math.abs(scoreDiff) > 0.001) return scoreDiff;

  if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
  if (b.wpm !== a.wpm) return b.wpm - a.wpm;
  if (difficultyWeight(b.difficulty) !== difficultyWeight(a.difficulty)) {
    return difficultyWeight(b.difficulty) - difficultyWeight(a.difficulty);
  }

  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

export default function LeaderboardPage() {
  const [items, setItems] = useState<LeaderboardItem[]>([]);
  const [status, setStatus] = useState<LeaderboardStatus>("loading");
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [modeFilter, setModeFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [sortBy, setSortBy] = useState<SortOption>("leaderboard");

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
    const activeCountries = new Set(items.map((item) => item.country).filter(Boolean)).size;

    return { total, topWpm, avgAccuracy, avgWpm, activeCountries };
  }, [items]);

  const modeOptions = useMemo(() => {
    return ["all", ...Array.from(new Set(items.map((item) => item.mode).filter(Boolean))).sort()];
  }, [items]);

  const difficultyOptions = useMemo(() => {
    return ["all", ...Array.from(new Set(items.map((item) => item.difficulty).filter(Boolean))).sort()];
  }, [items]);

  const displayItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const filtered = items.filter((item) => {
      const playerName = (item.userName || item.userId).toLowerCase();
      const countryCode = item.country.toLowerCase();
      const country = item.country ? (countryName(item.country) ?? "").toLowerCase() : "";

      const matchesQuery =
        normalizedQuery.length === 0 ||
        playerName.includes(normalizedQuery) ||
        item.userId.toLowerCase().includes(normalizedQuery) ||
        countryCode.includes(normalizedQuery) ||
        country.includes(normalizedQuery);

      const matchesMode = modeFilter === "all" || item.mode === modeFilter;
      const matchesDifficulty = difficultyFilter === "all" || item.difficulty === difficultyFilter;

      return matchesQuery && matchesMode && matchesDifficulty;
    });

    if (sortBy === "leaderboard") {
      return [...filtered].sort(compareByLeaderboardRank);
    }

    return [...filtered].sort((a, b) => {
      if (sortBy === "wpm") return b.wpm - a.wpm || b.accuracy - a.accuracy;
      if (sortBy === "accuracy") return b.accuracy - a.accuracy || b.wpm - a.wpm;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [items, query, modeFilter, difficultyFilter, sortBy]);

  const hasActiveFilters =
    query.trim().length > 0 || modeFilter !== "all" || difficultyFilter !== "all" || sortBy !== "leaderboard";
  const podiumItems = displayItems.slice(0, 3);
  const now = Date.now();

  const lastUpdatedLabel = lastUpdatedAt ? new Date(lastUpdatedAt).toLocaleTimeString() : "Waiting for first sync";

  return (
    <main className="relative mx-auto min-h-screen w-full max-w-7xl px-4 py-8 md:py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_12%_8%,hsl(var(--primary)/0.2),transparent_32%),radial-gradient(circle_at_89%_6%,hsl(var(--primary)/0.14),transparent_34%),linear-gradient(transparent_95%,hsl(var(--primary)/0.04)_100%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,hsl(var(--border)/0.25)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.25)_1px,transparent_1px)] bg-[size:54px_54px] [mask-image:radial-gradient(circle_at_center,black,transparent_78%)]"
      />

      <div className="space-y-4 md:space-y-5">
        <Card className="relative overflow-hidden border border-border/80 bg-card/82 shadow-2xl shadow-black/10 backdrop-blur">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_-14%,hsl(var(--primary)/0.2),transparent_40%),radial-gradient(circle_at_100%_0,hsl(var(--primary)/0.12),transparent_32%)]"
          />
          <CardContent className="relative space-y-5 p-5 md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 rounded-full border bg-background/60 px-3 py-1 text-xs text-muted-foreground">
                  <Trophy className="h-3.5 w-3.5 text-primary" />
                  Live Leaderboard
                </div>
                <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Fastest Typists This Session</h1>
                <p className="max-w-2xl text-sm text-muted-foreground">
                  Compare top runs instantly with smarter filters, spotlighted leaders, and a mobile-friendly ranking layout.
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

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
              <StatCard icon={<Activity className="h-4 w-4" />} label="Entries" value={stats.total} />
              <StatCard icon={<Zap className="h-4 w-4" />} label="Top WPM" value={stats.topWpm} />
              <StatCard icon={<Medal className="h-4 w-4" />} label="Avg WPM" value={stats.avgWpm} />
              <StatCard icon={<Target className="h-4 w-4" />} label="Avg Accuracy" value={`${stats.avgAccuracy}%`} />
              <StatCard icon={<Trophy className="h-4 w-4" />} label="Countries" value={stats.activeCountries} />
            </div>

            <div className="rounded-xl border border-border/70 bg-background/55 p-3 shadow-sm backdrop-blur">
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))_auto] lg:items-end">
                <label className="relative block">
                  <span className="sr-only">Search players or countries</span>
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search player, ID, or country"
                    className="h-10 w-full rounded-lg border border-input/80 bg-background/80 pl-9 pr-3 text-sm outline-none transition focus-visible:border-primary/45 focus-visible:ring-2 focus-visible:ring-primary/20"
                  />
                </label>

                <SelectControl label="Mode" value={modeFilter} onChange={setModeFilter} options={modeOptions} />

                <SelectControl
                  label="Difficulty"
                  value={difficultyFilter}
                  onChange={setDifficultyFilter}
                  options={difficultyOptions}
                />

                <SelectControl
                  label="Sort"
                  value={sortBy}
                  onChange={(value) => setSortBy(value as SortOption)}
                  options={["leaderboard", "wpm", "accuracy", "latest"]}
                />

                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setModeFilter("all");
                    setDifficultyFilter("all");
                    setSortBy("leaderboard");
                  }}
                  disabled={!hasActiveFilters}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-border/80 bg-background/70 px-3 text-sm font-medium transition hover:bg-background disabled:cursor-not-allowed disabled:opacity-55"
                >
                  <X className="h-3.5 w-3.5" />
                  Clear
                </button>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <p>
                  Showing {displayItems.length} of {items.length} entries
                </p>
                <p>Rank formula: WPM x accuracy x difficulty</p>
                <p>Last sync: {lastUpdatedLabel}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {podiumItems.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-3">
            {podiumItems.map((item, index) => {
              const rank = index + 1;
              const playerName = item.userName || item.userId;
              const country = item.country ? countryName(item.country) : "";
              const score = Math.round(rankScore(item) * 10) / 10;

              return (
                <Card key={`podium-${item.id}`} className={`relative overflow-hidden shadow-lg ${podiumCardClasses(rank)}`}>
                  <CardContent className="relative space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <span
                          className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${rankPillClasses(rank)}`}
                        >
                          Rank {rank}
                        </span>
                        <p className="text-lg font-semibold leading-tight">{playerName}</p>
                        <div className="inline-flex max-w-full items-center gap-2 text-xs text-muted-foreground">
                          {item.country ? <CountryFlag code={item.country} className="shadow-sm" /> : null}
                          <span className="truncate">{country || item.userId}</span>
                        </div>
                      </div>

                      <span className={`inline-flex h-9 w-9 items-center justify-center rounded-full border ${rankPillClasses(rank)}`}>
                        {rank === 1 ? <Crown className="h-4 w-4" /> : <Medal className="h-4 w-4" />}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center">
                      <PodiumMetric label="WPM" value={item.wpm} />
                      <PodiumMetric label="Accuracy" value={`${item.accuracy}%`} />
                      <PodiumMetric label="Score" value={score} />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : null}

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
            ) : displayItems.length === 0 ? (
              <EmptyState
                title="No runs match these filters"
                description="Try another search term or clear the current filters."
                action={
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      setModeFilter("all");
                      setDifficultyFilter("all");
                      setSortBy("leaderboard");
                    }}
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border/80 bg-background/70 px-3 text-sm font-medium transition hover:bg-background"
                  >
                    <X className="h-3.5 w-3.5" />
                    Clear filters
                  </button>
                }
              />
            ) : (
              <div>
                <div className="space-y-3 p-4 md:hidden">
                  {displayItems.map((item, index) => {
                    const rank = index + 1;
                    const country = item.country ? countryName(item.country) : "";
                    const playerName = item.userName || item.userId;
                    const timestamp = formatTimestamp(item.createdAt);
                    const relative = formatRelativeTime(item.createdAt, now);
                    const score = Math.round(rankScore(item) * 10) / 10;

                    return (
                      <article
                        key={`mobile-${item.id}`}
                        className={`rounded-xl border p-3 shadow-sm ${rank <= 3 ? "border-primary/25 bg-primary/5" : "border-border/70 bg-background/40"}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={`inline-flex min-w-8 items-center justify-center rounded-full border px-2 py-0.5 text-xs font-semibold ${rankPillClasses(rank)}`}
                              >
                                #{rank}
                              </span>
                              <span className="truncate text-sm font-semibold">{playerName}</span>
                            </div>
                            <div className="inline-flex max-w-full items-center gap-2 text-xs text-muted-foreground">
                              {item.country ? <CountryFlag code={item.country} className="shadow-sm" /> : null}
                              <span className="truncate">{country || item.userId}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-semibold tabular-nums">{item.wpm}</p>
                            <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">WPM</p>
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                          <InlineMetric label="Score" value={score} />
                          <InlineMetric label="Accuracy" value={`${item.accuracy}%`} />
                          <InlineMetric label="Raw WPM" value={item.rawWpm} />
                          <InlineMetric label="Errors" value={item.errors} />
                          <InlineMetric label="Duration" value={`${item.durationSeconds}s`} />
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <Chip className={getModeChipClasses(item.mode)}>{item.mode}</Chip>
                          <Chip className={getDifficultyChipClasses(item.difficulty)}>{item.difficulty}</Chip>
                        </div>

                        <p className="mt-3 text-xs text-muted-foreground" title={timestamp}>
                          {relative} ({timestamp})
                        </p>
                      </article>
                    );
                  })}
                </div>

                <div className="hidden overflow-auto rounded-xl md:block">
                  <table className="w-full min-w-[940px] text-left text-sm">
                    <thead className="sticky top-0 z-10 bg-card/95 backdrop-blur">
                      <tr className="border-b">
                        <Th>#</Th>
                        <Th>Player</Th>
                        <Th>Country</Th>
                        <Th align="right">Speed</Th>
                        <Th align="right">Accuracy</Th>
                        <Th>Setup</Th>
                        <Th>Last run</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayItems.map((item, index) => {
                        const rank = index + 1;
                        const country = item.country ? countryName(item.country) : "";
                        const playerName = item.userName || item.userId;
                        const timestamp = formatTimestamp(item.createdAt);
                        const relative = formatRelativeTime(item.createdAt, now);
                        const score = Math.round(rankScore(item) * 10) / 10;
                        const speedPercent =
                          stats.topWpm > 0 ? Math.max(7, Math.round((item.wpm / stats.topWpm) * 100)) : 0;

                        return (
                          <tr key={item.id} className={rowClasses(rank)}>
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
                                <span className="inline-flex max-w-[200px] items-center gap-2">
                                  <CountryFlag code={item.country} className="shadow-sm" />
                                  <span className="truncate">{country || item.country}</span>
                                  <span className="text-xs text-muted-foreground">{item.country}</span>
                                </span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </Td>

                            <Td align="right">
                              <div className="ml-auto w-fit space-y-1">
                                <div className="flex items-center justify-end gap-2">
                                  <span className="tabular-nums text-lg font-semibold leading-none">{item.wpm}</span>
                                  <span className="text-xs uppercase tracking-[0.08em] text-muted-foreground">WPM</span>
                                </div>
                                <div className="ml-auto h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                                  <span className="block h-full rounded-full bg-primary/80" style={{ width: `${speedPercent}%` }} />
                                </div>
                                <p className="text-right text-[11px] text-muted-foreground">Raw {item.rawWpm} | Score {score}</p>
                              </div>
                            </Td>

                            <Td align="right">
                              <div>
                                <p className="tabular-nums font-semibold">{item.accuracy}%</p>
                                <p className="text-[11px] text-muted-foreground">Errors {item.errors}</p>
                              </div>
                            </Td>

                            <Td>
                              <div className="flex flex-wrap items-center gap-2">
                                <Chip className={getModeChipClasses(item.mode)}>{item.mode}</Chip>
                                <Chip className={getDifficultyChipClasses(item.difficulty)}>{item.difficulty}</Chip>
                                <Chip className="border-border/80 bg-background/70 text-foreground">{item.durationSeconds}s</Chip>
                              </div>
                            </Td>

                            <Td>
                              <p className="whitespace-nowrap text-sm font-medium">{relative}</p>
                              <p className="whitespace-nowrap text-xs text-muted-foreground" title={timestamp}>
                                {timestamp}
                              </p>
                            </Td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
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

function SelectControl({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-1">
      <span className="block text-xs text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-lg border border-input/80 bg-background/80 px-3 text-sm outline-none transition focus-visible:border-primary/45 focus-visible:ring-2 focus-visible:ring-primary/20"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {optionLabel(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

function PodiumMetric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-lg border border-border/70 bg-background/45 px-2 py-1.5">
      <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function InlineMetric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-md border border-border/70 bg-background/45 px-2 py-1">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-semibold tabular-nums">{value}</p>
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

function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex min-h-44 items-center justify-center p-6 text-center">
      <div className="max-w-md space-y-2">
        <p className="text-lg font-semibold tracking-tight">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
        {action ? <div className="pt-2">{action}</div> : null}
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
