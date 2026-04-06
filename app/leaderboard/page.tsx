"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Activity, ArrowLeft, Crown, Medal, Search, Target, Trophy, User, X, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { CountryFlag } from "@/components/ui/country-flag";
import { SiteCreditsFooter } from "@/components/ui/site-credits-footer";
import { countryName } from "@/lib/countries";
import { getSupabaseBrowserClient } from "@/lib/supabase";

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

const POLL_INTERVAL_MS = 15_000;
const REALTIME_TABLE = process.env.NEXT_PUBLIC_SUPABASE_RESULTS_TABLE || "lenuk_typing_users";
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

function toIntlLocale(lang: string): string {
  return lang === "tet" ? "pt" : lang;
}

function formatRelativeTime(value: string, now: number, locale?: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "unknown";

  const rtf = new Intl.RelativeTimeFormat(toIntlLocale(locale ?? "en"), { numeric: "auto" });
  const diffMs = date.getTime() - now;
  const absMs = Math.abs(diffMs);

  if (absMs < 60_000) return rtf.format(-Math.round(absMs / 1000), "second");
  if (absMs < 3_600_000) return rtf.format(Math.round(diffMs / 60_000), "minute");
  if (absMs < 86_400_000) return rtf.format(Math.round(diffMs / 3_600_000), "hour");
  return rtf.format(Math.round(diffMs / 86_400_000), "day");
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

const PODIUM_CONFIG: Record<number, {
  platformHeight: string;
  platformBg: string;
  platformBorder: string;
  platformShadow: string;
  rankNumColor: string;
  iconBg: string;
  iconColor: string;
  cardGlow: string;
}> = {
  1: {
    platformHeight: "h-24",
    platformBg: "bg-gradient-to-b from-yellow-400 to-yellow-600",
    platformBorder: "border-yellow-400/60",
    platformShadow: "shadow-yellow-500/40",
    rankNumColor: "text-yellow-900/80",
    iconBg: "bg-yellow-400/20 border-yellow-400/50",
    iconColor: "text-yellow-400",
    cardGlow: "shadow-yellow-500/10",
  },
  2: {
    platformHeight: "h-16",
    platformBg: "bg-gradient-to-b from-slate-300 to-slate-500",
    platformBorder: "border-slate-400/60",
    platformShadow: "shadow-slate-400/30",
    rankNumColor: "text-slate-900/80",
    iconBg: "bg-slate-400/20 border-slate-400/50",
    iconColor: "text-slate-400",
    cardGlow: "shadow-slate-400/10",
  },
  3: {
    platformHeight: "h-12",
    platformBg: "bg-gradient-to-b from-orange-500 to-orange-700",
    platformBorder: "border-orange-500/60",
    platformShadow: "shadow-orange-500/30",
    rankNumColor: "text-orange-900/80",
    iconBg: "bg-orange-500/20 border-orange-500/50",
    iconColor: "text-orange-400",
    cardGlow: "shadow-orange-500/10",
  },
};

function PodiumStage({
  podiumItems,
  playerLabel,
  t,
}: {
  podiumItems: Array<{ item: LeaderboardItem; rank: number; score: number }>;
  playerLabel: (item: LeaderboardItem) => string;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const displayOrder =
    podiumItems.length >= 3
      ? [podiumItems[1], podiumItems[0], podiumItems[2]]
      : podiumItems.length === 2
        ? [podiumItems[1], podiumItems[0]]
        : podiumItems;

  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-card/60 shadow-xl backdrop-blur-sm">
      <div className="flex items-end justify-center gap-0 px-4 pt-8">
        {displayOrder.map(({ item, rank, score }) => {
          const cfg = PODIUM_CONFIG[rank] ?? PODIUM_CONFIG[3];
          const name = playerLabel(item);
          const country = item.country ? countryName(item.country) : "";
          const isFirst = rank === 1;

          return (
            <div
              key={`podium-${item.id}-${rank}`}
              className={`flex flex-col items-center ${isFirst ? "w-[36%]" : "w-[32%]"}`}
            >
              <div className={`mb-3 flex w-full flex-col items-center gap-2 rounded-2xl border border-border/60 bg-background/70 px-3 py-4 text-center shadow-lg backdrop-blur ${cfg.cardGlow}`}>
                <span className={`inline-flex h-9 w-9 items-center justify-center rounded-full border ${cfg.iconBg}`}>
                  {rank === 1
                    ? <Crown className={`h-4 w-4 ${cfg.iconColor}`} />
                    : <Medal className={`h-4 w-4 ${cfg.iconColor}`} />}
                </span>

                <div className={`flex h-12 w-12 items-center justify-center rounded-full border-2 bg-muted ${cfg.platformBorder}`}>
                  <User className="h-6 w-6 text-muted-foreground" />
                </div>

                <p className={`w-full truncate font-semibold leading-tight ${isFirst ? "text-base" : "text-sm"}`}>
                  {name}
                </p>

                {(item.country || country) ? (
                  <div className="flex max-w-full items-center justify-center gap-1.5 text-xs text-muted-foreground">
                    {item.country ? <CountryFlag code={item.country} className="shadow-sm" /> : null}
                    <span className="truncate">{country || t("lbUnknownCountry")}</span>
                  </div>
                ) : null}

                <div className="flex w-full flex-col gap-1.5">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className={`font-bold tabular-nums ${isFirst ? "text-2xl" : "text-xl"}`}>{item.wpm}</span>
                    <span className="text-xs text-muted-foreground">{t("lbWpm")}</span>
                  </div>
                  <div className="flex justify-center gap-2 text-xs text-muted-foreground">
                    <span>{item.accuracy}% {t("lbAccuracy")}</span>
                    <span className="text-border">·</span>
                    <span>{t("lbScore")} {score}</span>
                  </div>
                </div>
              </div>

              <div className={`relative flex w-full items-center justify-center rounded-t-xl border border-b-0 shadow-lg ${cfg.platformHeight} ${cfg.platformBg} ${cfg.platformBorder} ${cfg.platformShadow}`}>
                <span className={`text-3xl font-black ${cfg.rankNumColor}`}>{rank}</span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="h-3 bg-border/25" />
    </div>
  );
}

function rowClasses(rank: number) {
  if (rank <= 3) {
    return "border-b border-border/70 bg-[linear-gradient(90deg,hsl(var(--primary)/0.08),transparent_30%)] hover:bg-[linear-gradient(90deg,hsl(var(--primary)/0.12),transparent_40%)]";
  }

  return "border-b border-border/60 odd:bg-background/20 even:bg-background/5 transition-colors hover:bg-primary/5";
}

// optionLabel is built inside the component to access t()

// playerLabel is built inside the component to access t()

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
  const { t, i18n } = useTranslation();

  const optionLabel = (option: string): string => {
    const map: Record<string, string> = {
      all:         t("lbSortAll"),
      leaderboard: t("lbSortLeaderboard"),
      wpm:         t("lbSortWpm"),
      latest:      t("lbSortLatest"),
      accuracy:    t("lbSortAccuracy"),
    };
    return map[option] ?? option.charAt(0).toUpperCase() + option.slice(1);
  };

  const playerLabel = (item: LeaderboardItem): string => {
    const name = item.userName?.trim();
    return name ? name : t("lbAnonymous");
  };

  const [items, setItems] = useState<LeaderboardItem[]>([]);
  const [status, setStatus] = useState<LeaderboardStatus>("loading");
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [sortBy, setSortBy] = useState<SortOption>("leaderboard");
  const [realtimeConnected, setRealtimeConnected] = useState(false);

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

    // Supabase Realtime: trigger immediate reload on any INSERT into the results table
    let supabaseChannel: ReturnType<ReturnType<typeof getSupabaseBrowserClient>["channel"]> | null = null;
    try {
      const supabase = getSupabaseBrowserClient();
      supabaseChannel = supabase
        .channel("leaderboard-realtime")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: REALTIME_TABLE }, () => {
          void load();
        })
        .subscribe((channelStatus) => {
          if (active) setRealtimeConnected(channelStatus === "SUBSCRIBED");
        });
    } catch {
      // Supabase not configured — polling-only mode
    }

    return () => {
      active = false;
      activeController?.abort();
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (supabaseChannel) {
        try {
          getSupabaseBrowserClient().removeChannel(supabaseChannel);
        } catch {
          // ignore
        }
      }
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

  const difficultyOptions = useMemo(() => {
    return ["all", ...Array.from(new Set(items.map((item) => item.difficulty).filter(Boolean))).sort()];
  }, [items]);

  const rankedItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const filtered = items.filter((item) => {
      const playerName = playerLabel(item).toLowerCase();
      const countryCode = item.country.toLowerCase();
      const country = item.country ? (countryName(item.country) ?? "").toLowerCase() : "";

      const matchesQuery =
        normalizedQuery.length === 0 ||
        playerName.includes(normalizedQuery) ||
        countryCode.includes(normalizedQuery) ||
        country.includes(normalizedQuery);

      const matchesDifficulty = difficultyFilter === "all" || item.difficulty === difficultyFilter;

      return matchesQuery && matchesDifficulty;
    });

    if (sortBy === "leaderboard") {
      return [...filtered].sort(compareByLeaderboardRank).map((item, index) => ({
        item,
        rank: index + 1,
        score: Math.round(rankScore(item) * 10) / 10
      }));
    }

    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === "wpm") return b.wpm - a.wpm || b.accuracy - a.accuracy;
      if (sortBy === "accuracy") return b.accuracy - a.accuracy || b.wpm - a.wpm;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return sorted.map((item, index) => ({
      item,
      rank: index + 1,
      score: Math.round(rankScore(item) * 10) / 10
    }));
  }, [items, query, difficultyFilter, sortBy]);

  const hasActiveFilters = query.trim().length > 0 || difficultyFilter !== "all" || sortBy !== "leaderboard";
  const podiumItems = rankedItems.slice(0, 3);
  const podiumKey = `${query}|${difficultyFilter}|${sortBy}|${rankedItems.length}`;
  const now = Date.now();

  const lastUpdatedLabel = lastUpdatedAt ? new Date(lastUpdatedAt).toLocaleTimeString() : t("lbWaiting");

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
                  {t("lbBadge")}
                </div>
                <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{t("lbTitle")}</h1>
                <p className="max-w-2xl text-sm text-muted-foreground">{t("lbDesc")}</p>
                <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground/90">
                  {t("lbAutoUpdate", { seconds: POLL_INTERVAL_MS / 1000 })}
                  {realtimeConnected && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                      Realtime
                    </span>
                  )}
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
                  {status === "live" ? t("lbStatusLive") : status === "error" ? t("lbStatusError") : t("lbStatusLoading")}
                </div>

                <Link
                  href="/"
                  className="leaderboard-live-button group relative inline-flex h-9 items-center justify-center gap-2 overflow-hidden rounded-md border border-primary/20 bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 transition-all duration-200 hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-safe:animate-[leaderboard-button-pulse_2.8s_cubic-bezier(0.22,1,0.36,1)_infinite]"
                  aria-label="Back to typing zone"
                >
                  <span aria-hidden className="leaderboard-live-aura absolute inset-0 rounded-md" />
                  <span
                    aria-hidden
                    className="absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100 bg-[radial-gradient(circle_at_20%_15%,rgba(255,255,255,0.22),transparent_42%)]"
                  />
                  <span
                    aria-hidden
                    className="absolute inset-y-0 left-[-40%] w-10 rotate-12 bg-white/20 blur-sm transition-transform duration-700 group-hover:translate-x-[290%] motion-safe:animate-[leaderboard-sheen_3.4s_ease-in-out_infinite]"
                  />
                  <span aria-hidden className="leaderboard-live-orb relative h-2 w-2 rounded-full bg-white/95" />
                  <ArrowLeft className="relative h-4 w-4 transition-transform duration-300 group-hover:-translate-x-0.5" />
                  <span className="relative">{t("lbBackBtn")}</span>
                  <span className="leaderboard-live-badge relative hidden items-center rounded-full border border-white/20 bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] sm:inline-flex">
                    {t("lbGo")}
                  </span>
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
              <StatCard icon={<Activity className="h-4 w-4" />} label={t("lbStatEntries")} value={stats.total} />
              <StatCard icon={<Zap className="h-4 w-4" />} label={t("lbStatTopWpm")} value={stats.topWpm} />
              <StatCard icon={<Medal className="h-4 w-4" />} label={t("lbStatAvgWpm")} value={stats.avgWpm} />
              <StatCard icon={<Target className="h-4 w-4" />} label={t("lbStatAvgAcc")} value={`${stats.avgAccuracy}%`} />
              <StatCard icon={<Trophy className="h-4 w-4" />} label={t("lbStatCountries")} value={stats.activeCountries} />
            </div>

            <div className="rounded-xl border border-border/70 bg-background/55 p-3 shadow-sm backdrop-blur">
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_repeat(2,minmax(0,1fr))_auto] lg:items-end">
                <label className="relative block">
                  <span className="sr-only">Search players or countries</span>
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={t("lbSearchPlaceholder")}
                    className="h-10 w-full rounded-lg border border-input/80 bg-background/80 pl-9 pr-3 text-sm outline-none transition focus-visible:border-primary/45 focus-visible:ring-2 focus-visible:ring-primary/20"
                  />
                </label>

                <SelectControl
                  label={t("lbFilterDifficulty")}
                  value={difficultyFilter}
                  onChange={setDifficultyFilter}
                  options={difficultyOptions}
                  formatOption={optionLabel}
                />

                <SelectControl
                  label={t("lbFilterSort")}
                  value={sortBy}
                  onChange={(value) => setSortBy(value as SortOption)}
                  options={["leaderboard", "wpm", "accuracy", "latest"]}
                  formatOption={optionLabel}
                />

                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setDifficultyFilter("all");
                    setSortBy("leaderboard");
                  }}
                  disabled={!hasActiveFilters}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-border/80 bg-background/70 px-3 text-sm font-medium transition hover:bg-background disabled:cursor-not-allowed disabled:opacity-55"
                >
                  <X className="h-3.5 w-3.5" />
                  {t("lbBtnClear")}
                </button>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <p>{t("lbShowing", { shown: rankedItems.length, total: items.length })}</p>
                <p>{t("lbRankFormula")}</p>
                <p>{t("lbLastSync", { time: lastUpdatedLabel })}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {podiumItems.length > 0 ? (
          <PodiumStage key={podiumKey} podiumItems={podiumItems} playerLabel={playerLabel} t={t} />
        ) : null}

        <Card className="border border-border/80 bg-card/80 shadow-xl shadow-black/5 backdrop-blur">
          <CardContent className="p-0">
            {status === "error" && items.length === 0 ? (
              <EmptyState
                title={t("lbErrTitle")}
                description={t("lbErrDesc")}
              />
            ) : items.length === 0 && status === "loading" ? (
              <LoadingState />
            ) : items.length === 0 ? (
              <EmptyState title={t("lbEmptyTitle")} description={t("lbEmptyDesc")} />
            ) : rankedItems.length === 0 ? (
              <EmptyState
                title={t("lbNoMatchTitle")}
                description={t("lbNoMatchDesc")}
                action={
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      setDifficultyFilter("all");
                      setSortBy("leaderboard");
                    }}
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border/80 bg-background/70 px-3 text-sm font-medium transition hover:bg-background"
                  >
                    <X className="h-3.5 w-3.5" />
                    {t("lbBtnClearFilters")}
                  </button>
                }
              />
            ) : (
              <div>
                <div className="space-y-3 p-4 md:hidden">
                  {rankedItems.map(({ item, rank, score }) => {
                    const country = item.country ? countryName(item.country) : "";
                    const playerName = playerLabel(item);
                    const timestamp = formatTimestamp(item.createdAt);
                    const relative = formatRelativeTime(item.createdAt, now, i18n.language);

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
                              <span className="truncate">{country || t("lbUnknownCountry")}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-semibold tabular-nums">{item.wpm}</p>
                            <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">WPM</p>
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                          <InlineMetric label={t("lbScore")} value={score} />
                          <InlineMetric label={t("lbAccuracy")} value={`${item.accuracy}%`} />
                          <InlineMetric label={t("lbRawWpm")} value={item.rawWpm} />
                          <InlineMetric label={t("lbErrors")} value={item.errors} />
                          <InlineMetric label={t("lbDuration")} value={`${item.durationSeconds}s`} />
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <Chip className={getDifficultyChipClasses(item.difficulty)}>{item.difficulty}</Chip>
                          <Chip className="border-border/80 bg-background/70 text-foreground">{item.durationSeconds}s</Chip>
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
                        <Th>{t("lbColPlayer")}</Th>
                        <Th>{t("lbColCountry")}</Th>
                        <Th align="right">{t("lbColSpeed")}</Th>
                        <Th align="right">{t("lbAccuracy")}</Th>
                        <Th>{t("lbColSetup")}</Th>
                        <Th>{t("lbColLastRun")}</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {rankedItems.map(({ item, rank, score }) => {
                        const country = item.country ? countryName(item.country) : "";
                        const playerName = playerLabel(item);
                        const timestamp = formatTimestamp(item.createdAt);
                        const relative = formatRelativeTime(item.createdAt, now, i18n.language);
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
                                <p className="text-right text-[11px] text-muted-foreground">{t("lbRawWpm")} {item.rawWpm} | {t("lbScore")} {score}</p>
                              </div>
                            </Td>

                            <Td align="right">
                              <div>
                                <p className="tabular-nums font-semibold">{item.accuracy}%</p>
                                <p className="text-[11px] text-muted-foreground">{t("lbErrors")} {item.errors}</p>
                              </div>
                            </Td>

                            <Td>
                              <div className="flex flex-wrap items-center gap-2">
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
      <SiteCreditsFooter className="mt-5" />
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
  onChange,
  formatOption,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  formatOption?: (option: string) => string;
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
            {formatOption ? formatOption(option) : option}
          </option>
        ))}
      </select>
    </label>
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
