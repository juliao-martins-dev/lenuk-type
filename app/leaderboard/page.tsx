"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Activity, ArrowLeft, Medal, Search, Target, Trophy, User, X, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { CountryFlag } from "@/components/ui/country-flag";
import { SiteCreditsFooter } from "@/components/ui/site-credits-footer";
import { countryName } from "@/lib/countries";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { readPublicConfig } from "@/lib/public-config";

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

interface PodiumTheme {
  pillarHeight: string;
  numberGradient: string;
  numberShadow: string;
  cupGradient: string;
  cupStroke: string;
  cupShadow: string;
  cupSize: string;
  accent: string;
}

const PODIUM_THEMES: Record<number, PodiumTheme> = {
  1: {
    pillarHeight: "h-[260px] sm:h-[300px]",
    numberGradient: "bg-[linear-gradient(180deg,#fde68a_0%,#f59e0b_45%,#b45309_100%)]",
    numberShadow: "drop-shadow-[0_4px_6px_rgba(180,83,9,0.25)]",
    cupGradient: "from-[#fff3b0] via-[#fbbf24] to-[#a16207]",
    cupStroke: "stroke-[#92400e]",
    cupShadow: "drop-shadow-[0_14px_18px_rgba(161,98,7,0.35)]",
    cupSize: "h-28 w-28 sm:h-36 sm:w-36",
    accent: "text-amber-600",
  },
  2: {
    pillarHeight: "h-[180px] sm:h-[220px]",
    numberGradient: "bg-[linear-gradient(180deg,#f8fafc_0%,#94a3b8_50%,#475569_100%)]",
    numberShadow: "drop-shadow-[0_4px_6px_rgba(71,85,105,0.25)]",
    cupGradient: "from-[#f8fafc] via-[#cbd5e1] to-[#64748b]",
    cupStroke: "stroke-[#334155]",
    cupShadow: "drop-shadow-[0_12px_16px_rgba(100,116,139,0.35)]",
    cupSize: "h-20 w-20 sm:h-28 sm:w-28",
    accent: "text-slate-500",
  },
  3: {
    pillarHeight: "h-[130px] sm:h-[160px]",
    numberGradient: "bg-[linear-gradient(180deg,#fed7aa_0%,#c2410c_50%,#7c2d12_100%)]",
    numberShadow: "drop-shadow-[0_4px_6px_rgba(124,45,18,0.3)]",
    cupGradient: "from-[#fed7aa] via-[#ea580c] to-[#7c2d12]",
    cupStroke: "stroke-[#431407]",
    cupShadow: "drop-shadow-[0_10px_14px_rgba(124,45,18,0.35)]",
    cupSize: "h-16 w-16 sm:h-24 sm:w-24",
    accent: "text-orange-700",
  },
};

/** Decorative trophy-cup illustration. Tinted via the `gradientId` stops. */
function TrophyCup({ theme, rank }: { theme: PodiumTheme; rank: number }) {
  const gradientId = `trophy-grad-${rank}`;
  const highlightId = `trophy-highlight-${rank}`;

  return (
    <svg
      viewBox="0 0 100 120"
      className={`${theme.cupSize} ${theme.cupShadow}`}
      aria-hidden
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" className={`[stop-color:var(--tw-gradient-from)]`} style={{ stopColor: "var(--cup-from)" }} />
          <stop offset="50%" style={{ stopColor: "var(--cup-via)" }} />
          <stop offset="100%" style={{ stopColor: "var(--cup-to)" }} />
        </linearGradient>
        <linearGradient id={highlightId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="white" stopOpacity="0.55" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Bowl */}
      <path
        d="M25 15 L75 15 L72 50 Q70 70 50 75 Q30 70 28 50 Z"
        fill={`url(#${gradientId})`}
        strokeWidth="1.2"
        className={theme.cupStroke}
      />
      {/* Inner highlight streak */}
      <path
        d="M32 20 L38 20 L36 55 Q36 62 40 66 L34 64 Q30 58 30 50 Z"
        fill={`url(#${highlightId})`}
      />
      {/* Left handle */}
      <path
        d="M25 22 Q12 24 12 36 Q12 48 25 48"
        fill="none"
        strokeWidth="4"
        className={theme.cupStroke}
        stroke="currentColor"
        style={{ stroke: "var(--cup-via)" }}
      />
      {/* Right handle */}
      <path
        d="M75 22 Q88 24 88 36 Q88 48 75 48"
        fill="none"
        strokeWidth="4"
        style={{ stroke: "var(--cup-via)" }}
      />
      {/* Rank number on the bowl */}
      <text
        x="50"
        y="48"
        textAnchor="middle"
        fontSize="22"
        fontWeight="900"
        fill="rgba(0,0,0,0.35)"
        fontFamily="system-ui, sans-serif"
      >
        {rank}
      </text>
      {/* Stem */}
      <rect x="46" y="75" width="8" height="18" rx="1.5" fill={`url(#${gradientId})`} />
      {/* Base top */}
      <rect x="35" y="93" width="30" height="6" rx="1.5" fill={`url(#${gradientId})`} />
      {/* Base bottom */}
      <rect x="28" y="99" width="44" height="10" rx="2" fill={`url(#${gradientId})`} />
    </svg>
  );
}

function PodiumColumn({
  entry,
  theme,
  playerLabel,
  t,
}: {
  entry: { item: LeaderboardItem; rank: number; score: number };
  theme: PodiumTheme;
  playerLabel: (item: LeaderboardItem) => string;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const { item, rank, score } = entry;
  const name = playerLabel(item);
  const country = item.country ? countryName(item.country) : "";

  // Map theme colors into CSS custom properties so the inline SVG gradient works.
  const cssVars: Record<string, string> = (
    {
      1: { "--cup-from": "#fff3b0", "--cup-via": "#fbbf24", "--cup-to": "#a16207" },
      2: { "--cup-from": "#f8fafc", "--cup-via": "#cbd5e1", "--cup-to": "#64748b" },
      3: { "--cup-from": "#fed7aa", "--cup-via": "#ea580c", "--cup-to": "#7c2d12" },
    } as const
  )[rank] ?? {};

  return (
    <div className="flex flex-col items-center" style={cssVars as React.CSSProperties}>
      {/* Trophy cup sitting on top — champion gets a glow */}
      <div className="relative z-10 flex items-end justify-center">
        {rank === 1 && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -inset-x-6 -top-4 animate-pulse rounded-full bg-amber-400/20 blur-2xl motion-reduce:animate-none"
          />
        )}
        <TrophyCup theme={theme} rank={rank} />
      </div>

      {/* Player info caption — sits directly below the trophy */}
      <div className="relative z-10 mt-3 mb-3 w-full text-center">
        <p
          className={`mx-auto max-w-full truncate font-bold leading-tight text-foreground ${
            rank === 1 ? "text-base sm:text-lg" : "text-sm"
          }`}
          title={name}
        >
          {name}
        </p>

        {(item.country || country) ? (
          <div className="mt-0.5 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
            {item.country ? <CountryFlag code={item.country} className="shadow-sm" /> : null}
            <span className="truncate">{country || t("lbUnknownCountry")}</span>
          </div>
        ) : null}

        <div className="mt-1.5 flex items-baseline justify-center gap-1">
          <span
            className={`font-black tabular-nums ${theme.accent} ${
              rank === 1 ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl"
            }`}
          >
            {item.wpm}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {t("lbWpm")}
          </span>
        </div>

        <div className="mt-0.5 flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Target className="h-2.5 w-2.5" />
            {item.accuracy}%
          </span>
          <span className="text-border">·</span>
          <span className="inline-flex items-center gap-1">
            <Trophy className="h-2.5 w-2.5" />
            {score}
          </span>
        </div>
      </div>

      {/* White pillar with giant metallic rank number on its face */}
      <div
        className={`relative w-full ${theme.pillarHeight} rounded-t-md bg-gradient-to-b from-white to-slate-100 shadow-[0_30px_60px_-20px_rgba(15,23,42,0.25),inset_-6px_0_12px_-6px_rgba(0,0,0,0.08),inset_6px_0_12px_-6px_rgba(255,255,255,0.9)] dark:from-slate-200 dark:to-slate-300`}
      >
        {/* Top edge highlight */}
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-1 rounded-t-md bg-gradient-to-r from-transparent via-white to-transparent"
        />

        {/* Large metallic rank number, filled via gradient + background-clip */}
        <div className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 items-center justify-center">
          <span
            className={`bg-clip-text font-black leading-none tracking-tight text-transparent ${theme.numberGradient} ${theme.numberShadow} ${
              rank === 1
                ? "text-[110px] sm:text-[140px]"
                : rank === 2
                  ? "text-[80px] sm:text-[100px]"
                  : "text-[60px] sm:text-[80px]"
            }`}
          >
            {rank}
          </span>
        </div>
      </div>

      {/* Cast shadow beneath the pillar */}
      <div
        aria-hidden
        className="h-2 w-[85%] rounded-[50%] bg-slate-900/15 blur-md dark:bg-black/40"
      />
    </div>
  );
}

function PodiumStage({
  podiumItems,
  playerLabel,
  t,
}: {
  podiumItems: Array<{ item: LeaderboardItem; rank: number; score: number }>;
  playerLabel: (item: LeaderboardItem) => string;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  // Order: bronze (3) left, gold (1) center, silver (2) right — matches the
  // studio podium reference with the tallest pillar in the middle.
  const displayOrder =
    podiumItems.length >= 3
      ? [podiumItems[2], podiumItems[0], podiumItems[1]]
      : podiumItems.length === 2
        ? [podiumItems[1], podiumItems[0]]
        : podiumItems;

  return (
    <div data-testid="podium-stage" className="relative overflow-hidden rounded-3xl border border-border/60 bg-[linear-gradient(135deg,#f5f5f4_0%,#e7e5e4_55%,#d6d3d1_100%)] shadow-xl dark:bg-[linear-gradient(135deg,#1e293b_0%,#0f172a_55%,#020617_100%)]">
      {/* Diagonal light rays — window blinds effect */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "repeating-linear-gradient(115deg, rgba(255,255,255,0.35) 0 2px, transparent 2px 28px, rgba(255,255,255,0.22) 28px 30px, transparent 30px 70px)",
          maskImage: "radial-gradient(ellipse at 30% 10%, black 0%, transparent 70%)",
          WebkitMaskImage: "radial-gradient(ellipse at 30% 10%, black 0%, transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60 dark:opacity-30"
        style={{
          background:
            "repeating-linear-gradient(60deg, rgba(255,255,255,0.25) 0 1px, transparent 1px 40px, rgba(255,255,255,0.12) 40px 42px, transparent 42px 90px)",
          maskImage: "radial-gradient(ellipse at 80% 5%, black 0%, transparent 65%)",
          WebkitMaskImage: "radial-gradient(ellipse at 80% 5%, black 0%, transparent 65%)",
        }}
      />

      {/* Soft vignette floor */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/10 via-black/5 to-transparent dark:from-black/50 dark:via-black/20"
      />

      {/* Header ribbon */}
      <div className="relative flex items-center justify-center gap-3 px-4 pt-6">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-foreground/20" />
        <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-white/60 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-amber-700 shadow-sm backdrop-blur dark:bg-slate-900/50 dark:text-amber-300">
          <Trophy className="h-3 w-3" />
          {t("lbTopThree", { defaultValue: "Top 3 Champions" })}
        </div>
        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-foreground/20" />
      </div>

      {/* Podium row — pillars aligned at the bottom so heights tell the story */}
      <div className="relative flex items-end justify-center gap-4 px-4 pt-10 pb-6 sm:gap-8 sm:px-10">
        {displayOrder.map((entry) => {
          const theme = PODIUM_THEMES[entry.rank] ?? PODIUM_THEMES[3];
          const isFirst = entry.rank === 1;
          return (
            <div
              key={`podium-${entry.item.id}-${entry.rank}`}
              className={`${isFirst ? "w-[32%]" : "w-[28%]"} max-w-[200px]`}
            >
              <PodiumColumn entry={entry} theme={theme} playerLabel={playerLabel} t={t} />
            </div>
          );
        })}
      </div>
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

  const playerLabel = useCallback((item: LeaderboardItem): string => {
    const name = item.userName?.trim();
    return name ? name : t("lbAnonymous");
  }, [t]);

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
      const realtimeTable = readPublicConfig().supabaseResultsTable;
      supabaseChannel = supabase
        .channel("leaderboard-realtime")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: realtimeTable }, () => {
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
  }, [items, query, difficultyFilter, sortBy, playerLabel]);

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
