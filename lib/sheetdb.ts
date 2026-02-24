const SHEETDB_URL = "https://sheetdb.io/api/v1/jdx5xt0rq2m09";

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

export async function postResultToSheetDB(row: TypingResultRow) {
  const response = await fetch(SHEETDB_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ data: [row] }),
    cache: "no-store"
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`SheetDB POST failed: ${response.status} ${message}`);
  }

  return response.json();
}

export async function getResultsFromSheetDB() {
  const response = await fetch(SHEETDB_URL, {
    method: "GET",
    headers: {
      "Content-Type": "application/json"
    },
    cache: "no-store"
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`SheetDB GET failed: ${response.status} ${message}`);
  }

  return response.json();
}
