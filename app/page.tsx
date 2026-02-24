"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
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

const difficultyOptions = [
  { label: "Easy", value: "easy" },
  { label: "Medium", value: "medium" },
  { label: "Hard", value: "hard" }
];

function getOrCreateUserId() {
  if (typeof window === "undefined") return "anonymous";
  const key = "lenuk-user-id";
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const created = crypto.randomUUID();
  localStorage.setItem(key, created);
  return created;
}

export default function HomePage() {
  const [mode, setMode] = useState<"text" | "code">("text");
  const [duration, setDuration] = useState<DurationSeconds>(30);
  const [difficulty, setDifficulty] = useState("easy");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const submittedRef = useRef(false);

  const currentText = useMemo(() => SAMPLE_TEXTS[mode], [mode]);
  const promptId = useMemo(() => `prompt-${mode}-${currentText.length}`, [mode, currentText]);
  const { snapshot, restart } = useTypingEngine(currentText, duration);

  useEffect(() => {
    if (!snapshot.metrics.finished || submittedRef.current) return;

    submittedRef.current = true;
    setSaveStatus("saving");

    const payload = {
      userId: getOrCreateUserId(),
      mode,
      difficulty,
      durationSeconds: duration,
      wpm: snapshot.metrics.wpm,
      rawWpm: snapshot.metrics.rawWpm,
      accuracy: snapshot.metrics.accuracy,
      errors: snapshot.metrics.errors,
      promptId,
      metadata: {
        correctChars: snapshot.metrics.correctChars,
        typedChars: snapshot.metrics.typedChars,
        elapsed: snapshot.metrics.elapsed
      }
    };

    fetch("/api/results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then((response) => {
        if (!response.ok) throw new Error("Failed to save result");
        setSaveStatus("saved");
      })
      .catch(() => setSaveStatus("error"));
  }, [difficulty, duration, mode, promptId, snapshot.metrics]);

  const handleRestart = (nextDuration?: DurationSeconds) => {
    submittedRef.current = false;
    setSaveStatus("idle");
    restart(nextDuration ?? duration);
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col items-center justify-center px-4 py-10">
      <Card className="w-full">
        <CardContent className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Tabs
              value={mode}
              onValueChange={(next) => {
                setMode(next as "text" | "code");
                handleRestart(duration);
              }}
              options={[
                { label: "Text", value: "text" },
                { label: "Code", value: "code" }
              ]}
            />
            <div className="flex items-center gap-2">
              <Select
                value={difficulty}
                options={difficultyOptions}
                onChange={(event) => {
                  setDifficulty(event.target.value);
                  handleRestart(duration);
                }}
              />
              <Select
                value={String(duration)}
                options={durationOptions.map((d) => ({ label: d.label, value: String(d.value) }))}
                onChange={(event) => {
                  const next = Number(event.target.value) as DurationSeconds;
                  setDuration(next);
                  handleRestart(next);
                }}
              />
              <Tooltip text="Restart">
                <Button variant="ghost" onClick={() => handleRestart(duration)}>
                  Restart
                </Button>
              </Tooltip>
              <Link href="/leaderboard" className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                Leaderboard
              </Link>
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

          <p className="text-sm text-muted-foreground">
            Save status: {saveStatus === "idle" ? "waiting for completed run" : saveStatus}
          </p>
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
