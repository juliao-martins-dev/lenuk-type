import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { getResultsFromSupabase, postResultToSupabase, type TypingResultRow } from "@/lib/supabase-results";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REQUIRED_FIELDS = [
  "userId",
  "mode",
  "difficulty",
  "durationSeconds",
  "wpm",
  "rawWpm",
  "accuracy",
  "errors",
  "promptId"
] as const;
const ALLOWED_MODES = new Set(["text", "code"]);
const ALLOWED_DIFFICULTIES = new Set(["easy", "medium", "hard"]);
const ALLOWED_DURATIONS = new Set([15, 30, 60]);
const DIFFICULTY_WEIGHTS: Record<string, number> = {
  easy: 1,
  medium: 1.08,
  hard: 1.16
};
const MAX_LEADERBOARD_RESULTS = Math.max(
  1,
  Number.parseInt(process.env.LEADERBOARD_MAX_RESULTS ?? "100", 10) || 100
);
const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate"
} as const;

type JsonRecord = Record<string, unknown>;

function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function sanitizeString(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function normalizeCountry(value: unknown) {
  const normalized = sanitizeString(value, 2).toUpperCase();
  return /^[A-Z]{2}$/.test(normalized) ? normalized : "";
}

function normalizeMode(value: unknown) {
  const normalized = sanitizeString(value, 16).toLowerCase();
  return ALLOWED_MODES.has(normalized) ? normalized : "";
}

function normalizeDifficulty(value: unknown) {
  const normalized = sanitizeString(value, 16).toLowerCase();
  return ALLOWED_DIFFICULTIES.has(normalized) ? normalized : "";
}

function toSafeMetadataJson(value: unknown) {
  if (typeof value === "string") {
    return value.slice(0, 20000);
  }

  try {
    return JSON.stringify(value ?? {}).slice(0, 20000);
  } catch {
    return "{}";
  }
}

function toTimeMs(value: unknown) {
  if (typeof value !== "string") return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function difficultyWeight(difficulty: string) {
  return DIFFICULTY_WEIGHTS[difficulty] ?? 1;
}

function leaderboardScore(item: LeaderboardResult) {
  const accuracyMultiplier = Math.min(1.03, Math.max(0.75, item.accuracy / 100));
  return item.wpm * accuracyMultiplier * difficultyWeight(item.difficulty);
}

type LeaderboardResult = {
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
};

function isBetterLeaderboardRun(candidate: LeaderboardResult, current: LeaderboardResult) {
  const scoreDiff = leaderboardScore(candidate) - leaderboardScore(current);
  if (Math.abs(scoreDiff) > 0.001) return scoreDiff > 0;
  if (candidate.accuracy !== current.accuracy) return candidate.accuracy > current.accuracy;
  if (candidate.wpm !== current.wpm) return candidate.wpm > current.wpm;
  if (candidate.errors !== current.errors) return candidate.errors < current.errors;
  if (candidate.rawWpm !== current.rawWpm) return candidate.rawWpm > current.rawWpm;
  return toTimeMs(candidate.createdAt) > toTimeMs(current.createdAt);
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    if (!isJsonRecord(payload)) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    for (const field of REQUIRED_FIELDS) {
      if (payload[field] === undefined || payload[field] === null || payload[field] === "") {
        return NextResponse.json({ error: `Missing field: ${field}` }, { status: 400, headers: NO_STORE_HEADERS });
      }
    }

    const player =
      typeof payload.player === "string" && payload.player.trim()
        ? sanitizeString(payload.player, 60)
        : typeof payload.userName === "string" && payload.userName.trim()
          ? sanitizeString(payload.userName, 60)
          : "";

    if (!player) {
      return NextResponse.json({ error: "Missing field: player" }, { status: 400, headers: NO_STORE_HEADERS });
    }

    const mode = sanitizeString(payload.mode, 16);
    if (!ALLOWED_MODES.has(mode)) {
      return NextResponse.json({ error: "Invalid mode" }, { status: 400, headers: NO_STORE_HEADERS });
    }

    const difficulty = sanitizeString(payload.difficulty, 16);
    if (!ALLOWED_DIFFICULTIES.has(difficulty)) {
      return NextResponse.json({ error: "Invalid difficulty" }, { status: 400, headers: NO_STORE_HEADERS });
    }

    const durationSeconds = Math.trunc(toNumber(payload.durationSeconds));
    if (!ALLOWED_DURATIONS.has(durationSeconds)) {
      return NextResponse.json({ error: "Invalid durationSeconds" }, { status: 400, headers: NO_STORE_HEADERS });
    }

    const row: TypingResultRow = {
      id: sanitizeString(payload.id, 120) || randomUUID(),
      createdAt: sanitizeString(payload.createdAt, 64) || new Date().toISOString(),
      userId: sanitizeString(payload.userId, 120),
      player,
      mode,
      difficulty,
      durationSeconds,
      wpm: clampNumber(toNumber(payload.wpm), 0, 500),
      rawWpm: clampNumber(toNumber(payload.rawWpm), 0, 500),
      accuracy: clampNumber(toNumber(payload.accuracy), 0, 100),
      errors: Math.max(0, Math.trunc(toNumber(payload.errors))),
      promptId: sanitizeString(payload.promptId, 200),
      metadata: toSafeMetadataJson(payload.metadata),
      country: normalizeCountry(payload.country)
    };

    if (!row.userId || !row.promptId) {
      return NextResponse.json({ error: "Invalid identifiers" }, { status: 400, headers: NO_STORE_HEADERS });
    }

    const result = await postResultToSupabase(row);
    return NextResponse.json({ success: true, row, supabase: result }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error("POST /api/results failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}

export async function GET() {
  try {
    const results = await getResultsFromSupabase();
    const normalized: LeaderboardResult[] = (Array.isArray(results) ? results : [])
      .map((entry) => {
        let metadataObj: Record<string, unknown> = {};
        if (typeof entry.metadata === "string" && entry.metadata.trim()) {
          try {
            metadataObj = JSON.parse(entry.metadata);
          } catch {
            metadataObj = {};
          }
        }

        return {
          id: entry.id,
          createdAt: typeof entry.createdAt === "string" ? entry.createdAt : "",
          userId: typeof entry.userId === "string" ? entry.userId : "",
          userName:
            typeof entry.player === "string" && entry.player
              ? entry.player
              : typeof metadataObj.userName === "string"
                ? metadataObj.userName
                : "Anonymous",
          country:
            typeof entry.country === "string" && entry.country
              ? normalizeCountry(entry.country)
              : typeof metadataObj.country === "string"
                ? normalizeCountry(metadataObj.country)
                : "",
          mode: normalizeMode(entry.mode),
          difficulty: normalizeDifficulty(entry.difficulty),
          wpm: toNumber(entry.wpm),
          rawWpm: toNumber(entry.rawWpm),
          accuracy: toNumber(entry.accuracy),
          errors: toNumber(entry.errors),
          durationSeconds: toNumber(entry.durationSeconds)
        };
      })
      .filter((entry): entry is LeaderboardResult => {
        return Boolean(
          entry &&
            typeof entry.id === "string" &&
            entry.id &&
            typeof entry.userId === "string" &&
            entry.userId &&
            ALLOWED_MODES.has(entry.mode) &&
            ALLOWED_DIFFICULTIES.has(entry.difficulty) &&
            ALLOWED_DURATIONS.has(entry.durationSeconds)
        );
      });

    const latestRunByUserId = new Map<string, LeaderboardResult>();

    for (const entry of normalized) {
      const existing = latestRunByUserId.get(entry.userId);
      if (!existing) {
        latestRunByUserId.set(entry.userId, entry);
        continue;
      }

      const entryTimeMs = toTimeMs(entry.createdAt);
      const existingTimeMs = toTimeMs(existing.createdAt);
      if (entryTimeMs > existingTimeMs || (entryTimeMs === existingTimeMs && entry.id > existing.id)) {
        latestRunByUserId.set(entry.userId, entry);
      }
    }

    const deduped = Array.from(latestRunByUserId.values())
      .sort((a, b) => {
        if (isBetterLeaderboardRun(a, b)) return -1;
        if (isBetterLeaderboardRun(b, a)) return 1;
        return 0;
      })
      .slice(0, MAX_LEADERBOARD_RESULTS);

    return NextResponse.json({ results: deduped }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error("GET /api/results failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
