import { setDefaultResultOrder } from "node:dns";
import { Pool, type QueryResultRow } from "pg";
import { getSupabaseServerClient } from "@/lib/supabase";

const SUPABASE_RESULTS_TABLE = process.env.SUPABASE_RESULTS_TABLE?.trim() || "lenuk_typing_users";
const SUPABASE_DB_URL =
  process.env.SUPABASE_DB_URL?.trim() ||
  process.env.DATABASE_URL?.trim() ||
  "";
const SUPABASE_GET_TIMEOUT_MS = 20_000;
const SUPABASE_POST_TIMEOUT_MS = 12_000;
const SUPABASE_PG_RETRY_COOLDOWN_MS = Math.max(
  0,
  Number.parseInt(process.env.SUPABASE_PG_RETRY_COOLDOWN_MS ?? "120000", 10) || 120_000
);
const SUPABASE_GET_CACHE_TTL_MS = Math.max(
  0,
  Number.parseInt(process.env.SUPABASE_RESULTS_CACHE_TTL_MS ?? "0", 10) || 0
);

try {
  // Helps Node/undici and database DNS resolution prefer IPv4 when IPv6 is flaky.
  setDefaultResultOrder("ipv4first");
} catch {
  // Ignore when unsupported by the runtime.
}

export interface TypingResultRow {
  id: string;
  createdAt: string;
  userId: string;
  player: string;
  mode: string;
  difficulty: string;
  durationSeconds: number;
  wpm: number;
  rawWpm: number;
  accuracy: number;
  errors: number;
  promptId: string;
  metadata: string;
  country: string;
}

interface SupabaseDbRow extends QueryResultRow {
  id: unknown;
  created_at: unknown;
  player: unknown;
  mode: unknown;
  difficulty: unknown;
  duration_seconds: unknown;
  wpm: unknown;
  raw_wpm: unknown;
  accuracy: unknown;
  prompt_id: unknown;
  metadata: unknown;
  country: unknown;
}

interface SupabaseRestRow {
  id?: unknown;
  created_at?: unknown;
  player?: unknown;
  mode?: unknown;
  difficulty?: unknown;
  duration_seconds?: unknown;
  wpm?: unknown;
  raw_wpm?: unknown;
  accuracy?: unknown;
  prompt_id?: unknown;
  metadata?: unknown;
  country?: unknown;
}

declare global {
  // eslint-disable-next-line no-var
  var __lenukTypeSupabasePgPool: Pool | undefined;
}

let cachedResults: TypingResultRow[] | null = null;
let cachedResultsAt = 0;
let inFlightGetResults: Promise<TypingResultRow[]> | null = null;
let pgReadRetryAt = 0;
let pgWriteRetryAt = 0;

type ResultsBackendKind = "unknown" | "cache" | "postgres" | "supabase-rest";

interface ResultsBackendDiagnostics {
  table: string;
  cacheTtlMs: number;
  pgRetryCooldownMs: number;
  pgConfigured: boolean;
  supabaseUrlConfigured: boolean;
  supabaseKeyConfigured: boolean;
  lastGetBackend: ResultsBackendKind;
  lastPostBackend: ResultsBackendKind;
  lastGetError: string | null;
  lastPostError: string | null;
  lastPgGetFallbackError: string | null;
  lastPgPostFallbackError: string | null;
  lastGetAt: string | null;
  lastPostAt: string | null;
  lastVisibleRowCount: number | null;
}

const backendDiagnostics: ResultsBackendDiagnostics = {
  table: SUPABASE_RESULTS_TABLE,
  cacheTtlMs: SUPABASE_GET_CACHE_TTL_MS,
  pgRetryCooldownMs: SUPABASE_PG_RETRY_COOLDOWN_MS,
  pgConfigured: Boolean(SUPABASE_DB_URL),
  supabaseUrlConfigured: Boolean(process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()),
  supabaseKeyConfigured: Boolean(
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
      process.env.SUPABASE_ANON_KEY?.trim() ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()
  ),
  lastGetBackend: "unknown",
  lastPostBackend: "unknown",
  lastGetError: null,
  lastPostError: null,
  lastPgGetFallbackError: null,
  lastPgPostFallbackError: null,
  lastGetAt: null,
  lastPostAt: null,
  lastVisibleRowCount: null
};

function nowIso() {
  return new Date().toISOString();
}

function markGetSuccess(backend: ResultsBackendKind, visibleRows: number) {
  backendDiagnostics.lastGetBackend = backend;
  backendDiagnostics.lastGetError = null;
  backendDiagnostics.lastGetAt = nowIso();
  backendDiagnostics.lastVisibleRowCount = visibleRows;
}

function markPostSuccess(backend: ResultsBackendKind) {
  backendDiagnostics.lastPostBackend = backend;
  backendDiagnostics.lastPostError = null;
  backendDiagnostics.lastPostAt = nowIso();
}

function markGetError(error: unknown) {
  backendDiagnostics.lastGetError = describeError(error);
  backendDiagnostics.lastGetAt = nowIso();
}

function markPostError(error: unknown) {
  backendDiagnostics.lastPostError = describeError(error);
  backendDiagnostics.lastPostAt = nowIso();
}

export function getResultsBackendDiagnostics() {
  const now = Date.now();
  return {
    ...backendDiagnostics,
    cachedResultsCount: cachedResults?.length ?? 0,
    cachedResultsAt: cachedResultsAt > 0 ? new Date(cachedResultsAt).toISOString() : null,
    cacheAgeMs: cachedResultsAt > 0 ? Math.max(0, Date.now() - cachedResultsAt) : null,
    pgReadRetryAt: pgReadRetryAt > now ? new Date(pgReadRetryAt).toISOString() : null,
    pgWriteRetryAt: pgWriteRetryAt > now ? new Date(pgWriteRetryAt).toISOString() : null,
    hasInFlightGet: inFlightGetResults !== null
  };
}

function describeError(error: unknown) {
  if (!(error instanceof Error)) return "Unknown error";

  const cause = error as Error & { code?: string; detail?: string; cause?: unknown };
  const details = [cause.code, cause.detail].filter(Boolean).join(": ");
  return details ? `${error.message} (${details})` : error.message;
}

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toStringValue(value: unknown, fallback = "") {
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  return fallback;
}

function toNormalizedToken(value: unknown, options?: { uppercase?: boolean }) {
  const raw = toStringValue(value).trim();
  if (!raw) return "";
  return options?.uppercase ? raw.toUpperCase() : raw.toLowerCase();
}

function toJsonRecord(value: unknown) {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function parseMetadataObject(value: unknown) {
  if (toJsonRecord(value)) {
    return { raw: JSON.stringify(value), data: value as Record<string, unknown> };
  }

  if (typeof value !== "string" || !value.trim()) {
    return { raw: "{}", data: {} as Record<string, unknown> };
  }

  try {
    const parsed = JSON.parse(value);
    const record = toJsonRecord(parsed);
    if (record) {
      return { raw: value, data: record };
    }

    return { raw: value, data: { value: parsed } as Record<string, unknown> };
  } catch {
    return { raw: JSON.stringify({ raw: value }), data: { raw: value } as Record<string, unknown> };
  }
}

function toStoredMetadata(row: TypingResultRow) {
  const parsed = parseMetadataObject(row.metadata);

  return JSON.stringify({
    ...parsed.data,
    userId: row.userId,
    errors: row.errors
  }).slice(0, 20_000);
}

function fromDbRow(row: SupabaseDbRow): TypingResultRow {
  const metadata = parseMetadataObject(row.metadata);
  const userId =
    toStringValue(metadata.data.userId) ||
    toStringValue(metadata.data.user_id) ||
    toStringValue(row.id);
  const errors = toNumber(metadata.data.errors ?? metadata.data.errorCount ?? metadata.data.error_count, 0);

  return {
    id: toStringValue(row.id),
    createdAt: toStringValue(row.created_at),
    userId,
    player: toStringValue(row.player),
    mode: toNormalizedToken(row.mode),
    difficulty: toNormalizedToken(row.difficulty),
    durationSeconds: toNumber(row.duration_seconds),
    wpm: toNumber(row.wpm),
    rawWpm: toNumber(row.raw_wpm),
    accuracy: toNumber(row.accuracy),
    errors,
    promptId: toStringValue(row.prompt_id),
    metadata: metadata.raw,
    country: toNormalizedToken(row.country, { uppercase: true })
  };
}

function normalizePostgresConnectionString(value: string) {
  try {
    // Already valid.
    // eslint-disable-next-line no-new
    new URL(value);
    return value;
  } catch {
    // Continue to best-effort repair for passwords containing "@".
  }

  if (!/^postgres(?:ql)?:\/\//i.test(value)) return value;

  const schemeEnd = value.indexOf("://") + 3;
  const firstSlashAfterHost = value.indexOf("/", schemeEnd);
  const lastAtBeforePath =
    firstSlashAfterHost >= 0 ? value.lastIndexOf("@", firstSlashAfterHost) : value.lastIndexOf("@");

  if (schemeEnd < 3 || lastAtBeforePath <= schemeEnd) return value;

  const auth = value.slice(schemeEnd, lastAtBeforePath);
  const separator = auth.indexOf(":");
  if (separator < 0) return value;

  const user = auth.slice(0, separator);
  const password = auth.slice(separator + 1);
  const encodedPassword = encodeURIComponent(password);

  return `${value.slice(0, schemeEnd)}${user}:${encodedPassword}${value.slice(lastAtBeforePath)}`;
}

function quoteIdentifier(identifier: string) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(identifier)) {
    throw new Error(`Invalid table name: ${identifier}`);
  }

  return `"${identifier}"`;
}

const RESULTS_TABLE_SQL = quoteIdentifier(SUPABASE_RESULTS_TABLE);
const SUPABASE_RESULTS_SELECT =
  "id,created_at,player,mode,difficulty,duration_seconds,wpm,raw_wpm,accuracy,prompt_id,metadata,country";

function getPool() {
  if (globalThis.__lenukTypeSupabasePgPool) {
    return globalThis.__lenukTypeSupabasePgPool;
  }

  if (!SUPABASE_DB_URL) {
    throw new Error("Missing SUPABASE_DB_URL (or DATABASE_URL) for Supabase Postgres connection");
  }

  const connectionString = normalizePostgresConnectionString(SUPABASE_DB_URL);

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 5,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000
  });

  globalThis.__lenukTypeSupabasePgPool = pool;
  return pool;
}

async function runQuery<T extends QueryResultRow>(text: string, values: unknown[], timeoutMs: number) {
  const pool = getPool();
  try {
    void timeoutMs;
    return await pool.query<T>(text, values);
  } catch (error) {
    throw new Error(describeError(error));
  }
}

function isPgConnectivityError(error: unknown) {
  if (!(error instanceof Error)) return false;
  const message = `${error.message} ${String((error as { cause?: unknown }).cause ?? "")}`.toLowerCase();
  return (
    message.includes("enotfound") ||
    message.includes("econnrefused") ||
    message.includes("etimedout") ||
    message.includes("timeout") ||
    message.includes("could not translate host name")
  );
}

function shouldTryPgRead() {
  if (!SUPABASE_DB_URL) return false;
  return Date.now() >= pgReadRetryAt;
}

function shouldTryPgWrite() {
  if (!SUPABASE_DB_URL) return false;
  return Date.now() >= pgWriteRetryAt;
}

function markPgReadUnavailable(error: unknown) {
  backendDiagnostics.lastPgGetFallbackError = describeError(error);
  pgReadRetryAt = Date.now() + SUPABASE_PG_RETRY_COOLDOWN_MS;
  console.warn(
    `Supabase Postgres GET unavailable, using Supabase REST for ${Math.round(SUPABASE_PG_RETRY_COOLDOWN_MS / 1000)}s: ${describeError(error)}`
  );
}

function markPgWriteUnavailable(error: unknown) {
  backendDiagnostics.lastPgPostFallbackError = describeError(error);
  pgWriteRetryAt = Date.now() + SUPABASE_PG_RETRY_COOLDOWN_MS;
  console.warn(
    `Supabase Postgres POST unavailable, using Supabase REST for ${Math.round(SUPABASE_PG_RETRY_COOLDOWN_MS / 1000)}s: ${describeError(error)}`
  );
}

function toSupabaseRestInsertRow(row: TypingResultRow): Record<string, unknown> {
  return {
    id: row.id,
    created_at: row.createdAt,
    player: row.player,
    mode: row.mode,
    difficulty: row.difficulty,
    duration_seconds: row.durationSeconds,
    wpm: row.wpm,
    raw_wpm: row.rawWpm,
    accuracy: row.accuracy,
    prompt_id: row.promptId,
    metadata: toStoredMetadata(row),
    country: row.country || null
  };
}

function fromSupabaseRestRow(row: SupabaseRestRow) {
  return fromDbRow(row as SupabaseDbRow);
}

async function postResultViaSupabaseRest(row: TypingResultRow) {
  const client = getSupabaseServerClient();
  const { data, error } = await client
    .from(SUPABASE_RESULTS_TABLE)
    .insert(toSupabaseRestInsertRow(row))
    .select(SUPABASE_RESULTS_SELECT);

  if (error) {
    if (/row-level security/i.test(error.message)) {
      throw new Error(
        `Supabase REST POST failed: ${error.message} (Add an INSERT policy on ${SUPABASE_RESULTS_TABLE}, or make the Postgres host reachable so the server can use SUPABASE_DB_URL.)`
      );
    }
    throw new Error(`Supabase REST POST failed: ${error.message}`);
  }

  const mapped = Array.isArray(data) ? data.map((entry) => fromSupabaseRestRow(entry)) : [];
  markPostSuccess("supabase-rest");
  return mapped;
}

async function getResultsViaSupabaseRest() {
  const client = getSupabaseServerClient();
  const { data, error } = await client
    .from(SUPABASE_RESULTS_TABLE)
    .select(SUPABASE_RESULTS_SELECT)
    .order("created_at", { ascending: false })
    .limit(1000);

  if (error) {
    if (/row-level security/i.test(error.message)) {
      throw new Error(
        `Supabase REST GET failed: ${error.message} (Add a SELECT policy on ${SUPABASE_RESULTS_TABLE}, or make the Postgres host reachable so the server can use SUPABASE_DB_URL.)`
      );
    }
    throw new Error(`Supabase REST GET failed: ${error.message}`);
  }

  const mapped = Array.isArray(data) ? data.map((entry) => fromSupabaseRestRow(entry)) : [];
  markGetSuccess("supabase-rest", mapped.length);
  return mapped;
}

export async function postResultToSupabase(row: TypingResultRow) {
  try {
    let insertedRows: TypingResultRow[];

    if (shouldTryPgWrite()) {
      try {
        const result = await runQuery<SupabaseDbRow>(
          `insert into ${RESULTS_TABLE_SQL}
            (id, created_at, player, mode, difficulty, duration_seconds, wpm, raw_wpm, accuracy, prompt_id, metadata, country)
           values
            ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
           returning
            id, created_at, player, mode, difficulty, duration_seconds, wpm, raw_wpm, accuracy, prompt_id, metadata, country`,
          [
            row.id,
            row.createdAt,
            row.player,
            row.mode,
            row.difficulty,
            row.durationSeconds,
            row.wpm,
            row.rawWpm,
            row.accuracy,
            row.promptId,
            toStoredMetadata(row),
            row.country || null
          ],
          SUPABASE_POST_TIMEOUT_MS
        );

        insertedRows = result.rows.map((dbRow: SupabaseDbRow) => fromDbRow(dbRow));
        pgWriteRetryAt = 0;
        markPostSuccess("postgres");
      } catch (error) {
        if (!isPgConnectivityError(error)) {
          throw new Error(`Supabase Postgres POST failed: ${describeError(error)}`);
        }

        markPgWriteUnavailable(error);
        insertedRows = await postResultViaSupabaseRest(row);
      }
    } else {
      insertedRows = await postResultViaSupabaseRest(row);
    }

    cachedResults = null;
    cachedResultsAt = 0;

    return insertedRows;
  } catch (error) {
    markPostError(error);
    throw error;
  }
}

export async function getResultsFromSupabase() {
  const now = Date.now();
  if (cachedResults && now - cachedResultsAt < SUPABASE_GET_CACHE_TTL_MS) {
    markGetSuccess("cache", cachedResults.length);
    return cachedResults;
  }

  if (!inFlightGetResults) {
    inFlightGetResults = (async () => {
      try {
        let normalized: TypingResultRow[];

        if (shouldTryPgRead()) {
          try {
            const result = await runQuery<SupabaseDbRow>(
              `select
                 id, created_at, player, mode, difficulty, duration_seconds, wpm, raw_wpm, accuracy, prompt_id, metadata, country
               from ${RESULTS_TABLE_SQL}
               order by created_at desc
               limit 1000`,
              [],
              SUPABASE_GET_TIMEOUT_MS
            );

            normalized = result.rows.map((dbRow: SupabaseDbRow) => fromDbRow(dbRow));
            pgReadRetryAt = 0;
            markGetSuccess("postgres", normalized.length);
          } catch (error) {
            if (!isPgConnectivityError(error)) {
              throw new Error(`Supabase Postgres GET failed: ${describeError(error)}`);
            }

            markPgReadUnavailable(error);
            normalized = await getResultsViaSupabaseRest();
          }
        } else {
          normalized = await getResultsViaSupabaseRest();
        }

        cachedResults = normalized;
        cachedResultsAt = Date.now();
        return normalized;
      } catch (error) {
        // If the DB is temporarily slow/unavailable, serve the last known good data.
        if (cachedResults) {
          return cachedResults;
        }

        markGetError(error);
        throw new Error(describeError(error));
      }
    })().finally(() => {
      inFlightGetResults = null;
    });
  }

  return inFlightGetResults;
}
