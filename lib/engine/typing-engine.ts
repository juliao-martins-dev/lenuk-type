export type DurationSeconds = 15 | 30 | 60;

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
}

export interface EngineSnapshot {
  text: string;
  index: number;
  statuses: Int8Array;
  metrics: EngineMetrics;
}

type Listener = () => void;

export class TypingEngine {
  private listeners = new Set<Listener>();
  private timer: NodeJS.Timeout | null = null;
  private startedAt = 0;
  private duration: DurationSeconds;
  private text: string;
  private statuses: Int8Array;
  private index = 0;
  private errors = 0;
  private correctChars = 0;
  private typedChars = 0;
  private started = false;
  private finished = false;
  private snapshot: EngineSnapshot;

  constructor(text: string, duration: DurationSeconds) {
    this.text = text;
    this.duration = duration;
    this.statuses = new Int8Array(text.length);
    this.snapshot = this.computeSnapshot();
  }

  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private emit() {
    for (const listener of this.listeners) listener();
  }

  private computeSnapshot(): EngineSnapshot {
    const elapsedMs = this.started ? Date.now() - this.startedAt : 0;
    const elapsed = Math.min(this.duration, elapsedMs / 1000);
    const minutes = Math.max(elapsed / 60, 1 / 60);
    const wpm = this.correctChars / 5 / minutes;
    const rawWpm = this.typedChars / 5 / minutes;

    return {
      text: this.text,
      index: this.index,
      statuses: this.statuses,
      metrics: {
        timeLeft: Math.max(0, this.duration - elapsed),
        elapsed,
        wpm: Number.isFinite(wpm) ? Number(wpm.toFixed(1)) : 0,
        rawWpm: Number.isFinite(rawWpm) ? Number(rawWpm.toFixed(1)) : 0,
        accuracy: this.typedChars === 0 ? 100 : Number(((this.correctChars / this.typedChars) * 100).toFixed(1)),
        errors: this.errors,
        correctChars: this.correctChars,
        typedChars: this.typedChars,
        progress: this.text.length === 0 ? 0 : (this.index / this.text.length) * 100,
        started: this.started,
        finished: this.finished
      }
    };
  }

  private refreshSnapshot() {
    this.snapshot = this.computeSnapshot();
  }

  getSnapshot = (): EngineSnapshot => this.snapshot;

  setText(text: string) {
    this.text = text;
    this.restart(this.duration);
  }

  restart(duration?: DurationSeconds) {
    if (this.timer) clearInterval(this.timer);
    if (duration) this.duration = duration;
    this.statuses = new Int8Array(this.text.length);
    this.index = 0;
    this.errors = 0;
    this.correctChars = 0;
    this.typedChars = 0;
    this.started = false;
    this.finished = false;
    this.startedAt = 0;
    this.timer = null;
    this.refreshSnapshot();
    this.emit();
  }

  private start() {
    if (this.started) return;
    this.started = true;
    this.startedAt = Date.now();
    this.timer = setInterval(() => {
      const elapsed = (Date.now() - this.startedAt) / 1000;
      if (elapsed >= this.duration) {
        this.finish();
        return;
      }
      this.refreshSnapshot();
      this.emit();
    }, 100);
  }

  private finish() {
    this.finished = true;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.refreshSnapshot();
    this.emit();
  }

  handleKey(key: string) {
    if (this.finished || key.length !== 1 || this.index >= this.text.length) return;
    this.start();

    const isCorrect = key === this.text[this.index];
    this.statuses[this.index] = isCorrect ? 1 : -1;
    this.index += 1;
    this.typedChars += 1;

    if (isCorrect) {
      this.correctChars += 1;
    } else {
      this.errors += 1;
    }

    if (this.index >= this.text.length) {
      this.finish();
      return;
    }
    this.refreshSnapshot();
    this.emit();
  }
}
