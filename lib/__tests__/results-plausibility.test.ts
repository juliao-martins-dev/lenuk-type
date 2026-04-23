import { describe, expect, it } from "vitest";
import {
  PLAUSIBLE_WPM_MAX,
  checkResultPlausibility,
  wpmFromChars
} from "@/lib/results-plausibility";

/**
 * Build a plausible run — 60 s, 80 wpm, 100% accuracy. Each test mutates one
 * field so the plausibility failure is unambiguous.
 */
function baseRun() {
  // 80 wpm × 60 s → 400 correct chars over 60 s
  const correctChars = 400;
  const typedChars = 400;
  const elapsedSeconds = 60;
  return {
    wpm: wpmFromChars(correctChars, elapsedSeconds),
    accuracy: 100,
    durationSeconds: 60,
    correctChars,
    typedChars,
    elapsedSeconds
  };
}

describe("checkResultPlausibility", () => {
  it("accepts a plausible run", () => {
    expect(checkResultPlausibility(baseRun())).toEqual({ ok: true });
  });

  it("rejects wpm above the hard plausibility ceiling", () => {
    const result = checkResultPlausibility({
      ...baseRun(),
      wpm: PLAUSIBLE_WPM_MAX + 1,
      correctChars: 1500,
      typedChars: 1500
    });
    expect(result.ok).toBe(false);
  });

  it("rejects wpm inconsistent with correctChars/elapsed", () => {
    const run = baseRun();
    const result = checkResultPlausibility({ ...run, wpm: run.wpm + 50 });
    expect(result).toEqual({ ok: false, reason: expect.stringContaining("wpm") });
  });

  it("rejects accuracy inconsistent with char counts", () => {
    const run = baseRun();
    const result = checkResultPlausibility({ ...run, accuracy: 50 });
    expect(result).toEqual({ ok: false, reason: expect.stringContaining("accuracy") });
  });

  it("rejects typedChars below correctChars (impossible)", () => {
    const run = baseRun();
    const result = checkResultPlausibility({
      ...run,
      correctChars: 500,
      typedChars: 300
    });
    expect(result.ok).toBe(false);
  });

  it("rejects elapsed that exceeds the nominal duration", () => {
    const run = baseRun();
    const result = checkResultPlausibility({ ...run, elapsedSeconds: run.durationSeconds + 10 });
    expect(result.ok).toBe(false);
  });

  it("rejects zero or negative elapsed", () => {
    expect(checkResultPlausibility({ ...baseRun(), elapsedSeconds: 0 }).ok).toBe(false);
    expect(checkResultPlausibility({ ...baseRun(), elapsedSeconds: -1 }).ok).toBe(false);
  });

  it("rejects missing metadata (NaN sentinels)", () => {
    const run = baseRun();
    expect(checkResultPlausibility({ ...run, correctChars: Number.NaN }).ok).toBe(false);
    expect(checkResultPlausibility({ ...run, typedChars: Number.NaN }).ok).toBe(false);
    expect(checkResultPlausibility({ ...run, elapsedSeconds: Number.NaN }).ok).toBe(false);
  });

  it("allows small wpm rounding drift within tolerance", () => {
    const run = baseRun();
    // Client rounds wpm to 1 decimal before sending; server recomputes raw.
    const result = checkResultPlausibility({ ...run, wpm: run.wpm + 0.05 });
    expect(result).toEqual({ ok: true });
  });

  it("allows realistic fast run (150 wpm, partial duration)", () => {
    const elapsedSeconds = 30;
    const correctChars = 750; // 150 wpm × 0.5 min × 5 chars = 375 — wait that's 150 wpm means 150 * 5 / minutes = chars, so 150 * 5 * 0.5 = 375
    const recomputedChars = 150 * 5 * (elapsedSeconds / 60);
    const result = checkResultPlausibility({
      wpm: 150,
      accuracy: 100,
      durationSeconds: 60,
      correctChars: recomputedChars,
      typedChars: recomputedChars,
      elapsedSeconds
    });
    expect(result).toEqual({ ok: true });
    // Silence the unused-var lint — keeps the math-walk-through for readers.
    void correctChars;
  });
});
