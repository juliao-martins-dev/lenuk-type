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

function PromptText({ text, statuses, index, capture, enabled, finished }: TypingPromptProps) {
  const characters = useMemo(() => Array.from(text), [text]);
  const showFocusHint = !capture.isFocused && enabled && !finished;
  const shouldBlurPrompt = showFocusHint;
  const sectionClassName =
    "relative min-h-[7.5rem] rounded-lg px-2 py-2 pr-28 text-[1.9rem] leading-relaxed tracking-wide whitespace-pre-wrap text-muted-foreground md:min-h-[8.5rem] md:text-[2.35rem]";

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

      <div
        className={`transition-[filter,opacity] duration-200 ${
          shouldBlurPrompt ? "blur-[5px] opacity-40 saturate-50" : "blur-0 opacity-100 saturate-100"
        }`}
        aria-hidden={showFocusHint ? true : undefined}
      >
        {characters.map((character, charIndex) => {
          const status = statuses[charIndex];
          const active = charIndex === index;
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
              {active && (
                <span
                  aria-hidden
                  className={`pointer-events-none absolute -left-[1px] w-0.5 rounded-full bg-primary/90 ${
                    capture.isFocused ? "animate-pulse" : "opacity-50"
                  } ${caretClassName()}`}
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

export const TypingPrompt = memo(
  PromptText,
  (prev, next) =>
    prev.text === next.text &&
    prev.index === next.index &&
    prev.enabled === next.enabled &&
    prev.finished === next.finished &&
    prev.strokeVersion === next.strokeVersion &&
    prev.capture === next.capture
);
