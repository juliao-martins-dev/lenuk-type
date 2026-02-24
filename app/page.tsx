"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CountryFlag } from "@/components/ui/country-flag";
import { CountryPicker } from "@/components/ui/country-picker";
import { Tabs } from "@/components/ui/tabs";
import { Select } from "@/components/ui/select";
import { Tooltip } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { COUNTRY_CODE_SET, COUNTRY_OPTIONS } from "@/lib/countries";
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

function getUserName() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("lenuk-user-name") ?? "";
}

function getUserCountry() {
  if (typeof window === "undefined") return "";
  return (localStorage.getItem("lenuk-user-country") ?? "").toUpperCase();
}

export default function HomePage() {
  const [mode, setMode] = useState<"text" | "code">("text");
  const [duration, setDuration] = useState<DurationSeconds>(30);
  const [difficulty, setDifficulty] = useState("easy");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [userName, setUserName] = useState("");
  const [userCountry, setUserCountry] = useState("");
  const [draftName, setDraftName] = useState("");
  const [draftCountry, setDraftCountry] = useState("");
  const [showCelebration, setShowCelebration] = useState(false);
  const submittedRef = useRef(false);

  const currentText = useMemo(() => SAMPLE_TEXTS[mode], [mode]);
  const promptId = useMemo(() => `prompt-${mode}-${currentText.length}`, [mode, currentText]);
  const { snapshot, restart } = useTypingEngine(currentText, duration, Boolean(userName && userCountry));

  useEffect(() => {
    const existingName = getUserName();
    const existingCountry = getUserCountry();
    if (existingName) {
      setUserName(existingName);
      setDraftName(existingName);
    }
    if (existingCountry) {
      setUserCountry(existingCountry);
      setDraftCountry(existingCountry);
    }
  }, []);

  useEffect(() => {
    if (!snapshot.metrics.finished || submittedRef.current || !userName || !userCountry) return;

    submittedRef.current = true;
    setSaveStatus("saving");
    setShowCelebration(true);
    window.setTimeout(() => setShowCelebration(false), 2400);

    const payload = {
      userId: getOrCreateUserId(),
      player: userName,
      country: userCountry,
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
  }, [difficulty, duration, mode, promptId, snapshot.metrics, userCountry, userName]);

  const handleRestart = (nextDuration?: DurationSeconds) => {
    submittedRef.current = false;
    setSaveStatus("idle");
    restart(nextDuration ?? duration);
  };
  
  const saveProfile = () => {
    const nextName = draftName.trim();
    const nextCountry = draftCountry.trim().toUpperCase();
    if (!nextName || !COUNTRY_CODE_SET.has(nextCountry)) return;
    localStorage.setItem("lenuk-user-name", nextName);
    localStorage.setItem("lenuk-user-country", nextCountry);
    getOrCreateUserId();
    setUserName(nextName);
    setUserCountry(nextCountry);
  };

  return (
    <>
      {showCelebration && <CelebrationOverlay name={userName} />}

      {(!userName || !userCountry) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <Card className="w-full max-w-md">
            <CardContent className="space-y-4 p-6">
              <h2 className="text-xl font-semibold">Welcome to Lenuk Type</h2>
              <p className="text-sm text-muted-foreground">
                Enter your name and country once to start. Next visits will remember you.
              </p>
              <input
                autoFocus
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                placeholder="Your name"
                className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none ring-ring focus:ring-2"
                onKeyDown={(event) => {
                  if (event.key === "Enter") saveProfile();
                }}
              />
              <CountryPicker value={draftCountry} options={COUNTRY_OPTIONS} onChange={setDraftCountry} />
              <Button
                onClick={saveProfile}
                className="w-full"
                disabled={!draftName.trim() || !COUNTRY_CODE_SET.has(draftCountry.toUpperCase())}
              >
                Save profile and start
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col items-center justify-center px-4 py-10">
        <Card className="w-full">
          <CardContent className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm">
                <User className="h-4 w-4 text-primary" />
                {userCountry && <CountryFlag code={userCountry} />}
                <span>{userName || "Guest"}</span>
              </div>

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
                <Link
                  href="/leaderboard"
                  className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
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

            <p className="text-sm text-muted-foreground">Save status: {saveStatus === "idle" ? "waiting for completed run" : saveStatus}</p>
          </CardContent>
        </Card>
      </main>
    </>
  );
}

function CelebrationOverlay({ name }: { name: string }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
      <div className="absolute inset-0 bg-primary/10" />
      <div className="absolute left-1/2 top-1/3 -translate-x-1/2 text-center">
        <p className="text-3xl font-bold">🔥 Amazing, {name}! 👏</p>
        <p className="mt-2 text-sm text-muted-foreground">You finished the run!</p>
      </div>
      {Array.from({ length: 24 }).map((_, index) => (
        <span
          key={index}
          className="firework-dot"
          style={{
            left: `${(index % 8) * 12 + 6}%`,
            animationDelay: `${(index % 6) * 0.08}s`
          }}
        />
      ))}
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
