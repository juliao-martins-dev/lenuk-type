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
    <div className="rounded-md border bg-muted/20 p-3">
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold">{value}</p>
    </div>
  );
}

