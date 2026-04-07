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
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
      <Stat label={t("statsWPM")} value={metrics.wpm} />
      <Stat label={t("statsRaw")} value={metrics.rawWpm} />
      <Stat label={t("statsAccuracy")} value={`${metrics.accuracy}%`} />
      <Stat label={t("statsErrors")} value={metrics.errors} />
      <Stat label={t("statsTime")} value={`${Math.ceil(metrics.timeLeft)}s`} />
      <StreakStat label={t("statsStreak")} streak={metrics.streak} />
    </div>
  );
}

// Only re-render when displayed values actually change.
// timeLeft is shown as whole seconds, so ceil-compare avoids 10 re-renders/sec.
export const TypingStats = memo(TypingStatsInner, (prev, next) => (
  prev.metrics.wpm === next.metrics.wpm &&
  prev.metrics.rawWpm === next.metrics.rawWpm &&
  prev.metrics.accuracy === next.metrics.accuracy &&
  prev.metrics.errors === next.metrics.errors &&
  Math.ceil(prev.metrics.timeLeft) === Math.ceil(next.metrics.timeLeft) &&
  prev.metrics.streak === next.metrics.streak
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
