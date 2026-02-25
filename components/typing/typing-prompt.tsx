"use client";

import { memo, type MouseEvent } from "react";
import type { TypingCapture } from "@/hooks/use-typing-engine";

type TypingPromptMode = "text" | "code";

interface TypingPromptProps {
  text: string;
  statuses: Int8Array;
  index: number;
  strokeVersion: number;
  mode: TypingPromptMode;
  capture: TypingCapture;
  enabled: boolean;
  finished: boolean;
}

function renderCharacter(character: string, status: number, active: boolean) {
  if (character === " ") {
    if (active || status === -1) return "\u00B7";
    return " ";
  }

  return character;
}

function caretClassName(mode: TypingPromptMode) {
  return mode === "code" ? "top-0 h-6" : "top-0.5 h-8";
}

function PromptText({ text, statuses, index, mode, capture, enabled, finished }: TypingPromptProps) {
  const characters = Array.from(text);
  const showFocusHint = !capture.isFocused && enabled && !finished;
  const sectionClassName =
    mode === "code"
      ? `relative overflow-auto rounded-lg border bg-background/40 p-4 font-mono text-base leading-7 tracking-normal whitespace-pre [tab-size:2] ${
          showFocusHint ? "pr-32" : ""
        }`
      : `relative rounded-lg border bg-background/40 p-4 text-2xl leading-relaxed tracking-wide ${
          showFocusHint ? "pr-32" : ""
        }`;

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

      {showFocusHint && (
        <div className="pointer-events-none absolute right-3 top-3 z-10 rounded-full border bg-background/90 px-2 py-1 text-xs text-muted-foreground">
          Click to focus
        </div>
      )}

      {characters.map((character, charIndex) => {
        const status = statuses[charIndex];
        const active = charIndex === index;

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
                } ${caretClassName(mode)}`}
              />
            )}
            {renderCharacter(character, status, active)}
          </span>
        );
      })}

      {index >= characters.length && (
        <span className="relative inline-block align-baseline">
          <span
            aria-hidden
            className={`pointer-events-none absolute -left-[1px] w-0.5 rounded-full bg-primary/90 ${
              capture.isFocused ? "animate-pulse" : "opacity-50"
            } ${caretClassName(mode)}`}
          />
          {"\u00A0"}
        </span>
      )}
    </section>
  );
}

export const TypingPrompt = memo(
  PromptText,
  (prev, next) =>
    prev.text === next.text &&
    prev.index === next.index &&
    prev.mode === next.mode &&
    prev.enabled === next.enabled &&
    prev.finished === next.finished &&
    prev.strokeVersion === next.strokeVersion &&
    prev.capture === next.capture
);
