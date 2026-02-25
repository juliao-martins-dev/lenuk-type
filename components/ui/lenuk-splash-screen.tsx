"use client";

import Image from "next/image";
import { Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

const STORAGE_KEY = "lenuk-splash-seen";

type SplashPhase = "boot" | "show" | "fade" | "done";

interface LenukSplashScreenProps {
  onVisibilityChange?: (visible: boolean) => void;
  ready?: boolean;
}

export function LenukSplashScreen({ onVisibilityChange, ready = true }: LenukSplashScreenProps) {
  const [phase, setPhase] = useState<SplashPhase>("boot");
  const [minDurationReached, setMinDurationReached] = useState(false);
  const [documentLoaded, setDocumentLoaded] = useState(false);
  const fadeTimerRef = useRef<number | null>(null);
  const loadListenerCleanupRef = useRef<(() => void) | null>(null);

  const visible = phase === "show" || phase === "fade";
  const canClose = phase === "show" && ready && minDurationReached && documentLoaded;

  const timings = useMemo(() => {
    if (typeof window === "undefined") {
      return { minVisibleMs: 1000, fadeMs: 280 };
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    return prefersReducedMotion
      ? { minVisibleMs: 550, fadeMs: 120 }
      : { minVisibleMs: 1050, fadeMs: 260 };
  }, []);

  useEffect(() => {
    if (phase === "boot") return;
    onVisibilityChange?.(visible);
  }, [onVisibilityChange, phase, visible]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const alreadySeen = localStorage.getItem(STORAGE_KEY) === "1";
    if (alreadySeen) {
      setDocumentLoaded(true);
      setMinDurationReached(true);
      setPhase("done");
      return;
    }

    setPhase("show");

    const onLoad = () => setDocumentLoaded(true);
    if (document.readyState === "complete") {
      setDocumentLoaded(true);
    } else {
      window.addEventListener("load", onLoad, { once: true });
      loadListenerCleanupRef.current = () => window.removeEventListener("load", onLoad);
    }

    const minTimer = window.setTimeout(() => setMinDurationReached(true), timings.minVisibleMs);

    return () => {
      window.clearTimeout(minTimer);
      if (fadeTimerRef.current !== null) window.clearTimeout(fadeTimerRef.current);
      loadListenerCleanupRef.current?.();
      loadListenerCleanupRef.current = null;
    };
  }, [timings.minVisibleMs]);

  useEffect(() => {
    if (!canClose) return;

    localStorage.setItem(STORAGE_KEY, "1");
    setPhase("fade");

    fadeTimerRef.current = window.setTimeout(() => {
      setPhase("done");
    }, timings.fadeMs);

    return () => {
      if (fadeTimerRef.current !== null) {
        window.clearTimeout(fadeTimerRef.current);
        fadeTimerRef.current = null;
      }
    };
  }, [canClose, timings.fadeMs]);

  // Render during "boot" as well so the page content does not flash before the splash mounts.
  if (phase === "done") return null;

  return (
    <div
      className={`fixed inset-0 z-[70] flex items-center justify-center px-4 transition-opacity ${
        phase === "fade" ? "opacity-0 duration-300" : "opacity-100 duration-150"
      }`}
      aria-hidden
    >
      <div className="absolute inset-0 bg-background/95 backdrop-blur-md" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,hsl(var(--primary)/0.16),transparent_45%),radial-gradient(circle_at_80%_15%,hsl(var(--primary)/0.12),transparent_40%)]" />

      <div className="relative w-full max-w-xl rounded-3xl border border-border/70 bg-card/80 p-8 text-center shadow-2xl shadow-black/15 backdrop-blur-xl">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-primary lenuk-splash-orb">
          <Image src="/icon.png" alt="Lenuk Type logo" width={32} height={32} priority className="h-8 w-8 rounded-md object-contain" />
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

