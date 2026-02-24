import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { getResultsFromSheetDB, postResultToSheetDB, type TypingResultRow } from "@/lib/sheetdb";

export const runtime = "nodejs";

const REQUIRED_FIELDS = ["userId", "mode", "difficulty", "durationSeconds", "wpm", "rawWpm", "accuracy", "errors", "promptId"];

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
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

    for (const field of REQUIRED_FIELDS) {
      if (payload[field] === undefined || payload[field] === null || payload[field] === "") {
        return NextResponse.json({ error: `Missing field: ${field}` }, { status: 400 });
      }
    }

    const player =
      typeof payload.player === "string" && payload.player.trim()
        ? payload.player.trim()
        : typeof payload.userName === "string" && payload.userName.trim()
          ? payload.userName.trim()
          : "";

    if (!player) {
      return NextResponse.json({ error: "Missing field: player" }, { status: 400 });
    }

    const row: TypingResultRow = {
      id: payload.id || randomUUID(),
      createdAt: payload.createdAt || new Date().toISOString(),
      userId: String(payload.userId),
      player,
      mode: String(payload.mode),
      difficulty: String(payload.difficulty),
      durationSeconds: toNumber(payload.durationSeconds),
      wpm: toNumber(payload.wpm),
      rawWpm: toNumber(payload.rawWpm),
      accuracy: toNumber(payload.accuracy),
      errors: toNumber(payload.errors),
      promptId: String(payload.promptId),
      metadata: typeof payload.metadata === "string" ? payload.metadata : JSON.stringify(payload.metadata ?? {}),
      country: typeof payload.country === "string" ? payload.country.toUpperCase() : ""
    };

    const result = await postResultToSheetDB(row);
    return NextResponse.json({ success: true, row, sheetdb: result });
  } catch (error) {
    console.error("POST /api/results failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
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
          ...entry,
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

    return NextResponse.json({ results: deduped });
  } catch (error) {
    console.error("GET /api/results failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
