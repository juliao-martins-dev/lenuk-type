/**
 * InputQueue — centralized, timestamped input layer for the typing engine.
 *
 * Design contract
 * ───────────────
 * • Every keystroke is ENQUEUED synchronously at the moment the native
 *   keydown event fires, before any React scheduling or rendering work.
 * • The engine's fixed-timestep update() drains the pending buffer once
 *   per tick and validates each input in strict arrival order.
 * • After validation, each input is appended to the immutable history log,
 *   which acts as the authoritative record for replay and WPM verification.
 *
 * Race-condition guarantee
 * ────────────────────────
 * JavaScript is single-threaded. The enqueue call and the drain call can
 * never interleave. The pending buffer therefore acts as a safe handoff
 * point between the event layer and the game-logic layer without any
 * locking mechanism.
 *
 * Layers
 *   Event layer  →  push()    (keydown handler, runs outside game loop)
 *   Logic layer  →  drain()   (called once per fixed tick inside update())
 *   Audit layer  →  record()  (appended after validation; never mutated)
 */

/**
 * A raw, unvalidated keystroke captured at the event boundary.
 * All fields are read-only; this object is frozen after construction.
 */
export interface QueuedInput {
  /** The key value as reported by KeyboardEvent.key. */
  readonly key: string;
  /**
   * Captured from performance.now() inside the keydown handler —
   * BEFORE React's synthetic event wrapper or any other processing.
   * Used as the authoritative start-of-run timestamp when the first
   * character is typed, giving accurate WPM even with queue delay.
   */
  readonly timestampMs: number;
  readonly altKey: boolean;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly isComposing: boolean;
}

/**
 * An immutable record of a keystroke after the logic layer has validated it.
 * Appended to the history log; never modified.
 */
export interface KeystrokeRecord {
  readonly key: string;
  readonly timestampMs: number;
  /**
   * Whether the character matched the expected prompt character.
   * null for non-character keys (Backspace, Escape).
   */
  readonly correct: boolean | null;
  /** Prompt character index at the moment this input was applied. */
  readonly charIndex: number;
  /** The engine tick counter value when this input was processed. */
  readonly tickIndex: number;
}

/**
 * Two-layer input buffer:
 *   pending  — inputs waiting to be processed by the next game tick
 *   history  — validated keystroke log for the current run (append-only)
 */
export class InputQueue {
  private readonly pending: QueuedInput[] = [];
  private readonly history: KeystrokeRecord[] = [];

  // ── Event layer ────────────────────────────────────────────────────

  /**
   * Enqueue a raw keystroke.
   * Called synchronously from the keydown event handler.
   * O(1). Never blocks.
   */
  push(input: QueuedInput): void {
    this.pending.push(input);
  }

  // ── Logic layer ────────────────────────────────────────────────────

  /**
   * Remove and return all pending inputs in arrival order.
   * Called once per fixed tick inside the engine's update() method.
   * Returns a stable empty array (not a new allocation) when idle.
   */
  drain(): readonly QueuedInput[] {
    if (this.pending.length === 0) return EMPTY;
    return this.pending.splice(0);
  }

  /**
   * Append a validated keystroke to the immutable history log.
   * Called by the engine after applyInput() validates each entry.
   */
  record(entry: KeystrokeRecord): void {
    this.history.push(entry);
  }

  // ── Audit layer ────────────────────────────────────────────────────

  /** Full ordered keystroke history for this run. Never mutated externally. */
  getHistory(): readonly KeystrokeRecord[] {
    return this.history;
  }

  /** Number of unprocessed inputs waiting in the pending buffer. */
  get pendingCount(): number {
    return this.pending.length;
  }

  /** Total validated keystrokes recorded this run. */
  get historyCount(): number {
    return this.history.length;
  }

  // ── Lifecycle ──────────────────────────────────────────────────────

  /** Clear both buffers. Called on restart. */
  reset(): void {
    this.pending.length = 0;
    this.history.length = 0;
  }
}

/** Reused empty array — avoids allocation on every idle drain(). */
const EMPTY: readonly QueuedInput[] = Object.freeze([]);
