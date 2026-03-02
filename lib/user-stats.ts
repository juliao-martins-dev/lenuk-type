"use client";

import { DurationSeconds } from "@/lib/engine/typing-engine";

export type DifficultyValue = "easy" | "medium" | "hard";

export type StoredRun = {
  id: string;
  at: string;
  wpm: number;
  rawWpm: number;
  accuracy: number;
  errors: number;
  durationSeconds: DurationSeconds;
  mode: "text" | "code";
  difficulty: DifficultyValue;
  wordCount: number | null;
  languageCode: string | null;
  promptId: string;
  elapsedSeconds: number;
  typedChars: number;
  correctChars: number;
  userName?: string;
  country?: string;
};

export type UserStats = {
  version: 1;
  createdAt: string;
  updatedAt: string;
  profile: {
    name: string;
    country: string;
  };
  totals: {
    testsStarted: number;
    testsCompleted: number;
    timeTypingSeconds: number;
    typedChars: number;
    correctChars: number;
    errors: number;
  };
  bestOverall: StoredRun | null;
  bestByDuration: Record<DurationSeconds, StoredRun | null>;
  recentRuns: StoredRun[];
};

export type RunCompletePayload = Omit<StoredRun, "id" | "at"> & {
  id?: string;
  at?: string;
};

export type RunStartedPayload = {
  name?: string;
  country?: string;
};

const STORAGE_KEY = "lenuk-user-stats-v1";
const RUN_LIMIT = 220;

function nowIso() {
  return new Date().toISOString();
}

function createEmptyStats(): UserStats {
  const now = nowIso();
  return {
    version: 1,
    createdAt: now,
    updatedAt: now,
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

function normalizeStats(value: unknown): UserStats {
  if (!value || typeof value !== "object") return createEmptyStats();
  const parsed = value as Partial<UserStats>;
  const defaults = createEmptyStats();

  return {
    version: 1,
    createdAt: typeof parsed.createdAt === "string" && parsed.createdAt ? parsed.createdAt : defaults.createdAt,
    updatedAt: typeof parsed.updatedAt === "string" && parsed.updatedAt ? parsed.updatedAt : defaults.updatedAt,
    profile: {
      name: parsed.profile?.name ?? "",
      country: parsed.profile?.country ?? ""
    },
    totals: {
      testsStarted: Number.isFinite(parsed.totals?.testsStarted) ? Number(parsed.totals?.testsStarted) : 0,
      testsCompleted: Number.isFinite(parsed.totals?.testsCompleted) ? Number(parsed.totals?.testsCompleted) : 0,
      timeTypingSeconds: Number.isFinite(parsed.totals?.timeTypingSeconds) ? Number(parsed.totals?.timeTypingSeconds) : 0,
      typedChars: Number.isFinite(parsed.totals?.typedChars) ? Number(parsed.totals?.typedChars) : 0,
      correctChars: Number.isFinite(parsed.totals?.correctChars) ? Number(parsed.totals?.correctChars) : 0,
      errors: Number.isFinite(parsed.totals?.errors) ? Number(parsed.totals?.errors) : 0
    },
    bestOverall: parsed.bestOverall ?? null,
    bestByDuration: {
      15: parsed.bestByDuration?.[15 as DurationSeconds] ?? null,
      30: parsed.bestByDuration?.[30 as DurationSeconds] ?? null,
      60: parsed.bestByDuration?.[60 as DurationSeconds] ?? null
    },
    recentRuns: Array.isArray(parsed.recentRuns) ? parsed.recentRuns.slice(0, RUN_LIMIT) : []
  };
}

function persist(stats: UserStats) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch (error) {
    console.warn("Unable to persist user stats", error);
  }
}

export function readUserStats(): UserStats | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createEmptyStats();
    const parsed = JSON.parse(raw);
    if (parsed?.version !== 1) return createEmptyStats();
    return normalizeStats(parsed);
  } catch (error) {
    console.warn("Unable to read user stats", error);
    return createEmptyStats();
  }
}

export function clearUserStats() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn("Unable to clear user stats", error);
  }
}

function isBetterRun(candidate: StoredRun, current: StoredRun | null) {
  if (!current) return true;
  if (candidate.wpm !== current.wpm) return candidate.wpm > current.wpm;
  if (candidate.accuracy !== current.accuracy) return candidate.accuracy > current.accuracy;
  return candidate.errors < current.errors;
}

export function recordRunStarted(payload?: RunStartedPayload): UserStats | null {
  if (typeof window === "undefined") return null;
  const stats = readUserStats() ?? createEmptyStats();
  const now = nowIso();
  stats.totals.testsStarted += 1;
  stats.updatedAt = now;
  if (payload?.name) stats.profile.name = payload.name;
  if (payload?.country) stats.profile.country = payload.country;
  persist(stats);
  return stats;
}

export function recordRunCompleted(payload: RunCompletePayload): UserStats | null {
  if (typeof window === "undefined") return null;
  const stats = readUserStats() ?? createEmptyStats();
  const now = nowIso();
  const run: StoredRun = {
    id: payload.id || (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `run-${Date.now()}`),
    at: payload.at || now,
    wpm: Number(payload.wpm?.toFixed?.(1) ?? payload.wpm ?? 0),
    rawWpm: Number(payload.rawWpm?.toFixed?.(1) ?? payload.rawWpm ?? 0),
    accuracy: Number(payload.accuracy?.toFixed?.(1) ?? payload.accuracy ?? 0),
    errors: payload.errors ?? 0,
    durationSeconds: payload.durationSeconds,
    mode: payload.mode,
    difficulty: payload.difficulty,
    wordCount: payload.wordCount ?? null,
    languageCode: payload.languageCode ?? null,
    promptId: payload.promptId,
    elapsedSeconds: payload.elapsedSeconds ?? payload.durationSeconds,
    typedChars: payload.typedChars ?? 0,
    correctChars: payload.correctChars ?? 0,
    userName: payload.userName,
    country: payload.country
  };

  stats.totals.testsCompleted += 1;
  stats.totals.timeTypingSeconds += Math.max(0, run.elapsedSeconds || 0);
  stats.totals.typedChars += Math.max(0, run.typedChars);
  stats.totals.correctChars += Math.max(0, run.correctChars);
  stats.totals.errors += Math.max(0, run.errors);
  stats.updatedAt = now;
  stats.profile.name = payload.userName ?? stats.profile.name;
  stats.profile.country = payload.country ?? stats.profile.country;

  stats.recentRuns = [run, ...stats.recentRuns].slice(0, RUN_LIMIT);

  if (isBetterRun(run, stats.bestOverall)) {
    stats.bestOverall = run;
  }

  const currentDurationBest = stats.bestByDuration[run.durationSeconds];
  if (isBetterRun(run, currentDurationBest)) {
    stats.bestByDuration = { ...stats.bestByDuration, [run.durationSeconds]: run };
  }

  persist(stats);
  return stats;
}
