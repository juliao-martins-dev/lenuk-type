/**
 * typing-key-input.ts — Input layer dispatcher.
 *
 * Translates raw keyboard events into engine calls.
 *
 * Routing rules:
 *   Escape           → engine.restart()      (immediate — control action)
 *   Tab              → ignored               (browser navigation key)
 *   Backspace        → engine.enqueueInput() (queued — typed in order)
 *   Printable chars  → engine.enqueueInput() (queued — typed in order)
 *   Enter            → engine.enqueueInput() (mapped to '\n')
 *   Everything else  → ignored
 *
 * The timestampMs field carries the performance.now() value from the
 * keydown event, captured at the event boundary BEFORE this function
 * runs. It becomes the authoritative start-of-run timestamp when the
 * first character is processed, and is stored in the keystroke history
 * for WPM verification and replay.
 */

import type { QueuedInput } from "@/lib/engine/input-queue";

/**
 * Normalized keyboard event — framework-agnostic.
 * Supports both React.KeyboardEvent and native KeyboardEvent.
 */
export interface TypingKeyInput {
  key: string;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  defaultPrevented: boolean;
  isComposing?: boolean;
  preventDefault: () => void;
  /**
   * performance.now() captured at the keydown event boundary.
   * Must be set by the caller as early as possible in the event handler.
   * Falls back to performance.now() inside enqueueInput() if omitted.
   */
  timestampMs?: number;
}

/**
 * Interface-based contract for the engine — avoids a Pick<TypingEngine, ...>
 * circular resolution and keeps this module independently testable.
 */
interface TypingKeyEngine {
  restart(): void;
  enqueueInput(input: QueuedInput): void;
}

function isTypingInputKey(key: string): boolean {
  return key.length === 1 || key === "Enter";
}

/**
 * Dispatch a keyboard event to the engine.
 *
 * Returns true if the event was consumed (caller should call
 * event.preventDefault() if not already called inside this function).
 */
export function dispatchTypingKey(
  engine: TypingKeyEngine,
  event: TypingKeyInput
): boolean {
  // Skip browser-generated pre-cancelled events and IME composition.
  if (event.defaultPrevented || event.isComposing) return false;
  // Skip modified key combinations (shortcuts, browser bindings).
  if (event.ctrlKey || event.metaKey || event.altKey) return false;

  // ── Control keys (immediate) ─────────────────────────────────────────
  if (event.key === "Escape") {
    event.preventDefault();
    engine.restart();
    return true;
  }

  if (event.key === "Tab") return false;

  // ── Typing keys (queued) ─────────────────────────────────────────────
  if (event.key === "Backspace" || isTypingInputKey(event.key)) {
    event.preventDefault();
    engine.enqueueInput({
      key: event.key === "Enter" ? "\n" : event.key,
      // Use the caller-supplied timestamp (captured at event boundary) or
      // fall back to nowMs() inside the engine for robustness.
      timestampMs: event.timestampMs ?? (typeof performance !== "undefined" ? performance.now() : Date.now()),
      altKey: event.altKey,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      isComposing: event.isComposing ?? false,
    });
    return true;
  }

  return false;
}
