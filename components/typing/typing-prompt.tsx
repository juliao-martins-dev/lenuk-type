"use client";

import { memo, useEffect, useRef, useMemo, useState, type MouseEvent } from "react";
import type { TypingCapture } from "@/hooks/use-typing-engine";

interface TypingPromptProps {
  text: string;
  statuses: Int8Array;
  index: number;
  strokeVersion: number;
  capture: TypingCapture;
  enabled: boolean;
  finished: boolean;
  ghostIndex?: number | null;
  ghostWpm?: number | null;
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
  const showGhost = ghostIndex !== null && ghostIndex !== undefined;

  // Track current character element to position the smooth caret
  const charRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [caretStyle, setCaretStyle] = useState<React.CSSProperties>({ opacity: 0 });

  // Resize the refs array when text changes
  useEffect(() => {
    charRefs.current = charRefs.current.slice(0, characters.length);
  }, [characters.length]);

  // Position the smooth caret based on the current character index
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const targetIndex = Math.min(index, characters.length - 1);
    const charEl = charRefs.current[targetIndex];
    if (!charEl) return;

    const containerRect = container.getBoundingClientRect();
    const charRect = charEl.getBoundingClientRect();

    const left = (index >= characters.length)
      ? charRect.right - containerRect.left
      : charRect.left - containerRect.left;
    const top = charRect.top - containerRect.top;
    const height = charRect.height;

    setCaretStyle({
      left: `${left}px`,
      top: `${top + 2}px`,
      height: `${height - 4}px`,
      opacity: 1,
    });
  }, [index, characters.length, text]);

  // Ghost caret position
  const [ghostStyle, setGhostStyle] = useState<React.CSSProperties>({ opacity: 0 });
  useEffect(() => {
    if (!showGhost || ghostIndex == null) {
      setGhostStyle({ opacity: 0 });
      return;
    }
    const container = containerRef.current;
    if (!container) return;
    const gi = Math.min(ghostIndex, characters.length - 1);
    const charEl = charRefs.current[gi];
    if (!charEl) return;
    const containerRect = container.getBoundingClientRect();
    const charRect = charEl.getBoundingClientRect();
    const left = (ghostIndex >= characters.length)
      ? charRect.right - containerRect.left
      : charRect.left - containerRect.left;
    setGhostStyle({
      left: `${left}px`,
      top: `${charRect.top - containerRect.top + 2}px`,
      height: `${charRect.height - 4}px`,
      opacity: 0.6,
    });
  }, [ghostIndex, showGhost, characters.length, text]);

  const handleMouseDown = (event: MouseEvent<HTMLElement>) => {
    if (!enabled) return;
    if (event.button !== 0) return;
    event.preventDefault();
    capture.focusInput();
  };

  return (
    <section
      onMouseDown={handleMouseDown}
      className="typing-font relative min-h-[7.5rem] rounded-xl px-3 py-3 text-[1.6rem] leading-[2.4] tracking-wide md:min-h-[8.5rem] md:px-4 md:text-[1.9rem]"
      aria-label="Typing prompt"
    >
      <input
        ref={capture.inputRef}
        {...capture.inputProps}
        className="absolute left-4 top-4 h-px w-px opacity-0"
      />

      {/* Ghost WPM badge */}
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
        ref={containerRef}
        className={`relative transition-[filter,opacity] duration-200 ${
          showFocusHint ? "blur-[6px] opacity-30 saturate-50 select-none" : "blur-0 opacity-100 saturate-100"
        }`}
        style={{ overflowWrap: "break-word", whiteSpace: "pre-wrap" }}
        aria-hidden={showFocusHint ? true : undefined}
      >
        {/* Smooth animated caret */}
        <span
          aria-hidden
          className={`caret-smooth pointer-events-none absolute z-20 w-[3px] rounded-full bg-[hsl(var(--caret))] ${
            capture.isFocused && !finished ? "caret-blink" : "opacity-0"
          }`}
          style={caretStyle}
        />

        {/* Ghost caret */}
        {showGhost && (
          <span
            aria-hidden
            className="caret-smooth pointer-events-none absolute z-10 w-[3px] rounded-full bg-amber-400/60"
            style={ghostStyle}
          />
        )}

        {/* Characters */}
        {characters.map((character, charIndex) => {
          const status = statuses[charIndex];
          const isPast = charIndex < index;
          const isCurrent = charIndex === index;

          // MonkeyType-style: correct → bright, error → red, future → dim
          let colorClass: string;
          if (isPast || isCurrent) {
            if (status === 1) {
              colorClass = "text-[hsl(var(--correct))]";
            } else if (status === -1) {
              colorClass = "text-[hsl(var(--error))]";
            } else {
              colorClass = "text-[hsl(var(--correct))]";
            }
          } else {
            colorClass = "text-[hsl(var(--sub))]";
          }

          return (
            <span
              key={`${charIndex}-${character}`}
              ref={(el) => { charRefs.current[charIndex] = el; }}
              className={colorClass}
            >
              {/* Space error indicator */}
              {character === " " && status === -1 && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute text-[0.7em] text-[hsl(var(--error))]"
                  style={{ marginLeft: "0.15em" }}
                >
                  {"\u00B7"}
                </span>
              )}
              {character === " " ? " " : character}
            </span>
          );
        })}
      </div>

      {/* Focus hint overlay */}
      {showFocusHint && (
        <div className="pointer-events-none absolute inset-0 z-30 grid place-items-center">
          <div className="rounded-xl border border-[hsl(var(--caret))/0.3] bg-background/90 px-5 py-2.5 text-sm font-medium text-foreground shadow-lg backdrop-blur-md">
            Click here or press any key to focus
          </div>
        </div>
      )}
    </section>
  );
}

function GhostIcon() {
  return (
    <svg
      aria-hidden width="11" height="11" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
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
