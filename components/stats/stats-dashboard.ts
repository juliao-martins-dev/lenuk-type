"use client";

import type { StoredRun, UserStats } from "@/lib/user-stats";

export type RangeId = "day" | "week" | "month" | "quarter" | "all";

export type HeatmapCell = {
  key: string;
  date: Date;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
  isFuture: boolean;
};

export type HeatmapView = {
  weeks: HeatmapCell[][];
  totalTests: number;
  activeDays: number;
};

export type StatsView = {
  stats: UserStats;
  range: { id: RangeId; label: string; days: number | null };
  filteredRunsDesc: StoredRun[];
  chartRuns: StoredRun[];
  displayRuns: StoredRun[];
  hasFilteredRuns: boolean;
  hasAnyRuns: boolean;
  avgWpm: number;
  avgRawWpm: number;
  avgAccuracy: number;
  characterAccuracy: number;
  bestWpm: number;
  bestAccuracy: number;
  consistency: number;
  activeDays: number;
  averageRunsPerActiveDay: number;
  filteredTimeTypingSeconds: number;
  filteredTypedChars: number;
  filteredCorrectChars: number;
  filteredErrors: number;
  errorRate: number;
  completionRate: number;
  currentStreak: number;
  bestStreak: number;
  heatmap: HeatmapView;
  durationCards: Array<{ label: string; run: StoredRun | null }>;
  bestOverall: StoredRun | null;
  bestScopeRun: StoredRun | null;
  latestRun: StoredRun | null;
  scopeLabel: string;
  scopeDescription: string;
};

export const RANGE_OPTIONS: Array<{ id: RangeId; label: string; days: number | null }> = [
  { id: "day", label: "last day", days: 1 },
  { id: "week", label: "last week", days: 7 },
  { id: "month", label: "last month", days: 30 },
  { id: "quarter", label: "last 3 months", days: 90 },
  { id: "all", label: "all time", days: null }
];

export const DAY_LABELS = [
  { row: 0, label: "mon" },
  { row: 2, label: "wed" },
  { row: 4, label: "fri" }
] as const;

const HEATMAP_WEEKS = 53;
const HEATMAP_DAYS = HEATMAP_WEEKS * 7;
const relativeTimeFormatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
const monthFormatter = new Intl.DateTimeFormat(undefined, { month: "short" });
const joinedFormatter = new Intl.DateTimeFormat(undefined, { month: "short", year: "numeric" });
const dayFormatter = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });

export function emptyStats(): UserStats {
  return {
    version: 1,
    createdAt: "",
    updatedAt: "",
    profile: { name: "", country: "" },
    totals: {
      testsStarted: 0,
      testsCompleted: 0,
      timeTypingSeconds: 0,
      typedChars: 0,
      correctChars: 0,
      errors: 0
    },
    bestOverall: null,
    bestByDuration: {
      15: null,
      30: null,
      60: null
    },
    recentRuns: []
  };
}

export function average(values: number[]) {
  if (values.length === 0) return 0;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

export function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function formatDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || hours > 0) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);
  return parts.join(" ");
}

export function formatDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

export function formatShortDate(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return dayFormatter.format(date);
}

export function formatRelativeTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "unknown";

  const diffMs = date.getTime() - Date.now();
  const absMs = Math.abs(diffMs);

  if (absMs < 60_000) return "just now";
  if (absMs < 3_600_000) return relativeTimeFormatter.format(Math.round(diffMs / 60_000), "minute");
  if (absMs < 86_400_000) return relativeTimeFormatter.format(Math.round(diffMs / 3_600_000), "hour");
  return relativeTimeFormatter.format(Math.round(diffMs / 86_400_000), "day");
}

export function formatJoinedDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "today";
  return joinedFormatter.format(date);
}

export function startOfLocalDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function startOfWeek(date: Date) {
  const next = startOfLocalDay(date);
  const shift = (next.getDay() + 6) % 7;
  next.setDate(next.getDate() - shift);
  return next;
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function dayKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getRangeConfig(rangeId: RangeId) {
  return RANGE_OPTIONS.find((option) => option.id === rangeId) ?? RANGE_OPTIONS[RANGE_OPTIONS.length - 1];
}

function standardDeviation(values: number[]) {
  if (values.length <= 1) return 0;
  const mean = values.reduce((total, value) => total + value, 0) / values.length;
  const variance = values.reduce((total, value) => total + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function calculateConsistency(runs: StoredRun[]) {
  if (runs.length === 0) return 0;
  if (runs.length === 1) return 100;

  const wpmValues = runs.map((run) => run.wpm).filter((value) => Number.isFinite(value) && value > 0);
  if (wpmValues.length <= 1) return 100;

  const mean = wpmValues.reduce((total, value) => total + value, 0) / wpmValues.length;
  const deviation = standardDeviation(wpmValues);
  if (mean <= 0) return 0;

  return Math.round(clamp(100 - (deviation / mean) * 100, 0, 100));
}

function getRunDate(run: StoredRun) {
  const date = new Date(run.at);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function isBetterRun(candidate: StoredRun, current: StoredRun | null) {
  if (!current) return true;
  if (candidate.wpm !== current.wpm) return candidate.wpm > current.wpm;
  if (candidate.accuracy !== current.accuracy) return candidate.accuracy > current.accuracy;
  return candidate.errors < current.errors;
}

function calculateStreaks(runs: StoredRun[]) {
  const uniqueDaysDesc = Array.from(
    new Set(
      runs
        .map((run) => getRunDate(run))
        .filter((date): date is Date => Boolean(date))
        .map((date) => dayKey(date))
    )
  )
    .map((key) => startOfLocalDay(new Date(`${key}T00:00:00`)))
    .sort((a, b) => b.getTime() - a.getTime());

  if (uniqueDaysDesc.length === 0) {
    return { current: 0, best: 0 };
  }

  let best = 1;
  let streak = 1;

  for (let index = 1; index < uniqueDaysDesc.length; index += 1) {
    const currentDay = uniqueDaysDesc[index];
    const previousDay = uniqueDaysDesc[index - 1];
    const diff = Math.round((previousDay.getTime() - currentDay.getTime()) / 86_400_000);

    if (diff === 1) {
      streak += 1;
      best = Math.max(best, streak);
    } else {
      streak = 1;
    }
  }

  let current = 1;
  for (let index = 1; index < uniqueDaysDesc.length; index += 1) {
    const diff = Math.round((uniqueDaysDesc[index - 1].getTime() - uniqueDaysDesc[index].getTime()) / 86_400_000);
    if (diff !== 1) break;
    current += 1;
  }

  return { current, best };
}

function heatLevel(count: number, maxCount: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0 || maxCount <= 0) return 0;
  const bucket = Math.ceil((count / maxCount) * 4);
  return clamp(bucket, 1, 4) as 1 | 2 | 3 | 4;
}

function buildHeatmap(runs: StoredRun[]): HeatmapView {
  const today = startOfLocalDay(new Date());
  const weekCursor = startOfWeek(today);
  const start = addDays(weekCursor, -(HEATMAP_DAYS - 7));
  const dayCounts = new Map<string, number>();

  for (const run of runs) {
    const date = getRunDate(run);
    if (!date) continue;

    const localDate = startOfLocalDay(date);
    if (localDate < start || localDate > today) continue;

    const key = dayKey(localDate);
    dayCounts.set(key, (dayCounts.get(key) ?? 0) + 1);
  }

  const maxCount = Math.max(0, ...dayCounts.values());
  const weeks: HeatmapCell[][] = [];

  for (let weekIndex = 0; weekIndex < HEATMAP_WEEKS; weekIndex += 1) {
    const weekStart = addDays(start, weekIndex * 7);
    const week: HeatmapCell[] = [];

    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      const date = addDays(weekStart, dayIndex);
      const key = dayKey(date);
      const isFuture = date > today;
      const count = isFuture ? 0 : dayCounts.get(key) ?? 0;

      week.push({
        key,
        date,
        count,
        level: heatLevel(count, maxCount),
        isFuture
      });
    }

    weeks.push(week);
  }

  return {
    weeks,
    totalTests: sum(Array.from(dayCounts.values())),
    activeDays: dayCounts.size
  };
}

export function buildStatsView(stats: UserStats | null, rangeId: RangeId): StatsView {
  const safe = stats ?? emptyStats();
  const allRunsDesc = [...safe.recentRuns].sort((a, b) => {
    const left = getRunDate(a)?.getTime() ?? 0;
    const right = getRunDate(b)?.getTime() ?? 0;
    return right - left;
  });
  const range = getRangeConfig(rangeId);
  const today = startOfLocalDay(new Date());
  const rangeStart = range.days === null ? null : addDays(today, -(range.days - 1));
  const filteredRunsDesc = allRunsDesc.filter((run) => {
    if (!rangeStart) return true;
    const date = getRunDate(run);
    if (!date) return false;
    return startOfLocalDay(date) >= rangeStart;
  });

  const filteredTypedChars = sum(filteredRunsDesc.map((run) => Math.max(0, run.typedChars)));
  const filteredCorrectChars = sum(filteredRunsDesc.map((run) => Math.max(0, run.correctChars)));
  const filteredErrors = sum(filteredRunsDesc.map((run) => Math.max(0, run.errors)));
  const filteredTimeTypingSeconds = sum(filteredRunsDesc.map((run) => Math.max(0, run.elapsedSeconds || run.durationSeconds)));
  const activeDays = new Set(
    filteredRunsDesc
      .map((run) => getRunDate(run))
      .filter((date): date is Date => Boolean(date))
      .map((date) => dayKey(date))
  ).size;

  const completionRate =
    safe.totals.testsStarted > 0 ? Math.min(100, Math.round((safe.totals.testsCompleted / safe.totals.testsStarted) * 100)) : 0;
  const bestScopeRun = filteredRunsDesc.reduce<StoredRun | null>((best, run) => (isBetterRun(run, best) ? run : best), null);
  const streaks = calculateStreaks(allRunsDesc);
  const avgWpm = average(filteredRunsDesc.map((run) => run.wpm));
  const avgRawWpm = average(filteredRunsDesc.map((run) => run.rawWpm));
  const avgAccuracy = average(filteredRunsDesc.map((run) => run.accuracy));
  const bestWpm = filteredRunsDesc.length > 0 ? Math.max(...filteredRunsDesc.map((run) => run.wpm)) : 0;
  const bestAccuracy = filteredRunsDesc.length > 0 ? Math.max(...filteredRunsDesc.map((run) => run.accuracy)) : 0;
  const characterAccuracy = filteredTypedChars > 0 ? Math.round((filteredCorrectChars / filteredTypedChars) * 1000) / 10 : avgAccuracy;
  const averageRunsPerActiveDay = activeDays > 0 ? Math.round((filteredRunsDesc.length / activeDays) * 10) / 10 : 0;
  const errorRate = filteredTypedChars > 0 ? Math.round((filteredErrors / filteredTypedChars) * 1000) / 10 : 0;

  return {
    stats: safe,
    range,
    filteredRunsDesc,
    chartRuns: filteredRunsDesc.slice(0, 14).reverse(),
    displayRuns: filteredRunsDesc.slice(0, 18),
    hasFilteredRuns: filteredRunsDesc.length > 0,
    hasAnyRuns: allRunsDesc.length > 0,
    avgWpm,
    avgRawWpm,
    avgAccuracy,
    characterAccuracy,
    bestWpm,
    bestAccuracy,
    consistency: calculateConsistency(filteredRunsDesc),
    activeDays,
    averageRunsPerActiveDay,
    filteredTimeTypingSeconds,
    filteredTypedChars,
    filteredCorrectChars,
    filteredErrors,
    errorRate,
    completionRate,
    currentStreak: streaks.current,
    bestStreak: streaks.best,
    heatmap: buildHeatmap(allRunsDesc),
    durationCards: [
      { label: "15s sprint", run: safe.bestByDuration[15] ?? null },
      { label: "30s focus", run: safe.bestByDuration[30] ?? null },
      { label: "60s endurance", run: safe.bestByDuration[60] ?? null }
    ],
    bestOverall: safe.bestOverall,
    bestScopeRun,
    latestRun: allRunsDesc[0] ?? null,
    scopeLabel: range.label,
    scopeDescription:
      range.days === null
        ? `All ${allRunsDesc.length} local runs available in this browser.`
        : `${filteredRunsDesc.length} completed runs captured in the ${range.label}.`
  };
}

export function heatmapCellClass(level: HeatmapCell["level"], isFuture: boolean) {
  if (isFuture) return "border-border/20 bg-background/20 opacity-40";
  if (level === 0) return "border-border/60 bg-background/70";
  if (level === 1) return "border-primary/15 bg-primary/15";
  if (level === 2) return "border-primary/25 bg-primary/30";
  if (level === 3) return "border-primary/35 bg-primary/55";
  return "border-primary/45 bg-primary shadow-[0_0_24px_hsl(var(--primary)/0.25)]";
}

export function getStoredProfile() {
  if (typeof window === "undefined") return { name: "", country: "" };
  return {
    name: localStorage.getItem("lenuk-user-name") ?? "",
    country: localStorage.getItem("lenuk-user-country") ?? ""
  };
}
