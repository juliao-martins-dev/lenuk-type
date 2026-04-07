"use client";

import { useEffect, useRef, useState } from "react";

export interface SwipeState {
  /** 0 = no swipe in progress; 1.0 = threshold reached and restart triggered. */
  progress: number;
  direction: "left" | "right" | null;
}

const IDLE: SwipeState = { progress: 0, direction: null };

interface Options {
  enabled: boolean;
  onRestart: () => void;
  /** Minimum horizontal displacement (px) to trigger restart. Default 80. */
  threshold?: number;
  /** Maximum vertical drift (px) before the gesture is treated as a scroll. Default 55. */
  maxVerticalDrift?: number;
}

/**
 * Detects a horizontal swipe gesture on the given element and calls onRestart
 * when the swipe distance exceeds `threshold`. Returns live swipe progress for
 * rendering visual feedback in the caller.
 *
 * Touch event notes
 * ─────────────────
 * • touchstart / touchend are registered as passive (browser can optimise scrolling).
 * • touchmove is registered as { passive: false } so we can call preventDefault()
 *   and suppress vertical scroll while a clear horizontal gesture is underway.
 * • Vertical drift > maxVerticalDrift cancels the gesture immediately so the
 *   user can still scroll normally.
 */
export function useSwipeToRestart(
  elementRef: React.RefObject<HTMLElement | null>,
  { enabled, onRestart, threshold = 80, maxVerticalDrift = 55 }: Options,
): SwipeState {
  const [swipe, setSwipe] = useState<SwipeState>(IDLE);

  // Keep a stable ref to onRestart so the effect doesn't need it in deps.
  const onRestartRef = useRef(onRestart);
  useEffect(() => {
    onRestartRef.current = onRestart;
  });

  // Mutable touch session state — lives outside React state for zero-lag reads.
  const sessionRef = useRef<{
    startX: number;
    startY: number;
    cancelled: boolean;
    triggered: boolean;
  } | null>(null);

  useEffect(() => {
    const el = elementRef.current;
    if (!el || !enabled) {
      setSwipe(IDLE);
      return;
    }

    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      sessionRef.current = {
        startX: t.clientX,
        startY: t.clientY,
        cancelled: false,
        triggered: false,
      };
      setSwipe(IDLE);
    };

    const onTouchMove = (e: TouchEvent) => {
      const session = sessionRef.current;
      if (!session || session.cancelled || session.triggered) return;

      const t = e.touches[0];
      const dx = t.clientX - session.startX;
      const dy = t.clientY - session.startY;

      // Cancel if the user is scrolling vertically.
      if (Math.abs(dy) > maxVerticalDrift) {
        session.cancelled = true;
        setSwipe(IDLE);
        return;
      }

      const absDx = Math.abs(dx);
      const direction: "left" | "right" = dx > 0 ? "right" : "left";
      const progress = Math.min(absDx / threshold, 1);

      setSwipe({ progress, direction });

      // Suppress default scroll only once a clear horizontal intent is detected.
      if (absDx > 10) e.preventDefault();
    };

    const onTouchEnd = () => {
      const session = sessionRef.current;
      sessionRef.current = null;

      if (!session || session.cancelled) {
        setSwipe(IDLE);
        return;
      }

      setSwipe((prev) => {
        if (prev.progress >= 1 && !session.triggered) {
          session.triggered = true;
          // Give the UI one frame to show the completed state, then restart.
          setTimeout(() => {
            try {
              navigator.vibrate?.(40);
            } catch {
              // vibrate not supported — silently ignore
            }
            onRestartRef.current();
          }, 80);
        }
        return IDLE;
      });
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    el.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
      setSwipe(IDLE);
    };
  }, [enabled, threshold, maxVerticalDrift, elementRef]);

  return swipe;
}
