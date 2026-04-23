/**
 * TypingEngine — authoritative game state and fixed-timestep game loop.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  Three strictly-separated layers                                        │
 * │                                                                         │
 * │  INPUT LAYER      enqueueInput()                                        │
 * │    Called synchronously from the keydown event handler.                 │
 * │    Pushes a timestamped QueuedInput into the pending buffer and         │
 * │    ensures the game loop is scheduled. No game state is touched here.  │
 * │                                                                         │
 * │  LOGIC LAYER      update(fixedDelta) → processInputs() + checkTimer()  │
 * │    Runs at a fixed tick rate (TICK_RATE ticks/sec) via the             │
 * │    requestAnimationFrame accumulator loop.                              │
 * │    Drains the input queue, validates every keystroke in order,          │
 * │    updates authoritative state. Never touches the DOM.                  │
 * │                                                                         │
 * │  RENDERING LAYER  getSnapshot() via useSyncExternalStore               │
 * │    Reads an immutable snapshot. Never mutates engine state.             │
 * │    Timer values are computed from continuous performance.now() so the  │
 * │    countdown is smooth at any display refresh rate.                     │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Fixed-timestep game loop
 * ────────────────────────
 * The rAF callback accumulates wall-clock delta time and runs as many
 * fixed-size ticks as needed to catch up, preventing the game from running
 * faster on high-refresh-rate screens or slower on low-end devices.
 *
 *   accumulator += clamp(frameDelta, 0, MAX_FRAME_DELTA_MS)
 *   while (accumulator >= TICK_DURATION_MS) {
 *     update(TICK_DURATION_MS)     ← processInputs() + checkTimer()
 *     accumulator -= TICK_DURATION_MS
 *   }
 *   // Render with smooth wall-clock elapsed — natural interpolation
 *   emit(buildSnapshot())
 *
 * Delta normalization
 * ───────────────────
 * Raw frame deltas are clamped to MAX_FRAME_DELTA_MS (200 ms).
 * This prevents the "spiral of death" where a single slow frame causes
 * the engine to run dozens of ticks, making the next frame even slower.
 * A device that can't sustain TICK_RATE will simply process fewer ticks
 * per frame (graceful degradation).
 *
 * Timer interpolation
 * ───────────────────
 * Rather than lerping between two saved tick-end states, the snapshot
 * builder reads performance.now() directly. Since performance.now() is
 * continuous and monotonic, the rendered elapsed/timeLeft values are
 * naturally sub-millisecond smooth at any FPS — equivalent to full
 * interpolation without storing prev/curr state.
 *
 * Input latency
 * ─────────────
 * Inputs are processed at the next tick after they are enqueued.
 * Maximum latency = TICK_DURATION_MS ≈ 16.67 ms at 60 tps.
 * This is well below the human perception threshold (~50 ms) and
 * enables strict ordering guarantees without any synchronization locks.
 *
 * Device-independence guarantee
 * ──────────────────────────────
 * • WPM uses wall-clock elapsed (performance.now() − startedAt), not
 *   tick count, so it is identical at 30 fps, 60 fps, and 144 fps.
 * • startedAt is the timestampMs of the first character keydown event —
 *   captured before React scheduling — so the timer is accurate even
 *   with queue delay.
 * • The finish condition is checked every tick (~16 ms), not every
 *   interval (≤250 ms), giving ±16 ms accuracy for time-based endings.
 */

import { InputQueue, type KeystrokeRecord, type QueuedInput } from "./input-queue";

export type DurationSeconds = 15 | 30 | 60;

// ── Game loop constants ────────────────────────────────────────────────────

/** Number of logic ticks per second. Independent of display refresh rate. */
const TICK_RATE = 60;
/** Duration of one fixed tick in milliseconds (≈16.67 ms). */
const TICK_DURATION_MS = 1000 / TICK_RATE;
/**
 * Maximum frame delta accepted by the accumulator.
 * Prevents the spiral-of-death when a frame takes abnormally long
 * (tab regains focus after background suspension, debugger pause, etc.).
 */
const MAX_FRAME_DELTA_MS = 200;

// ── Public types ───────────────────────────────────────────────────────────

export interface EngineMetrics {
  timeLeft: number;
  elapsed: number;
  wpm: number;
  rawWpm: number;
  accuracy: number;
  errors: number;
  correctChars: number;
  typedChars: number;
  progress: number;
  started: boolean;
  finished: boolean;
  /** Current consecutive-correct-keystrokes streak. Resets on any error or Backspace. */
  streak: number;
  /** Highest streak reached in this run. */
  bestStreak: number;
  /**
   * Per-second instantaneous WPM samples taken throughout the run.
   * One sample is appended at most once per elapsed second.
   * Array reference changes only when a new sample is added (≤ 1 Hz).
   */
  wpmSamples: readonly number[];
}

export interface EngineSnapshot {
  text: string;
  index: number;
  /** Direct reference to the mutable status buffer. Stable identity. */
  statuses: Int8Array;
  /** Incremented on every keystroke — lets memo'd components skip unchanged renders. */
  strokeVersion: number;
  metrics: EngineMetrics;
}

type Listener = () => void;

// ── Internal helpers ───────────────────────────────────────────────────────

function nowMs(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// ── Engine ─────────────────────────────────────────────────────────────────

export class TypingEngine {
  // ── Config (set at construction or restart) ──────────────────────────
  private text: string;
  private duration: DurationSeconds;

  // ── Authoritative game state ─────────────────────────────────────────
  // RULE: mutated ONLY inside the LOGIC LAYER (update / processInputs).
  // RULE: read by the RENDERING LAYER via getSnapshot() only.
  private statuses: Int8Array;
  private index = 0;
  private errors = 0;
  private correctChars = 0;
  private typedChars = 0;
  private started = false;
  private finished = false;
  /** Consecutive correct keystrokes without an error or Backspace. */
  private streak = 0;
  /** Peak streak reached in this run. */
  private bestStreak = 0;
  /** Per-second instantaneous WPM samples. New array ref on each append (≤ 1 Hz). */
  private wpmSamples: readonly number[] = [];
  /** Last elapsed second at which a WPM sample was taken (-1 = none yet). */
  private lastSampledSecond = -1;
  /** correctChars value at the last sample boundary — used for delta WPM. */
  private lastSampledCorrectChars = 0;
  /**
   * Absolute performance.now() timestamp from the first character's keydown
   * event — captured before React processing for maximum accuracy.
   */
  private startedAt = 0;
  /** Monotonically increasing; incremented on every character stroke. */
  private strokeVersion = 0;
  /** Total number of fixed ticks executed in this run. */
  private tickIndex = 0;

  // ── Fixed-timestep loop state ────────────────────────────────────────
  /**
   * Unprocessed time in milliseconds carried over between frames.
   * Drains at TICK_DURATION_MS per logic tick.
   */
  private accumulator = 0;
  /** performance.now() at the start of the previous rAF frame. */
  private lastFrameTime = 0;
  /** requestAnimationFrame handle — null when the loop is not running. */
  private rafHandle: number | null = null;

  // ── Infrastructure ───────────────────────────────────────────────────
  private readonly listeners = new Set<Listener>();
  /** Cached immutable snapshot — rebuilt only when state changes. */
  private cachedSnapshot: EngineSnapshot;
  /** Centralized input buffer. See InputQueue for contract details. */
  private readonly inputQueue = new InputQueue();

  // ── Construction ──────────────────────────────────────────────────────

  constructor(text: string, duration: DurationSeconds) {
    this.text = text;
    this.duration = duration;
    this.statuses = new Int8Array(text.length);
    this.cachedSnapshot = this.buildSnapshot();
  }

  // ── External Store API (useSyncExternalStore) ──────────────────────────

  readonly subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  readonly getSnapshot = (): EngineSnapshot => this.cachedSnapshot;

  // ── Input history ──────────────────────────────────────────────────────

  /** Ordered keystroke log for the current run (replay / WPM audit). */
  getInputLog(): readonly KeystrokeRecord[] {
    return this.inputQueue.getHistory();
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────

  dispose(): void {
    this.stopLoop();
    this.listeners.clear();
  }

  restart(duration?: DurationSeconds): void {
    this.stopLoop();
    if (duration !== undefined) this.duration = duration;
    this.statuses = new Int8Array(this.text.length);
    this.index = 0;
    this.errors = 0;
    this.correctChars = 0;
    this.typedChars = 0;
    this.started = false;
    this.finished = false;
    this.startedAt = 0;
    this.streak = 0;
    this.bestStreak = 0;
    this.wpmSamples = [];
    this.lastSampledSecond = -1;
    this.lastSampledCorrectChars = 0;
    this.accumulator = 0;
    this.lastFrameTime = 0;
    this.tickIndex = 0;
    this.inputQueue.reset();
    this.strokeVersion += 1;
    this.cachedSnapshot = this.buildSnapshot();
    this.notify();
  }

  setText(text: string): void {
    this.text = text;
    this.restart(this.duration);
  }

  // ── INPUT LAYER ────────────────────────────────────────────────────────
  //
  // enqueueInput() is the single entry point for all keyboard input.
  // It runs synchronously inside the native keydown handler — no game
  // state is mutated here. The game loop's processInputs() does the work.

  /**
   * Push a raw keystroke into the pending buffer and ensure the loop runs.
   *
   * Called from the keydown event handler (see use-typing-engine.ts).
   * O(1). Safe to call at any time, including before the game starts.
   */
  enqueueInput(input: QueuedInput): void {
    // Escape is a control command — restart immediately, don't queue.
    if (input.key === "Escape" && !input.altKey && !input.ctrlKey && !input.metaKey) {
      this.restart();
      return;
    }
    this.inputQueue.push(input);
    // Ensure the fixed-timestep loop is scheduled.
    this.ensureLoopRunning();
  }

  /**
   * Backward-compatible helpers used by typing-key-input.ts.
   * Both delegate to enqueueInput() with a synthetic timestamp.
   */
  handleKey(key: string): void {
    this.enqueueInput({
      key,
      timestampMs: nowMs(),
      altKey: false,
      ctrlKey: false,
      metaKey: false,
      isComposing: false,
    });
  }

  handleBackspace(): void {
    this.enqueueInput({
      key: "Backspace",
      timestampMs: nowMs(),
      altKey: false,
      ctrlKey: false,
      metaKey: false,
      isComposing: false,
    });
  }

  // ── LOGIC LAYER ────────────────────────────────────────────────────────
  //
  // All game-state mutations happen here, called exclusively from the
  // fixed-timestep loop. No DOM access. No rendering. Pure logic.

  /**
   * One fixed-timestep update. Delta is unused — the timer uses wall-clock
   * time so that WPM is device-independent regardless of tick rate.
   */
  private update(): void {
    this.processInputs();
    if (!this.finished) this.checkTimer();
    if (!this.finished) this.sampleWpm();
  }

  /**
   * Append a per-second instantaneous WPM sample.
   * Called once per tick; samples at most once per elapsed second.
   * Uses delta correct-chars so each sample reflects only that second's pace.
   */
  private sampleWpm(): void {
    if (!this.started) return;
    const elapsedSec = Math.floor((nowMs() - this.startedAt) / 1000);
    if (elapsedSec <= this.lastSampledSecond) return;
    // Instantaneous WPM = correct chars typed in the last second × 12
    // (60 seconds/min ÷ 5 chars/word = 12)
    const deltaChars = this.correctChars - this.lastSampledCorrectChars;
    this.lastSampledSecond = elapsedSec;
    this.lastSampledCorrectChars = this.correctChars;
    this.wpmSamples = [...this.wpmSamples, deltaChars * 12];
  }

  /**
   * Drain the pending input buffer and apply each input in arrival order.
   * Guarantees identical character-validation order regardless of frame rate.
   */
  private processInputs(): void {
    const inputs = this.inputQueue.drain();
    for (const raw of inputs) {
      if (!this.finished) this.applyInput(raw);
    }
  }

  /**
   * Apply one validated input to the authoritative game state.
   * Records the result to the immutable history log.
   */
  private applyInput(raw: QueuedInput): void {
    // Skip IME composition sequences.
    if (raw.isComposing) return;
    // Skip modified keys — Ctrl/Alt/Meta combos are not typing.
    if (raw.ctrlKey || raw.altKey || raw.metaKey) return;

    if (raw.key === "Backspace") {
      this.applyBackspace(raw);
      return;
    }

    // Only single printable characters reach this point.
    if (raw.key.length !== 1 || this.index >= this.text.length) return;

    // First valid character starts the run.
    // Use the keydown timestamp — not nowMs() — so the timer is accurate
    // even with the tick-delay between enqueue and processing.
    if (!this.started) {
      this.started = true;
      this.startedAt = raw.timestampMs;
    }

    const isCorrect = raw.key === this.text[this.index];
    this.statuses[this.index] = isCorrect ? 1 : -1;
    this.index += 1;
    this.typedChars += 1;
    if (isCorrect) {
      this.correctChars += 1;
      this.streak += 1;
      if (this.streak > this.bestStreak) this.bestStreak = this.streak;
    } else {
      this.errors += 1;
      this.streak = 0;
    }

    this.inputQueue.record({
      key: raw.key,
      timestampMs: raw.timestampMs,
      correct: isCorrect,
      charIndex: this.index - 1,
      tickIndex: this.tickIndex,
    });

    this.strokeVersion += 1;

    // Text fully typed — finish immediately.
    if (this.index >= this.text.length) {
      this.endRun();
    }
  }

  private applyBackspace(raw: QueuedInput): void {
    if (this.index === 0) return;
    const prev = this.statuses[this.index - 1];
    if (prev === 1) this.correctChars -= 1;
    if (prev === -1) this.errors -= 1;
    if (prev !== 0) this.typedChars -= 1;
    this.statuses[this.index - 1] = 0;
    this.index -= 1;
    this.streak = 0;
    this.inputQueue.record({
      key: "Backspace",
      timestampMs: raw.timestampMs,
      correct: null,
      charIndex: this.index,
      tickIndex: this.tickIndex,
    });
    this.strokeVersion += 1;
  }

  /**
   * Check whether the wall-clock duration has been exceeded.
   * Called once per tick after processInputs().
   */
  private checkTimer(): void {
    if (!this.started || this.finished) return;
    const elapsed = (nowMs() - this.startedAt) / 1000;
    if (elapsed >= this.duration) this.endRun();
  }

  private endRun(): void {
    // Capture any chars typed since the last sample boundary.
    if (this.started) {
      const deltaChars = this.correctChars - this.lastSampledCorrectChars;
      if (deltaChars > 0) {
        this.wpmSamples = [...this.wpmSamples, deltaChars * 12];
      }
    }
    this.finished = true;
    this.stopLoop();
    this.cachedSnapshot = this.buildSnapshot();
    this.notify();
  }

  // ── Fixed-timestep loop (requestAnimationFrame) ────────────────────────
  //
  // Why rAF over setInterval:
  //   • rAF is synchronized with the display vsync — zero rendering jank.
  //   • rAF automatically pauses in hidden tabs (user cannot type anyway).
  //   • rAF provides a DOMHighResTimeStamp with sub-millisecond precision.
  //   • setInterval drifts under CPU pressure; rAF reschedules optimally.
  //
  // Why fixed-timestep over raw rAF:
  //   • Game logic runs at exactly TICK_RATE ticks/sec regardless of FPS.
  //   • On a 144 Hz display the loop still ticks at 60 tps, not 144 tps.
  //   • On a 20 fps slow device, the engine catches up with multiple ticks
  //     per frame instead of silently losing time.

  private ensureLoopRunning(): void {
    if (this.rafHandle !== null || this.finished) return;

    // Non-browser environments (Node.js, Vitest, SSR) do not have
    // requestAnimationFrame. Fall back to synchronous queue draining so
    // handleKey() / handleBackspace() remain usable in tests and on the
    // server without mocking. The rAF timer loop is simply skipped.
    if (typeof requestAnimationFrame === "undefined") {
      this.tickIndex += 1;
      this.update();
      if (!this.finished) {
        this.cachedSnapshot = this.buildSnapshot();
        this.notify();
      }
      return;
    }

    this.lastFrameTime = nowMs();
    this.rafHandle = requestAnimationFrame(this.rafTick);
  }

  private stopLoop(): void {
    if (this.rafHandle !== null) {
      cancelAnimationFrame(this.rafHandle);
      this.rafHandle = null;
    }
  }

  /**
   * requestAnimationFrame callback — the heart of the fixed-timestep loop.
   *
   * Update cycle per frame:
   *   1. Compute clamped delta since last frame.
   *   2. Accumulate delta.
   *   3. Run as many fixed ticks as the accumulator allows.
   *      Each tick: processInputs() → checkTimer() (see update()).
   *   4. Build a rendering snapshot using continuous performance.now()
   *      for smooth timer display at any refresh rate.
   *   5. Notify React subscribers.
   *   6. Reschedule.
   */
  private readonly rafTick = (): void => {
    if (this.finished) return;

    const frameTime = nowMs();

    // ── Delta normalization ────────────────────────────────────────────
    // Clamp to MAX_FRAME_DELTA_MS to prevent the spiral-of-death when the
    // tab regains focus after being hidden or the JS engine was paused.
    const rawDelta = frameTime - this.lastFrameTime;
    const delta = Math.min(rawDelta > 0 ? rawDelta : TICK_DURATION_MS, MAX_FRAME_DELTA_MS);
    this.lastFrameTime = frameTime;
    this.accumulator += delta;

    // ── Fixed-timestep ticks ───────────────────────────────────────────
    // Run one tick per TICK_DURATION_MS of accumulated time.
    // This loop ensures the game advances at a deterministic rate
    // regardless of how often rAF fires.
    while (this.accumulator >= TICK_DURATION_MS) {
      this.tickIndex += 1;
      this.update();
      this.accumulator -= TICK_DURATION_MS;
      if (this.finished) return; // endRun() emitted the final snapshot
    }

    // ── Rendering snapshot ─────────────────────────────────────────────
    // Build from continuous performance.now(). Because nowMs() is
    // monotonically increasing and sampled at render time, the timer
    // values (elapsed, timeLeft) are naturally interpolated between ticks
    // at sub-millisecond resolution — no explicit lerp needed.
    this.cachedSnapshot = this.buildSnapshot();
    this.notify();

    // Reschedule only if the game is still running.
    this.rafHandle = requestAnimationFrame(this.rafTick);
  };

  // ── RENDERING LAYER: snapshot builder ─────────────────────────────────
  //
  // buildSnapshot() is pure: it reads engine fields and returns a new
  // immutable object. It never mutates any field. It is the only path
  // through which rendering code observes game state.
  //
  // The timer values (elapsed, timeLeft, wpm) are computed from
  // performance.now() at call time, giving smooth sub-tick interpolation.

  private buildSnapshot(): EngineSnapshot {
    const elapsedMs = this.started ? nowMs() - this.startedAt : 0;
    const elapsed = Math.min(this.duration, elapsedMs / 1000);
    // Guard against division by zero for sub-second elapsed times.
    const minutes = Math.max(elapsed / 60, 1 / 60);

    const wpm = this.correctChars / 5 / minutes;
    const rawWpm = this.typedChars / 5 / minutes;

    return {
      text: this.text,
      index: this.index,
      statuses: this.statuses,  // same reference — strokeVersion detects changes
      strokeVersion: this.strokeVersion,
      metrics: {
        timeLeft: Math.max(0, this.duration - elapsed),
        elapsed,
        wpm: Number.isFinite(wpm) ? Number(wpm.toFixed(1)) : 0,
        rawWpm: Number.isFinite(rawWpm) ? Number(rawWpm.toFixed(1)) : 0,
        accuracy:
          this.typedChars === 0
            ? 100
            : Number(((this.correctChars / this.typedChars) * 100).toFixed(1)),
        errors: this.errors,
        correctChars: this.correctChars,
        typedChars: this.typedChars,
        progress:
          this.text.length === 0 ? 0 : (this.index / this.text.length) * 100,
        started: this.started,
        finished: this.finished,
        streak: this.streak,
        bestStreak: this.bestStreak,
        wpmSamples: this.wpmSamples,
      },
    };
  }

  // ── Internal notification ──────────────────────────────────────────────

  private notify(): void {
    for (const listener of this.listeners) listener();
  }
}

// Re-export for consumers that need the lerp utility (e.g. tests).
export { lerp };
