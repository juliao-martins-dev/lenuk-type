"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DurationSeconds, EngineSnapshot, TypingEngine } from "@/lib/engine/typing-engine";

const DEFAULT_TEXT =
  "AI helps developers ship features faster while maintaining quality through readable code and deliberate typing practice.";

export function useTypingEngine(text: string = DEFAULT_TEXT, duration: DurationSeconds = 30) {
  const engine = useMemo(() => new TypingEngine(text, duration), [text, duration]);
  const [snapshot, setSnapshot] = useState<EngineSnapshot>(() => engine.getSnapshot());
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    setSnapshot(engine.getSnapshot());

    const onEngineUpdate = () => {
      if (frameRef.current !== null) return;
      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = null;
        setSnapshot(engine.getSnapshot());
      });
    };

    const unsubscribe = engine.subscribe(onEngineUpdate);

    return () => {
      unsubscribe();
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [engine]);

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
