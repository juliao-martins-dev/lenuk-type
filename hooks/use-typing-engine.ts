"use client";

import type { ClipboardEvent, InputHTMLAttributes, KeyboardEvent as ReactKeyboardEvent, RefObject } from "react";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { dispatchTypingKey, type TypingKeyInput } from "@/lib/engine/typing-key-input";
import { DurationSeconds, TypingEngine } from "@/lib/engine/typing-engine";

const DEFAULT_TEXT =
  "AI helps developers ship features faster while maintaining quality through readable code and deliberate typing practice.";

export interface TypingCapture {
  inputRef: RefObject<HTMLInputElement | null>;
  inputProps: InputHTMLAttributes<HTMLInputElement>;
  focusInput: () => void;
  blurInput: () => void;
  handleExternalKeyDown: (event: KeyboardEvent) => boolean;
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

  const handleKeyInput = useCallback(
    (event: TypingKeyInput) => {
      if (!enabled) return false;
      return dispatchTypingKey(engine, event);
    },
    [enabled, engine]
  );

  const onCaptureKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLInputElement>) => {
      handleKeyInput({
        key: event.key,
        altKey: event.altKey,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        defaultPrevented: event.defaultPrevented,
        isComposing: event.nativeEvent.isComposing,
        preventDefault: () => event.preventDefault()
      });
    },
    [handleKeyInput]
  );

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

  const handleExternalKeyDown = useCallback(
    (event: KeyboardEvent) =>
      handleKeyInput({
        key: event.key,
        altKey: event.altKey,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        defaultPrevented: event.defaultPrevented,
        isComposing: event.isComposing,
        preventDefault: () => event.preventDefault()
      }),
    [handleKeyInput]
  );

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
      handleExternalKeyDown,
      isFocused
    }),
    [blurInput, focusInput, handleExternalKeyDown, inputProps, isFocused]
  );

  return {
    snapshot,
    capture,
    restart: (nextDuration?: DurationSeconds) => engine.restart(nextDuration),
    setText: (nextText: string) => engine.setText(nextText)
  };
}
