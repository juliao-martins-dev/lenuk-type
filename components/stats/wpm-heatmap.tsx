"use client";

import type { KeystrokeEntry } from "@/lib/user-stats";

interface CharCell {
  char: string;
  /** Inter-keystroke interval in ms (null for first char or untyped). */
  iki: number | null;
  /** Whether the character was typed correctly (null = not reached). */
  correct: boolean | null;
}

/**
 * Replay the keystroke log and compute per-character timing.
 *
 * For each character position in the prompt text we track:
 *   - The relative timestamp of the last forward keystroke that landed there.
 *   - Whether that keystroke was correct.
 *
 * "Last" matters because the typist may have backspaced and retyped the same
 * position multiple times — only the final attempt is visible.
 */
function computeCharCells(text: string, log: KeystrokeEntry[]): CharCell[] {
  const finalTs: (number | null)[] = Array(text.length).fill(null);
  const finalCorrect: (boolean | null)[] = Array(text.length).fill(null);

  for (const entry of log) {
    if (entry.c !== null && entry.i >= 0 && entry.i < text.length) {
      finalTs[entry.i] = entry.t;
      finalCorrect[entry.i] = entry.c;
    }
  }

  return Array.from(text).map((char, i) => {
    const ts = finalTs[i];
    if (ts === null) return { char, iki: null, correct: null };
    // IKI = time since the previous character's final keystroke.
    const prevTs = i > 0 ? finalTs[i - 1] : null;
    return { char, iki: prevTs !== null ? ts - prevTs : null, correct: finalCorrect[i] };
  });
}

/**
 * Map an inter-keystroke interval to an HSL color.
 *
 * Speed ↔ hue mapping (green = fast, red = slow):
 *   ≤ 80 ms  → hue 145 (vivid green)
 *   80–200   → hue 120→80 (green → yellow-green)
 *   200–400  → hue 80→40 (yellow-green → amber)
 *   400–700  → hue 40→10 (amber → orange-red)
 *   > 700 ms → hue 0 (red)
 *
 * Incorrect characters always render red regardless of speed.
 */
function ikiToColor(iki: number, correct: boolean): string {
  if (!correct) return "hsl(0,72%,52%)";
  const ms = Math.max(0, iki);
  let hue: number;
  if (ms <= 80) {
    hue = 145;
  } else if (ms <= 200) {
    hue = 145 - ((ms - 80) / 120) * 65; // 145→80
  } else if (ms <= 400) {
    hue = 80 - ((ms - 200) / 200) * 40;  // 80→40
  } else if (ms <= 700) {
    hue = 40 - ((ms - 400) / 300) * 30;  // 40→10
  } else {
    hue = 0;
  }
  return `hsl(${Math.round(hue)},70%,50%)`;
}

interface WpmHeatmapProps {
  text: string;
  keystrokeLog: KeystrokeEntry[];
  wpm: number;
  accuracy: number;
}

export function WpmHeatmap({ text, keystrokeLog, wpm, accuracy }: WpmHeatmapProps) {
  const cells = computeCharCells(text, keystrokeLog);

  // Summary stats from the log.
  const typed = cells.filter((c) => c.correct !== null);
  const correct = typed.filter((c) => c.correct === true);

  // IKI → instant WPM for the legend labels.
  const legendItems: Array<{ label: string; color: string }> = [
    { label: "Fast", color: ikiToColor(60, true) },
    { label: "Good", color: ikiToColor(160, true) },
    { label: "Avg", color: ikiToColor(300, true) },
    { label: "Slow", color: ikiToColor(550, true) },
    { label: "Error", color: ikiToColor(0, false) },
  ];

  return (
    <div className="space-y-4">
      {/* Header metrics row */}
      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        <span>
          <span className="font-semibold tabular-nums text-foreground">{wpm}</span> wpm
        </span>
        <span>
          <span className="font-semibold tabular-nums text-foreground">{accuracy}%</span> accuracy
        </span>
        <span>
          <span className="font-semibold tabular-nums text-foreground">{correct.length}</span>
          {" / "}
          <span className="tabular-nums">{typed.length}</span> correct
        </span>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span>Speed:</span>
        {legendItems.map(({ label, color }) => (
          <span key={label} className="flex items-center gap-1">
            <span
              className="inline-block h-3 w-3 rounded-sm"
              style={{ backgroundColor: color }}
            />
            {label}
          </span>
        ))}
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-sm bg-muted-foreground/20" />
          Not reached
        </span>
      </div>

      {/* Character grid */}
      <div className="rounded-xl border border-border bg-background p-4">
        <div
          className="font-mono text-sm leading-7 tracking-wide"
          aria-label="Per-character WPM heatmap"
        >
          {cells.map((cell, i) => {
            if (cell.char === "\n") {
              return <br key={i} />;
            }
            if (cell.char === " ") {
              if (cell.correct === null) {
                return (
                  <span
                    key={i}
                    className="inline-block w-[0.5ch] rounded-[2px] bg-muted-foreground/15"
                    style={{ height: "1em", verticalAlign: "middle" }}
                    title="Not reached"
                  />
                );
              }
              // Space: show a slim underline-style bar
              const color =
                cell.iki !== null
                  ? ikiToColor(cell.iki, cell.correct)
                  : cell.correct
                  ? ikiToColor(60, true)
                  : ikiToColor(0, false);
              const ikiLabel = cell.iki !== null ? `${cell.iki}ms` : "first char";
              return (
                <span
                  key={i}
                  className="inline-block rounded-[2px]"
                  style={{
                    width: "0.5ch",
                    height: "3px",
                    backgroundColor: color,
                    verticalAlign: "bottom",
                    marginBottom: "2px",
                    marginRight: "1px",
                  }}
                  title={`Space · ${cell.correct ? "correct" : "incorrect"} · ${ikiLabel}`}
                />
              );
            }

            if (cell.correct === null) {
              return (
                <span
                  key={i}
                  className="rounded-[2px] text-muted-foreground/30"
                >
                  {cell.char}
                </span>
              );
            }

            const color =
              cell.iki !== null
                ? ikiToColor(cell.iki, cell.correct)
                : cell.correct
                ? ikiToColor(60, true)
                : ikiToColor(0, false);

            const ikiLabel = cell.iki !== null ? `${cell.iki}ms` : "first char";
            const title = `'${cell.char}' · ${cell.correct ? "correct" : "incorrect"} · ${ikiLabel}`;

            return (
              <span
                key={i}
                title={title}
                style={{ color }}
                className="cursor-default rounded-[2px] transition-colors"
              >
                {cell.char}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
