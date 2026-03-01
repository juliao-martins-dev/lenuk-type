import type { TypingEngine } from "@/lib/engine/typing-engine";

export interface TypingKeyInput {
  key: string;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  defaultPrevented: boolean;
  isComposing?: boolean;
  preventDefault: () => void;
}

type TypingKeyEngine = Pick<TypingEngine, "restart" | "handleBackspace" | "handleKey">;

function isTypingInputKey(key: string) {
  return key.length === 1 || key === "Enter";
}

export function dispatchTypingKey(engine: TypingKeyEngine, event: TypingKeyInput) {
  if (event.defaultPrevented || event.isComposing) return false;
  if (event.ctrlKey || event.metaKey || event.altKey) return false;

  if (event.key === "Escape") {
    event.preventDefault();
    engine.restart();
    return true;
  }

  if (event.key === "Tab") return false;

  if (event.key === "Backspace") {
    event.preventDefault();
    engine.handleBackspace();
    return true;
  }

  if (!isTypingInputKey(event.key)) return false;

  event.preventDefault();
  engine.handleKey(event.key === "Enter" ? "\n" : event.key);
  return true;
}
