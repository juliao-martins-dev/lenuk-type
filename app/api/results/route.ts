import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { getResultsFromSheetDB, postResultToSheetDB, type TypingResultRow } from "@/lib/sheetdb";

const REQUIRED_FIELDS = ["userId", "mode", "difficulty", "durationSeconds", "wpm", "rawWpm", "accuracy", "errors", "promptId"];

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();

    for (const field of REQUIRED_FIELDS) {
      if (payload[field] === undefined || payload[field] === null || payload[field] === "") {
        return NextResponse.json({ error: `Missing field: ${field}` }, { status: 400 });
      }
    }

    const row: TypingResultRow = {
      id: payload.id || randomUUID(),
      createdAt: payload.createdAt || new Date().toISOString(),
      userId: String(payload.userId),
      mode: String(payload.mode),
      difficulty: String(payload.difficulty),
      durationSeconds: toNumber(payload.durationSeconds),
      wpm: toNumber(payload.wpm),
      rawWpm: toNumber(payload.rawWpm),
      accuracy: toNumber(payload.accuracy),
      errors: toNumber(payload.errors),
      promptId: String(payload.promptId),
      metadata: typeof payload.metadata === "string" ? payload.metadata : JSON.stringify(payload.metadata ?? {})
    };

    const result = await postResultToSheetDB(row);
    return NextResponse.json({ success: true, row, sheetdb: result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const results = await getResultsFromSheetDB();
    const normalized = (Array.isArray(results) ? results : [])
      .map((entry) => ({
        ...entry,
        wpm: toNumber(entry.wpm),
        rawWpm: toNumber(entry.rawWpm),
        accuracy: toNumber(entry.accuracy),
        errors: toNumber(entry.errors),
        durationSeconds: toNumber(entry.durationSeconds)
      }))
      .sort((a, b) => b.wpm - a.wpm)
      .slice(0, 50);

    return NextResponse.json({ results: normalized });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
