"use client";

import { memo, useMemo, type MouseEvent } from "react";
import type { TypingCapture } from "@/hooks/use-typing-engine";

interface TypingPromptProps {
  text: string;
  statuses: Int8Array;
  index: number;
  strokeVersion: number;
  capture: TypingCapture;
  enabled: boolean;
  finished: boolean;
  /** Character index where the ghost cursor sits (null = no ghost active). */
  ghostIndex?: number | null;
  /** WPM of the PB run driving the ghost cursor. */
  ghostWpm?: number | null;
}

function renderCharacter(character: string) {
  if (character === " ") {
    return " ";
  }

  return character;
}

function caretClassName() {
  // Use em-based sizing so the caret follows the current font size and stays visually centered.
  return "top-1/2 -translate-y-1/2 h-[0.96em]";
}

function PromptText({
  text,
  statuses,
  index,
  capture,
  enabled,
  finished,
  ghostIndex,
  ghostWpm,
}: TypingPromptProps) {
  const characters = useMemo(() => Array.from(text), [text]);
  const showFocusHint = !capture.isFocused && enabled && !finished;
  const shouldBlurPrompt = showFocusHint;
  const sectionClassName =
    "relative min-h-[7.5rem] rounded-lg px-2 py-2 pr-28 text-[1.9rem] leading-relaxed tracking-wide whitespace-pre-wrap text-muted-foreground md:min-h-[8.5rem] md:text-[2.35rem]";

  // Ghost is visible only when active and at a different position from the user cursor.
  const showGhost = ghostIndex !== null && ghostIndex !== undefined;

  const handleMouseDown = (event: MouseEvent<HTMLElement>) => {
    if (!enabled) return;
    if (event.button !== 0) return;
    event.preventDefault();
    capture.focusInput();
  };

  return (
    <section onMouseDown={handleMouseDown} className={sectionClassName} aria-label="Typing prompt">
      <input
        ref={capture.inputRef}
        {...capture.inputProps}
        className="absolute left-4 top-4 h-px w-px opacity-0"
      />

      {/* Ghost WPM badge — top-right of the prompt section */}
      {showGhost && ghostWpm !== null && ghostWpm !== undefined && (
        <div className="pointer-events-none absolute right-2 top-2 z-10 flex flex-col items-end gap-1">
          <span className="flex items-center gap-1 rounded-md border border-amber-400/35 bg-amber-400/10 px-1.5 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
            <GhostIcon />
            <span className="tabular-nums">{ghostWpm}</span>
            <span className="opacity-70">wpm</span>
          </span>
        </div>
      )}

      <div
        className={`transition-[filter,opacity] duration-200 ${
          shouldBlurPrompt ? "blur-[5px] opacity-40 saturate-50" : "blur-0 opacity-100 saturate-100"
        }`}
        aria-hidden={showFocusHint ? true : undefined}
      >
        {characters.map((character, charIndex) => {
          const status = statuses[charIndex];
          const active = charIndex === index;
          const isGhostHere = showGhost && charIndex === ghostIndex && charIndex !== index;
          const showSpaceMarker = character === " " && (active || status === -1);

          return (
            <span
              key={`${charIndex}-${character}`}
              className={
                active
                  ? "relative text-foreground"
                  : status === 1
                    ? "text-foreground"
                    : status === -1
                      ? "text-destructive"
                      : "text-muted-foreground"
              }
            >
              {/* User cursor */}
              {active && (
                <span
                  aria-hidden
                  className={`pointer-events-none absolute -left-[1px] w-0.5 rounded-full bg-primary/90 ${
                    capture.isFocused ? "animate-pulse" : "opacity-50"
                  } ${caretClassName()}`}
                />
              )}
              {/* Ghost cursor — amber, no pulse, slightly translucent */}
              {isGhostHere && (
                <span
                  aria-hidden
                  className={`pointer-events-none absolute -left-[1px] w-0.5 rounded-full bg-amber-400/70 ${caretClassName()}`}
                />
              )}
              {showSpaceMarker && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[0.7em] text-current"
                >
                  {"\u00B7"}
                </span>
              )}
              {renderCharacter(character)}
            </span>
          );
        })}

        {index >= characters.length && (
          <span className="relative inline-block align-baseline">
            <span
              aria-hidden
              className={`pointer-events-none absolute -left-[1px] w-0.5 rounded-full bg-primary/90 ${
                capture.isFocused ? "animate-pulse" : "opacity-50"
              } ${caretClassName()}`}
            />
            {"\u00A0"}
          </span>
        )}

        {/* Ghost at or past end of text */}
        {showGhost && ghostIndex !== null && ghostIndex >= characters.length && ghostIndex !== index && (
          <span className="relative inline-block align-baseline">
            <span
              aria-hidden
              className={`pointer-events-none absolute -left-[1px] w-0.5 rounded-full bg-amber-400/70 ${caretClassName()}`}
            />
            {"\u00A0"}
          </span>
        )}
      </div>

      {showFocusHint && (
        <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center">
          <div className="rounded-xl border bg-background/85 px-4 py-2 text-sm font-medium text-foreground shadow-lg backdrop-blur">
            Click here or press any key to focus
          </div>
        </div>
      )}
    </section>
  );
}

/** Minimal inline ghost SVG — avoids an extra lucide import. */
function GhostIcon() {
  return (
    <svg
      aria-hidden
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 10h.01M15 10h.01M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z" />
    </svg>
  );
}

export const TypingPrompt = memo(
  PromptText,
  (prev, next) =>
    prev.text === next.text &&
    prev.index === next.index &&
    prev.enabled === next.enabled &&
    prev.finished === next.finished &&
    prev.strokeVersion === next.strokeVersion &&
    prev.capture === next.capture &&
    prev.ghostIndex === next.ghostIndex &&
    prev.ghostWpm === next.ghostWpm
);
