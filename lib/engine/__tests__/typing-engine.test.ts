import { describe, expect, it } from "vitest";
import { TypingEngine } from "@/lib/engine/typing-engine";

describe("TypingEngine", () => {
  it("starts with a clean snapshot", () => {
    const engine = new TypingEngine("abc", 30);
    const snapshot = engine.getSnapshot();

    expect(snapshot.text).toBe("abc");
    expect(snapshot.index).toBe(0);
    expect(Array.from(snapshot.statuses)).toEqual([0, 0, 0]);
    expect(snapshot.metrics.started).toBe(false);
    expect(snapshot.metrics.finished).toBe(false);
    expect(snapshot.metrics.errors).toBe(0);
    expect(snapshot.metrics.typedChars).toBe(0);
    expect(snapshot.metrics.correctChars).toBe(0);

    engine.dispose();
  });

  it("tracks correct and incorrect key presses", () => {
    const engine = new TypingEngine("ab", 30);

    engine.handleKey("a");
    engine.handleKey("x");

    const snapshot = engine.getSnapshot();

    expect(snapshot.index).toBe(2);
    expect(Array.from(snapshot.statuses)).toEqual([1, -1]);
    expect(snapshot.metrics.typedChars).toBe(2);
    expect(snapshot.metrics.correctChars).toBe(1);
    expect(snapshot.metrics.errors).toBe(1);
    expect(snapshot.metrics.finished).toBe(true);

    engine.dispose();
  });

  it("backspace rolls back index and metrics", () => {
    const engine = new TypingEngine("abc", 30);

    engine.handleKey("a");
    engine.handleKey("x");
    engine.handleBackspace();

    const snapshot = engine.getSnapshot();

    expect(snapshot.index).toBe(1);
    expect(Array.from(snapshot.statuses)).toEqual([1, 0, 0]);
    expect(snapshot.metrics.typedChars).toBe(1);
    expect(snapshot.metrics.correctChars).toBe(1);
    expect(snapshot.metrics.errors).toBe(0);
    expect(snapshot.metrics.finished).toBe(false);

    engine.dispose();
  });

  it("ignores backspace at index zero", () => {
    const engine = new TypingEngine("abc", 30);

    engine.handleBackspace();
    const snapshot = engine.getSnapshot();

    expect(snapshot.index).toBe(0);
    expect(Array.from(snapshot.statuses)).toEqual([0, 0, 0]);
    expect(snapshot.metrics.typedChars).toBe(0);

    engine.dispose();
  });

  it("restart resets state and supports duration updates", () => {
    const engine = new TypingEngine("ab", 30);

    engine.handleKey("a");
    engine.handleKey("b");
    expect(engine.getSnapshot().metrics.finished).toBe(true);

    engine.restart(60);
    const snapshot = engine.getSnapshot();

    expect(snapshot.index).toBe(0);
    expect(Array.from(snapshot.statuses)).toEqual([0, 0]);
    expect(snapshot.metrics.finished).toBe(false);
    expect(snapshot.metrics.started).toBe(false);
    expect(snapshot.metrics.timeLeft).toBe(60);
    expect(snapshot.metrics.typedChars).toBe(0);
    expect(snapshot.metrics.correctChars).toBe(0);
    expect(snapshot.metrics.errors).toBe(0);

    engine.dispose();
  });

  it("ignores extra input after finishing", () => {
    const engine = new TypingEngine("a", 30);

    engine.handleKey("a");
    const finishedSnapshot = engine.getSnapshot();
    engine.handleKey("b");
    engine.handleBackspace();
    const afterExtraInput = engine.getSnapshot();

    expect(finishedSnapshot.index).toBe(1);
    expect(finishedSnapshot.metrics.finished).toBe(true);
    expect(afterExtraInput.index).toBe(1);
    expect(Array.from(afterExtraInput.statuses)).toEqual([1]);
    expect(afterExtraInput.metrics.typedChars).toBe(1);
    expect(afterExtraInput.metrics.correctChars).toBe(1);
    expect(afterExtraInput.metrics.errors).toBe(0);

    engine.dispose();
  });
});
