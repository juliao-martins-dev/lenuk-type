import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { getResultsFromSheetDB, postResultToSheetDB, type TypingResultRow } from "@/lib/sheetdb";

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
  if (candidate.wpm !== current.wpm) return candidate.wpm > current.wpm;
  if (candidate.accuracy !== current.accuracy) return candidate.accuracy > current.accuracy;
  if (candidate.rawWpm !== current.rawWpm) return candidate.rawWpm > current.rawWpm;
  if (candidate.errors !== current.errors) return candidate.errors < current.errors;
  return toTimeMs(candidate.createdAt) > toTimeMs(current.createdAt);
}

function leaderboardGroupKey(item: LeaderboardResult) {
  return [item.userId, item.mode, item.difficulty, item.durationSeconds].join("|");
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

    const result = await postResultToSheetDB(row);
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
    const results = await getResultsFromSheetDB();
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
                : entry.userId,
          country:
            typeof entry.country === "string" && entry.country
              ? entry.country.toUpperCase()
              : typeof metadataObj.country === "string"
                ? metadataObj.country.toUpperCase()
                : "",
          mode: typeof entry.mode === "string" ? entry.mode : "",
          difficulty: typeof entry.difficulty === "string" ? entry.difficulty : "",
          wpm: toNumber(entry.wpm),
          rawWpm: toNumber(entry.rawWpm),
          accuracy: toNumber(entry.accuracy),
          errors: toNumber(entry.errors),
          durationSeconds: toNumber(entry.durationSeconds)
        };
      })
      .filter((entry): entry is LeaderboardResult => {
        return Boolean(entry && typeof entry.id === "string" && typeof entry.userId === "string");
      });

    const latestProfileByUserId = new Map<string, { userName: string; country: string; timeMs: number }>();
    const bestByGroup = new Map<string, LeaderboardResult>();

    for (const entry of normalized) {
      const currentProfile = latestProfileByUserId.get(entry.userId);
      const entryTimeMs = toTimeMs(entry.createdAt);
      if (!currentProfile || entryTimeMs > currentProfile.timeMs) {
        latestProfileByUserId.set(entry.userId, {
          userName: entry.userName,
          country: entry.country,
          timeMs: entryTimeMs
        });
      }

      const key = leaderboardGroupKey(entry);
      const existing = bestByGroup.get(key);
      if (!existing || isBetterLeaderboardRun(entry, existing)) {
        bestByGroup.set(key, entry);
      }
    }

    const deduped = Array.from(bestByGroup.values())
      .map((entry) => {
        const latestProfile = latestProfileByUserId.get(entry.userId);
        if (!latestProfile) return entry;

        return {
          ...entry,
          userName: latestProfile.userName || entry.userName,
          country: latestProfile.country || entry.country
        };
      })
      .sort((a, b) => {
        if (isBetterLeaderboardRun(a, b)) return -1;
        if (isBetterLeaderboardRun(b, a)) return 1;
        return 0;
      })
      .slice(0, 50);

    return NextResponse.json({ results: deduped }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error("GET /api/results failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
