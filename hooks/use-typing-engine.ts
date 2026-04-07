"use client";

/**
 * useTypingEngine — glue between the TypingEngine and React.
 *
 * Layer responsibilities
 * ─────────────────────
 * INPUT LAYER   onCaptureKeyDown captures every keydown event and routes it
 *               to the engine synchronously. The timestamp is taken here —
 *               at the edge of the JS event loop — before any React
 *               scheduling overhead.
 *
 * LOGIC LAYER   TypingEngine owns all state mutations. The hook never calls
 *               setState with game data; it only subscribes via
 *               useSyncExternalStore.
 *
 * RENDERING LAYER   snapshot comes from the engine's immutable snapshot.
 *               The hook exposes it read-only to the component tree.
 *
 * Synchronization notes
 * ─────────────────────
 * • No requestAnimationFrame is managed here. The engine handles its own rAF
 *   timer loop, which starts on the first keystroke and stops on finish.
 * • isFocused is React state because it only drives UI (caret pulse animation,
 *   focus-hint overlay). It does NOT affect game logic timing.
 * • capture.inputRef gives the invisible <input> element focus, which is
 *   necessary for virtual keyboards on mobile.
 */

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

  // useSyncExternalStore subscribes to the engine's rAF-driven notifications.
  // React re-renders only when the engine calls notify() — i.e., on keystrokes
  // and timer ticks. No polling, no extra state.
  const snapshot = useSyncExternalStore(engine.subscribe, engine.getSnapshot, engine.getSnapshot);

  useEffect(() => () => engine.dispose(), [engine]);

  useEffect(() => {
    if (enabled) return;
    setIsFocused(false);
    inputRef.current?.blur();
  }, [enabled]);

  /**
   * Central input handler — routes every valid key to the engine.
   *
   * Called from two paths:
   *   1. onCaptureKeyDown (React synthetic event on the hidden <input>)
   *   2. handleExternalKeyDown (native window keydown, for when input is unfocused)
   *
   * The engine processes the key synchronously so the snapshot update and
   * the subsequent React re-render happen within the same microtask batch —
   * zero frame delay between keystroke and visual feedback.
   */
  const handleKeyInput = useCallback(
    (event: TypingKeyInput) => {
      if (!enabled) return false;
      return dispatchTypingKey(engine, event);
    },
    [enabled, engine]
  );

  const onCaptureKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLInputElement>) => {
      // Capture the timestamp at the event boundary — before React processing —
      // so it reflects the true moment the key was pressed. This value travels
      // through the input queue and becomes startedAt on the first character.
      const timestampMs =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      handleKeyInput({
        key: event.key,
        altKey: event.altKey,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        defaultPrevented: event.defaultPrevented,
        isComposing: event.nativeEvent.isComposing,
        preventDefault: () => event.preventDefault(),
        timestampMs,
      });
    },
    [handleKeyInput]
  );

  const onCapturePaste = useCallback((event: ClipboardEvent<HTMLInputElement>) => {
    // Block paste entirely — typing game requires individual keystrokes.
    event.preventDefault();
  }, []);

  const focusInput = useCallback(() => {
    if (!enabled) return;
    inputRef.current?.focus({ preventScroll: true });
  }, [enabled]);

  const blurInput = useCallback(() => {
    inputRef.current?.blur();
  }, []);

  /**
   * Handles keydown events fired on window (when the hidden input is not focused).
   * Uses the native KeyboardEvent directly — no React wrapper overhead.
   */
  const handleExternalKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Same timestamp strategy as onCaptureKeyDown — capture at the
      // native event boundary, before any other processing.
      const timestampMs =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      return handleKeyInput({
        key: event.key,
        altKey: event.altKey,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        defaultPrevented: event.defaultPrevented,
        isComposing: event.isComposing,
        preventDefault: () => event.preventDefault(),
        timestampMs,
      });
    },
    [handleKeyInput]
  );

  // inputProps is stable across renders as long as enabled doesn't change.
  // Passing a stable object prevents unnecessary re-renders of the <input> element.
  const inputProps = useMemo<InputHTMLAttributes<HTMLInputElement>>(
    () => ({
      // Controlled empty value — the input is an invisible keystroke capture surface,
      // not a text field. Keeps the browser from accumulating characters.
      value: "",
      onChange: () => undefined,
      onKeyDown: onCaptureKeyDown,
      onPaste: onCapturePaste,
      onFocus: () => setIsFocused(true),
      onBlur: () => setIsFocused(false),
      // Disable all browser text-processing so raw keystrokes reach onKeyDown.
      autoCapitalize: "off",
      autoComplete: "off",
      autoCorrect: "off",
      spellCheck: false,
      // inputMode="text" keeps the virtual keyboard on mobile.
      inputMode: "text",
      disabled: !enabled,
      "aria-label": "Typing input capture",
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
      isFocused,
    }),
    [blurInput, focusInput, handleExternalKeyDown, inputProps, isFocused]
  );

  return {
    snapshot,
    capture,
    restart: (nextDuration?: DurationSeconds) => engine.restart(nextDuration),
    setText: (nextText: string) => engine.setText(nextText),
  };
}
