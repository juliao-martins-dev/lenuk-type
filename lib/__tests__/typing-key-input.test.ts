import { describe, expect, it, vi } from "vitest";
import { TypingEngine } from "@/lib/engine/typing-engine";
import { dispatchTypingKey, type TypingKeyInput } from "@/lib/engine/typing-key-input";

type TestKeyEvent = TypingKeyInput & {
  preventDefault: ReturnType<typeof vi.fn>;
};

function createKeyEvent(overrides: Partial<TypingKeyInput> = {}) {
  return {
    key: "a",
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    defaultPrevented: false,
    isComposing: false,
    preventDefault: vi.fn(),
    ...overrides
  } as TestKeyEvent;
}

describe("dispatchTypingKey", () => {
  it("handles the first printable key immediately", () => {
    const engine = new TypingEngine("abc", 30);
    const event = createKeyEvent({ key: "a" });

    expect(dispatchTypingKey(engine, event)).toBe(true);
    expect(event.preventDefault).toHaveBeenCalledTimes(1);

    const snapshot = engine.getSnapshot();
    expect(snapshot.index).toBe(1);
    expect(snapshot.metrics.started).toBe(true);
    expect(snapshot.metrics.typedChars).toBe(1);
  });

  it("routes backspace through the typing engine", () => {
    const engine = new TypingEngine("abc", 30);
    dispatchTypingKey(engine, createKeyEvent({ key: "a" }));

    const backspaceEvent = createKeyEvent({ key: "Backspace" });
    expect(dispatchTypingKey(engine, backspaceEvent)).toBe(true);
    expect(backspaceEvent.preventDefault).toHaveBeenCalledTimes(1);

    const snapshot = engine.getSnapshot();
    expect(snapshot.index).toBe(0);
    expect(snapshot.metrics.typedChars).toBe(0);
  });

  it("ignores modified shortcuts", () => {
    const engine = new TypingEngine("abc", 30);
    const event = createKeyEvent({ key: "a", ctrlKey: true });

    expect(dispatchTypingKey(engine, event)).toBe(false);
    expect(event.preventDefault).not.toHaveBeenCalled();

    const snapshot = engine.getSnapshot();
    expect(snapshot.index).toBe(0);
    expect(snapshot.metrics.started).toBe(false);
  });
});
