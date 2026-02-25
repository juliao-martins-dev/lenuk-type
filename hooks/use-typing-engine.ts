"use client";

import type { ClipboardEvent, InputHTMLAttributes, KeyboardEvent as ReactKeyboardEvent, RefObject } from "react";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { DurationSeconds, TypingEngine } from "@/lib/engine/typing-engine";

const DEFAULT_TEXT =
  "AI helps developers ship features faster while maintaining quality through readable code and deliberate typing practice.";

function isTypingInputKey(key: string) {
  return key.length === 1 || key === "Enter";
}

export interface TypingCapture {
  inputRef: RefObject<HTMLInputElement | null>;
  inputProps: InputHTMLAttributes<HTMLInputElement>;
  focusInput: () => void;
  blurInput: () => void;
  isFocused: boolean;
}

export function useTypingEngine(
  text: string = DEFAULT_TEXT,
  duration: DurationSeconds = 30,
  enabled = true
) {
  const engine = useMemo(() => new TypingEngine(text, duration), [text, duration]);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  const snapshot = useSyncExternalStore(engine.subscribe, engine.getSnapshot, engine.getSnapshot);

  useEffect(() => () => engine.dispose(), [engine]);

  useEffect(() => {
    if (enabled) return;
    setIsFocused(false);
    inputRef.current?.blur();
  }, [enabled]);

  const onCaptureKeyDown = useCallback((event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (!enabled) return;
    if (event.defaultPrevented || event.nativeEvent.isComposing) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    if (event.key === "Escape") {
      event.preventDefault();
      engine.restart();
      return;
    }

    if (event.key === "Tab") return;

    if (event.key === "Backspace") {
      event.preventDefault();
      engine.handleBackspace();
      return;
    }

    if (!isTypingInputKey(event.key)) return;

    event.preventDefault();
    engine.handleKey(event.key === "Enter" ? "\n" : event.key);
  }, [enabled, engine]);

  const onCapturePaste = useCallback((event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
  }, []);

  const focusInput = useCallback(() => {
    if (!enabled) return;
    inputRef.current?.focus({ preventScroll: true });
  }, [enabled]);

  const blurInput = useCallback(() => {
    inputRef.current?.blur();
  }, []);

  const inputProps = useMemo<InputHTMLAttributes<HTMLInputElement>>(
    () => ({
      value: "",
      onChange: () => undefined,
      onKeyDown: onCaptureKeyDown,
      onPaste: onCapturePaste,
      onFocus: () => setIsFocused(true),
      onBlur: () => setIsFocused(false),
      autoCapitalize: "off",
      autoComplete: "off",
      autoCorrect: "off",
      spellCheck: false,
      inputMode: "text",
      disabled: !enabled,
      "aria-label": "Typing input capture"
    }),
    [enabled, onCaptureKeyDown, onCapturePaste]
  );

  const capture = useMemo<TypingCapture>(
    () => ({
      inputRef,
      inputProps,
      focusInput,
      blurInput,
      isFocused
    }),
    [blurInput, focusInput, inputProps, isFocused]
  );

  return {
    snapshot,
    capture,
    restart: (nextDuration?: DurationSeconds) => engine.restart(nextDuration),
    setText: (nextText: string) => engine.setText(nextText)
  };
}
