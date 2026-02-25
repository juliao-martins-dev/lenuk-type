"use client";

import type { EngineMetrics } from "@/lib/engine/typing-engine";

interface TypingStatsProps {
  metrics: EngineMetrics;
}

export function TypingStats({ metrics }: TypingStatsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
      <Stat label="WPM" value={metrics.wpm} />
      <Stat label="Raw" value={metrics.rawWpm} />
      <Stat label="Accuracy" value={`${metrics.accuracy}%`} />
      <Stat label="Errors" value={metrics.errors} />
      <Stat label="Time" value={`${Math.ceil(metrics.timeLeft)}s`} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border bg-card/70 p-3 shadow-sm backdrop-blur">
      <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
