/**
 * Server-side plausibility checks for typing results.
 *
 * The API previously only clamped values to wide bounds, so a single curl
 * loop could flood the leaderboard with `wpm: 500`. These checks recompute
 * the claimed WPM and accuracy from the character counts the client sends in
 * `metadata` and reject rows whose numbers disagree — which is exactly the
 * shape of a hand-crafted POST.
 *
 * Kept framework-free so it can be unit-tested without booting Next.
 */

/**
 * The WPM formula the client engine uses (see lib/engine/typing-engine.ts):
 *
 *     wpm = correctChars / 5 / minutes,  minutes = max(elapsed/60, 1/60)
 *
 * Mirrored here so server-recomputed values align within floating-point noise.
 */
export function wpmFromChars(correctChars: number, elapsedSeconds: number): number {
  const minutes = Math.max(elapsedSeconds / 60, 1 / 60);
  return correctChars / 5 / minutes;
}

/** World-record territory is ~220 WPM. Anything above 250 is rejected outright. */
export const PLAUSIBLE_WPM_MAX = 250;

/** Allowed drift between client-rounded and server-recomputed WPM (float/rounding noise). */
export const WPM_TOLERANCE = 2;

/** Allowed drift between claimed accuracy and `(correct / typed) * 100`. */
export const ACCURACY_TOLERANCE_PCT = 1.5;

/** Small buffer on top of the nominal duration for clock-skew on finished events. */
export const ELAPSED_DURATION_BUFFER_SECONDS = 2;

export interface PlausibilityInput {
  wpm: number;
  accuracy: number;
  durationSeconds: number;
  correctChars: number;
  typedChars: number;
  elapsedSeconds: number;
}

export type PlausibilityResult =
  | { ok: true }
  | { ok: false; reason: string };

export function checkResultPlausibility(input: PlausibilityInput): PlausibilityResult {
  const { wpm, accuracy, durationSeconds, correctChars, typedChars, elapsedSeconds } = input;

  if (!Number.isFinite(correctChars) || !Number.isFinite(typedChars) || !Number.isFinite(elapsedSeconds)) {
    return { ok: false, reason: "Missing run metadata (correctChars/typedChars/elapsed)" };
  }

  if (correctChars < 0 || typedChars < 0 || elapsedSeconds <= 0) {
    return { ok: false, reason: "Non-positive run metadata" };
  }

  if (typedChars < correctChars) {
    return { ok: false, reason: "typedChars less than correctChars" };
  }

  if (elapsedSeconds > durationSeconds + ELAPSED_DURATION_BUFFER_SECONDS) {
    return { ok: false, reason: "elapsed exceeds nominal duration" };
  }

  if (wpm > PLAUSIBLE_WPM_MAX) {
    return { ok: false, reason: `wpm exceeds plausible bound (${PLAUSIBLE_WPM_MAX})` };
  }

  const recomputedWpm = wpmFromChars(correctChars, elapsedSeconds);
  if (Math.abs(wpm - recomputedWpm) > WPM_TOLERANCE) {
    return { ok: false, reason: "claimed wpm does not match correctChars/elapsed" };
  }

  const recomputedAccuracy = typedChars === 0 ? 0 : (correctChars / typedChars) * 100;
  if (Math.abs(accuracy - recomputedAccuracy) > ACCURACY_TOLERANCE_PCT) {
    return { ok: false, reason: "claimed accuracy does not match correct/typed chars" };
  }

  return { ok: true };
}
