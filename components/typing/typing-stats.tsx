"use client";

import { memo } from "react";
import { useTranslation } from "react-i18next";
import type { EngineMetrics } from "@/lib/engine/typing-engine";

interface TypingStatsProps {
  metrics: EngineMetrics;
}

function TypingStatsInner({ metrics }: TypingStatsProps) {
  const { t } = useTranslation();
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
        <Stat label={t("statsWPM")} value={metrics.wpm} />
        <Stat label={t("statsRaw")} value={metrics.rawWpm} />
        <Stat label={t("statsAccuracy")} value={`${metrics.accuracy}%`} />
        <Stat label={t("statsErrors")} value={metrics.errors} />
        <Stat label={t("statsTime")} value={`${Math.ceil(metrics.timeLeft)}s`} />
        <StreakStat label={t("statsStreak")} streak={metrics.streak} />
      </div>

      {metrics.wpmSamples.length >= 2 && (
        <div className="rounded-xl border bg-card/70 px-3 pb-2 pt-2.5 shadow-sm backdrop-blur">
          <div className="mb-1.5 flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
              {t("statsSparkline")}
            </p>
            <p className="text-xs font-semibold tabular-nums text-primary">
              {metrics.wpmSamples[metrics.wpmSamples.length - 1]} wpm
            </p>
          </div>
          <WpmSparkline samples={metrics.wpmSamples} />
        </div>
      )}
    </div>
  );
}

// Only re-render when displayed values actually change.
// wpmSamples uses reference equality — array ref changes only when a new sample
// is appended (at most once per second), not on every 60 fps engine tick.
export const TypingStats = memo(TypingStatsInner, (prev, next) => (
  prev.metrics.wpm === next.metrics.wpm &&
  prev.metrics.rawWpm === next.metrics.rawWpm &&
  prev.metrics.accuracy === next.metrics.accuracy &&
  prev.metrics.errors === next.metrics.errors &&
  Math.ceil(prev.metrics.timeLeft) === Math.ceil(next.metrics.timeLeft) &&
  prev.metrics.streak === next.metrics.streak &&
  prev.metrics.wpmSamples === next.metrics.wpmSamples
));

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border bg-card/70 p-3 shadow-sm backdrop-blur">
      <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

/**
 * Streak stat with progressive color coding:
 *   0–9   → default foreground
 *   10–24 → yellow
 *   25–49 → amber / orange
 *   50+   → vivid orange with a warm border glow
 */
function StreakStat({ label, streak }: { label: string; streak: number }) {
  let valueClass = "text-foreground";
  let borderClass = "border";

  if (streak >= 50) {
    valueClass = "text-orange-500 dark:text-orange-400";
    borderClass = "border border-orange-400/40";
  } else if (streak >= 25) {
    valueClass = "text-amber-500 dark:text-amber-400";
    borderClass = "border border-amber-400/30";
  } else if (streak >= 10) {
    valueClass = "text-yellow-500 dark:text-yellow-400";
    borderClass = "border border-yellow-400/25";
  }

  return (
    <div className={`rounded-xl bg-card/70 p-3 shadow-sm backdrop-blur ${borderClass}`}>
      <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className={`mt-1 text-xl font-semibold tabular-nums transition-colors duration-200 ${valueClass}`}>
        {streak}
      </p>
    </div>
  );
}

/**
 * Minimal SVG sparkline — pure geometry, no external library.
 *
 * Each sample is a per-second instantaneous WPM value.
 * The polyline maps sample index → x and WPM value → y (inverted, SVG origin
 * is top-left). A gradient polygon fills the area under the line.
 */
function WpmSparkline({ samples }: { samples: readonly number[] }) {
  const W = 400;
  const H = 40;
  const padX = 2;
  const padY = 4;
  const innerW = W - padX * 2;
  const innerH = H - padY * 2;

  const maxWpm = Math.max(...samples, 1);
  const n = samples.length;

  const pts = samples.map((wpm, i) => {
    const x = padX + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
    const y = padY + (1 - wpm / maxWpm) * innerH;
    return { x, y };
  });

  const linePoints = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  // Close the fill polygon at the bottom-right and bottom-left corners.
  const fillPoints = [
    `${pts[0].x.toFixed(1)},${(padY + innerH).toFixed(1)}`,
    ...pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`),
    `${pts[n - 1].x.toFixed(1)},${(padY + innerH).toFixed(1)}`,
  ].join(" ");

  const last = pts[n - 1];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-10 w-full"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id="wpm-sparkline-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.28" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Filled area under the line */}
      <polygon points={fillPoints} fill="url(#wpm-sparkline-fill)" />

      {/* The line itself */}
      <polyline
        points={linePoints}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Dot at the latest data point */}
      {last && (
        <circle
          cx={last.x.toFixed(1)}
          cy={last.y.toFixed(1)}
          r="3"
          fill="hsl(var(--primary))"
        />
      )}
    </svg>
  );
}
