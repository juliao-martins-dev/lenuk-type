"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { DurationSeconds, TypingEngine } from "@/lib/engine/typing-engine";

const DEFAULT_TEXT =
  "AI helps developers ship features faster while maintaining quality through readable code and deliberate typing practice.";

export function useTypingEngine(text: string = DEFAULT_TEXT, duration: DurationSeconds = 30) {
  const engine = useMemo(() => new TypingEngine(text, duration), [text, duration]);

  const snapshot = useSyncExternalStore(engine.subscribe, engine.getSnapshot, engine.getSnapshot);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key === "Tab") return;
      event.preventDefault();
      engine.handleKey(event.key === "Enter" ? "\n" : event.key);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [engine]);

  return {
    snapshot,
    restart: (nextDuration?: DurationSeconds) => engine.restart(nextDuration),
    setText: (nextText: string) => engine.setText(nextText)
  };
}
