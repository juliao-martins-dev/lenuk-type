import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getResultsBackendDiagnostics, getResultsFromSupabase, postResultToSupabase } from "@/lib/supabase-results";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate"
} as const;

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const probeWrite = url.searchParams.get("probeWrite") === "1";
    const rows = await getResultsFromSupabase();
    const diagnostics = getResultsBackendDiagnostics();
    let writeProbe: { ok: boolean; error?: string; inserted?: number; testId?: string } | null = null;

    if (probeWrite) {
      const testId = randomUUID();
      try {
        const inserted = await postResultToSupabase({
          id: testId,
          createdAt: new Date().toISOString(),
          userId: `debug-probe:${testId}`,
          player: "debug-probe",
          mode: "text",
          difficulty: "easy",
          durationSeconds: 30,
          wpm: 1,
          rawWpm: 1,
          accuracy: 100,
          errors: 0,
          promptId: "debug:probe",
          metadata: JSON.stringify({ source: "api-results-debug-probe" }),
          country: "US"
        });
        writeProbe = { ok: true, inserted: inserted.length, testId };
      } catch (error) {
        writeProbe = { ok: false, error: error instanceof Error ? error.message : "Unknown error", testId };
      }
    }

    return NextResponse.json(
      {
        ok: true,
        serverTime: new Date().toISOString(),
        route: "/api/results/debug",
        visibleRows: Array.isArray(rows) ? rows.length : 0,
        sampleRows: (Array.isArray(rows) ? rows : []).slice(0, 5).map((row) => ({
          id: row.id,
          createdAt: row.createdAt,
          userId: row.userId,
          player: row.player,
          mode: row.mode,
          difficulty: row.difficulty,
          durationSeconds: row.durationSeconds,
          wpm: row.wpm,
          accuracy: row.accuracy,
          country: row.country
        })),
        diagnostics,
        writeProbe,
        notes: [
          "Use ?probeWrite=1 to test the same server-side save path used by finished typing.",
          "If visibleRows is 0 while you see rows in the Supabase dashboard, anon SELECT is blocked by RLS.",
          "If writeProbe fails with row-level security, anon INSERT is blocked by RLS."
        ]
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        serverTime: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
        diagnostics: getResultsBackendDiagnostics()
      },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
