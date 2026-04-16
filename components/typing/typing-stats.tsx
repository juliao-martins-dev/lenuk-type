"use client";

import { memo } from "react";
import { useTranslation } from "react-i18next";
import type { EngineMetrics } from "@/lib/engine/typing-engine";

interface TypingStatsProps {
  metrics: EngineMetrics;
  /** When true, show the expanded post-run result layout. */
  finished?: boolean;
}

function TypingStatsInner({ metrics, finished }: TypingStatsProps) {
  const { t } = useTranslation();

  // During a run: show compact inline stats
  // After run: show hero result
  if (finished) {
    return (
      <div className="space-y-5">
        {/* Hero WPM */}
        <div className="flex flex-col items-center gap-1 py-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[hsl(var(--sub))]">
            {t("statsWPM")}
          </span>
          <span className="text-6xl font-extrabold tabular-nums tracking-tight text-[hsl(var(--caret))] sm:text-7xl">
            {metrics.wpm}
          </span>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <ResultStat label={t("statsAccuracy")} value={`${metrics.accuracy}%`} />
          <ResultStat label={t("statsRaw")} value={metrics.rawWpm} />
          <ResultStat label={t("statsErrors")} value={metrics.errors} />
          <ResultStat label={t("statsStreak")} value={metrics.bestStreak ?? metrics.streak} />
        </div>

        {/* WPM chart */}
        {metrics.wpmSamples.length >= 2 && (
          <div className="rounded-xl border border-border/50 bg-card/50 px-4 pb-3 pt-3 backdrop-blur">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[hsl(var(--sub))]">
                {t("statsSparkline")}
              </p>
              <p className="text-xs font-bold tabular-nums text-[hsl(var(--caret))]">
                {metrics.wpmSamples[metrics.wpmSamples.length - 1]} wpm
              </p>
            </div>
            <WpmChart samples={metrics.wpmSamples} />
          </div>
        )}
      </div>
    );
  }

  // Live stats during a run — compact horizontal bar
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 rounded-xl border border-border/40 bg-card/50 px-4 py-3 backdrop-blur">
        <LiveStat label={t("statsWPM")} value={metrics.wpm} highlight valueCh={3} />
        <span className="hidden h-5 w-px bg-border/40 sm:block" aria-hidden />
        <LiveStat label={t("statsAccuracy")} value={`${metrics.accuracy}%`} valueCh={4} />
        <LiveStat label={t("statsRaw")} value={metrics.rawWpm} valueCh={3} />
        <LiveStat label={t("statsErrors")} value={metrics.errors} valueCh={3} />
        <LiveStat label={t("statsTime")} value={`${Math.ceil(metrics.timeLeft)}s`} valueCh={3} />
        <StreakStat label={t("statsStreak")} streak={metrics.streak} valueCh={3} />
      </div>

      {metrics.wpmSamples.length >= 2 && (
        <div className="rounded-xl border border-border/40 bg-card/50 px-3 pb-2 pt-2.5 backdrop-blur">
          <div className="mb-1.5 flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[hsl(var(--sub))]">
              {t("statsSparkline")}
            </p>
            <p className="text-xs font-bold tabular-nums text-[hsl(var(--caret))]">
              {metrics.wpmSamples[metrics.wpmSamples.length - 1]} wpm
            </p>
          </div>
          <WpmSparkline samples={metrics.wpmSamples} />
        </div>
      )}
    </div>
  );
}

export const TypingStats = memo(TypingStatsInner, (prev, next) => (
  prev.metrics.wpm === next.metrics.wpm &&
  prev.metrics.rawWpm === next.metrics.rawWpm &&
  prev.metrics.accuracy === next.metrics.accuracy &&
  prev.metrics.errors === next.metrics.errors &&
  Math.ceil(prev.metrics.timeLeft) === Math.ceil(next.metrics.timeLeft) &&
  prev.metrics.streak === next.metrics.streak &&
  prev.metrics.wpmSamples === next.metrics.wpmSamples &&
  prev.finished === next.finished
));

/* ── Live stat (during run) ── */
function LiveStat({ label, value, highlight, valueCh = 3 }: { label: string; value: string | number; highlight?: boolean; valueCh?: number }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[hsl(var(--sub))]">{label}</span>
      <span
        className={`inline-block text-left text-lg font-bold tabular-nums ${highlight ? "text-[hsl(var(--caret))]" : "text-foreground"}`}
        style={{ minWidth: `${valueCh}ch` }}
      >
        {value}
      </span>
    </div>
  );
}

/* ── Post-run result stat ── */
function ResultStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-xl border border-border/40 bg-card/60 px-3 py-3 backdrop-blur">
      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[hsl(var(--sub))]">{label}</span>
      <span className="text-2xl font-bold tabular-nums text-foreground">{value}</span>
    </div>
  );
}

/* ── Streak with progressive color ── */
function StreakStat({ label, streak, valueCh = 3 }: { label: string; streak: number; valueCh?: number }) {
  let valueClass = "text-foreground";
  if (streak >= 50) valueClass = "text-orange-500 dark:text-orange-400";
  else if (streak >= 25) valueClass = "text-amber-500 dark:text-amber-400";
  else if (streak >= 10) valueClass = "text-yellow-500 dark:text-yellow-400";

  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[hsl(var(--sub))]">{label}</span>
      <span
        className={`inline-block text-left text-lg font-bold tabular-nums transition-colors duration-200 ${valueClass}`}
        style={{ minWidth: `${valueCh}ch` }}
      >
        {streak}
      </span>
    </div>
  );
}

/* ── Post-run WPM chart (larger, with grid lines) ── */
function WpmChart({ samples }: { samples: readonly number[] }) {
  const W = 500;
  const H = 80;
  const padX = 4;
  const padY = 8;
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
  const fillPoints = [
    `${pts[0].x.toFixed(1)},${(padY + innerH).toFixed(1)}`,
    ...pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`),
    `${pts[n - 1].x.toFixed(1)},${(padY + innerH).toFixed(1)}`,
  ].join(" ");
  const last = pts[n - 1];

  // Horizontal grid lines at 25%, 50%, 75%
  const gridLines = [0.25, 0.5, 0.75].map((frac) => padY + (1 - frac) * innerH);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-20 w-full" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id="wpm-chart-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--caret))" stopOpacity="0.25" />
          <stop offset="100%" stopColor="hsl(var(--caret))" stopOpacity="0" />
        </linearGradient>
      </defs>
      {gridLines.map((y, i) => (
        <line key={i} x1={padX} y1={y} x2={W - padX} y2={y} stroke="hsl(var(--border))" strokeWidth="0.5" strokeDasharray="4 4" />
      ))}
      <polygon points={fillPoints} fill="url(#wpm-chart-fill)" />
      <polyline points={linePoints} fill="none" stroke="hsl(var(--caret))" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {last && <circle cx={last.x.toFixed(1)} cy={last.y.toFixed(1)} r="4" fill="hsl(var(--caret))" />}
    </svg>
  );
}

/* ── Live sparkline (compact) ── */
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
  const fillPoints = [
    `${pts[0].x.toFixed(1)},${(padY + innerH).toFixed(1)}`,
    ...pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`),
    `${pts[n - 1].x.toFixed(1)},${(padY + innerH).toFixed(1)}`,
  ].join(" ");
  const last = pts[n - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-10 w-full" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id="wpm-sparkline-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--caret))" stopOpacity="0.28" />
          <stop offset="100%" stopColor="hsl(var(--caret))" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={fillPoints} fill="url(#wpm-sparkline-fill)" />
      <polyline points={linePoints} fill="none" stroke="hsl(var(--caret))" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      {last && <circle cx={last.x.toFixed(1)} cy={last.y.toFixed(1)} r="3" fill="hsl(var(--caret))" />}
    </svg>
  );
}
