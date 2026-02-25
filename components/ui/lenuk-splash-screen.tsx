"use client";

import { Keyboard, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

const STORAGE_KEY = "lenuk-splash-seen";

interface LenukSplashScreenProps {
  onVisibilityChange?: (visible: boolean) => void;
}

export function LenukSplashScreen({ onVisibilityChange }: LenukSplashScreenProps) {
  const [phase, setPhase] = useState<"boot" | "show" | "fade" | "done">("boot");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const alreadySeen = localStorage.getItem(STORAGE_KEY) === "1";
    if (alreadySeen) {
      setPhase("done");
      onVisibilityChange?.(false);
      return;
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const showDurationMs = prefersReducedMotion ? 900 : 1400;
    const fadeLeadMs = prefersReducedMotion ? 180 : 320;

    localStorage.setItem(STORAGE_KEY, "1");
    setPhase("show");
    onVisibilityChange?.(true);

    const fadeTimer = window.setTimeout(() => setPhase("fade"), Math.max(0, showDurationMs - fadeLeadMs));
    const doneTimer = window.setTimeout(() => {
      setPhase("done");
      onVisibilityChange?.(false);
    }, showDurationMs);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(doneTimer);
    };
  }, [onVisibilityChange]);

  if (phase === "done" || phase === "boot") return null;

  return (
    <div
      className={`fixed inset-0 z-[70] flex items-center justify-center px-4 transition-opacity duration-300 ${
        phase === "fade" ? "opacity-0" : "opacity-100"
      }`}
      aria-hidden
    >
      <div className="absolute inset-0 bg-background/95 backdrop-blur-md" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,hsl(var(--primary)/0.16),transparent_45%),radial-gradient(circle_at_80%_15%,hsl(var(--primary)/0.12),transparent_40%)]" />

      <div className="relative w-full max-w-xl rounded-3xl border border-border/70 bg-card/80 p-8 text-center shadow-2xl shadow-black/15 backdrop-blur-xl">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-primary lenuk-splash-orb">
          <Keyboard className="h-8 w-8" />
        </div>

        <div className="lenuk-splash-rise">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border bg-background/60 px-3 py-1 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Beginner-friendly typing practice
          </div>

          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Lenuk Type</h1>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            Fast typing test for Timor-Leste and global users
          </p>
          <p className="mt-1 text-xs text-muted-foreground/90 sm:text-sm">
            Teste tipu lalais ba Timor-Leste no mundu
          </p>
        </div>
      </div>
    </div>
  );
}

