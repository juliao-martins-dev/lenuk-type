"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { Select } from "@/components/ui/select";
import { Tooltip } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { DurationSeconds } from "@/lib/engine/typing-engine";
import { useTypingEngine } from "@/hooks/use-typing-engine";

const SAMPLE_TEXTS: Record<string, string> = {
  text: "Refactoring in small steps keeps software stable and lets teams move quickly with confidence.",
  code: "const result = values.filter(Boolean).map((item) => item.trim()).join(' ');"
};

const durationOptions: Array<{ label: string; value: DurationSeconds }> = [
  { label: "15s", value: 15 },
  { label: "30s", value: 30 },
  { label: "60s", value: 60 }
];

export default function HomePage() {
  const [mode, setMode] = useState<"text" | "code">("text");
  const [duration, setDuration] = useState<DurationSeconds>(30);
  const currentText = useMemo(() => SAMPLE_TEXTS[mode], [mode]);
  const { snapshot, restart } = useTypingEngine(currentText, duration);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col items-center justify-center px-4 py-10">
      <Card className="w-full">
        <CardContent className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Tabs
              value={mode}
              onValueChange={(next) => {
                setMode(next as "text" | "code");
                restart(duration);
              }}
              options={[
                { label: "Text", value: "text" },
                { label: "Code", value: "code" }
              ]}
            />
            <div className="flex items-center gap-2">
              <Select
                value={String(duration)}
                options={durationOptions.map((d) => ({ label: d.label, value: String(d.value) }))}
                onChange={(event) => {
                  const next = Number(event.target.value) as DurationSeconds;
                  setDuration(next);
                  restart(next);
                }}
              />
              <Tooltip text="Restart">
                <Button variant="ghost" onClick={() => restart(duration)}>
                  Restart
                </Button>
              </Tooltip>
            </div>
          </div>

          <Progress value={snapshot.metrics.progress} />

          <section className="rounded-lg border bg-background/40 p-4 text-2xl leading-relaxed tracking-wide">
            {snapshot.text.split("").map((character, index) => {
              const status = snapshot.statuses[index];
              const active = index === snapshot.index;

              return (
                <span
                  key={`${character}-${index}`}
                  className={
                    active
                      ? "rounded bg-primary/20 text-foreground"
                      : status === 1
                        ? "text-foreground"
                        : status === -1
                          ? "text-destructive"
                          : "text-muted-foreground"
                  }
                >
                  {character}
                </span>
              );
            })}
          </section>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <Stat label="WPM" value={snapshot.metrics.wpm} />
            <Stat label="Raw" value={snapshot.metrics.rawWpm} />
            <Stat label="Accuracy" value={`${snapshot.metrics.accuracy}%`} />
            <Stat label="Errors" value={snapshot.metrics.errors} />
            <Stat label="Time" value={`${Math.ceil(snapshot.metrics.timeLeft)}s`} />
          </div>
        </CardContent>
      </Card>
    </main>
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
