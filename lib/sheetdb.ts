import { setDefaultResultOrder } from "node:dns";

const SHEETDB_URL = "https://sheetdb.io/api/v1/jdx5xt0rq2m09";
const SHEETDB_TIMEOUT_MS = 8000;
const SHEETDB_GET_CACHE_TTL_MS = 4000;

try {
  // Helps Node/undici prefer IPv4 when IPv6 connectivity is broken in local/dev hosting environments.
  setDefaultResultOrder("ipv4first");
} catch {
  // Ignore when the runtime does not support changing DNS result order.
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

let cachedResults: unknown = null;
let cachedResultsAt = 0;
let inFlightGetResults: Promise<unknown> | null = null;

function describeError(error: unknown) {
  if (!(error instanceof Error)) return "Unknown error";

  const cause = (error as Error & { cause?: unknown }).cause;
  if (cause && typeof cause === "object") {
    const code = "code" in cause ? String((cause as { code?: unknown }).code ?? "") : "";
    const message = "message" in cause ? String((cause as { message?: unknown }).message ?? "") : "";
    if (code || message) {
      return `${error.message}${code || message ? ` (${[code, message].filter(Boolean).join(": ")})` : ""}`;
    }
  }

  return error.message;
}

async function sheetdbFetch(method: "GET" | "POST", body?: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SHEETDB_TIMEOUT_MS);

  try {
    return await fetch(SHEETDB_URL, {
      method,
      headers: {
        "Content-Type": "application/json"
      },
      body,
      cache: "no-store",
      signal: controller.signal
    });
  } catch (error) {
    throw new Error(`SheetDB ${method} request failed: ${describeError(error)}`);
  } finally {
    clearTimeout(timeout);
  }
}

export async function postResultToSheetDB(row: TypingResultRow) {
  const response = await sheetdbFetch("POST", JSON.stringify({ data: [row] }));

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`SheetDB POST failed: ${response.status} ${message}`);
  }

  const data = await response.json();
  cachedResults = null;
  cachedResultsAt = 0;
  return data;
}

export async function getResultsFromSheetDB() {
  const now = Date.now();
  if (cachedResults && now - cachedResultsAt < SHEETDB_GET_CACHE_TTL_MS) {
    return cachedResults;
  }

  if (!inFlightGetResults) {
    inFlightGetResults = (async () => {
      const response = await sheetdbFetch("GET");

      if (!response.ok) {
        const message = await response.text();
        throw new Error(`SheetDB GET failed: ${response.status} ${message}`);
      }

      const data = await response.json();
      cachedResults = data;
      cachedResultsAt = Date.now();
      return data;
    })().finally(() => {
      inFlightGetResults = null;
    });
  }

  return inFlightGetResults;
}
