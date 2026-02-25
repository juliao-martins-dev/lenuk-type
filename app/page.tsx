"use client";

import Link from "next/link";
import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, RotateCcw, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CountryFlag } from "@/components/ui/country-flag";
import { CountryPicker } from "@/components/ui/country-picker";
import { Tabs } from "@/components/ui/tabs";
import { Select } from "@/components/ui/select";
import { Tooltip } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { TypingPrompt } from "@/components/typing/typing-prompt";
import { TypingStats } from "@/components/typing/typing-stats";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { getCountryOptions, isSupportedCountryCode, type CountryOption } from "@/lib/countries";
import { DurationSeconds } from "@/lib/engine/typing-engine";
import { useTypingEngine } from "@/hooks/use-typing-engine";
import { DEFAULT_LANGUAGE_CODE, listLanguages, type SupportedLanguageCode } from "@/src/content/languages";
import { useTestContent } from "@/src/content/use-test-content";

const CODE_SAMPLE_TEXT =
  "function formatValues(values) {\n  return values\n    .filter(Boolean)\n    .map((item) => item.trim())\n    .join(\" \");\n}";

const durationOptions: Array<{ label: string; value: DurationSeconds }> = [
  { label: "15s", value: 15 },
  { label: "30s", value: 30 },
  { label: "60s", value: 60 }
];

const difficultyOptions = [
  { label: "Easy", value: "easy" },
  { label: "Medium", value: "medium" },
  { label: "Hard", value: "hard" }
] as const;

const textWordCountOptions = [
  { label: "25w", value: "25" },
  { label: "50w", value: "50" },
  { label: "60w", value: "60" },
  { label: "100w", value: "100" },
  { label: "200w", value: "200" }
] as const;

const typingLanguageOptions = listLanguages().map((language) => ({
  label: language.name,
  value: language.code
}));

const supportedTypingLanguageCodes = new Set<SupportedLanguageCode>(
  typingLanguageOptions.map((option) => option.value as SupportedLanguageCode)
);
const supportedModes = new Set<"text" | "code">(["text", "code"]);
const supportedDurations = new Set<DurationSeconds>(durationOptions.map((option) => option.value));
const supportedDifficulties = new Set<string>(difficultyOptions.map((option) => option.value));
const supportedTextWordCounts = new Set<number>(textWordCountOptions.map((option) => Number(option.value)));

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

function isSupportedTypingLanguageCode(value: string): value is SupportedLanguageCode {
  return supportedTypingLanguageCodes.has(value as SupportedLanguageCode);
}

function getTypingLanguageCode() {
  if (typeof window === "undefined") return DEFAULT_LANGUAGE_CODE;
  const value = localStorage.getItem("lenuk-typing-language");
  return value && isSupportedTypingLanguageCode(value) ? value : DEFAULT_LANGUAGE_CODE;
}

function getTypingMode() {
  if (typeof window === "undefined") return "text" as const;
  const value = localStorage.getItem("lenuk-typing-mode");
  return value && supportedModes.has(value as "text" | "code") ? (value as "text" | "code") : "text";
}

function getTypingDuration() {
  if (typeof window === "undefined") return 30 as DurationSeconds;
  const value = Number(localStorage.getItem("lenuk-typing-duration")) as DurationSeconds;
  return supportedDurations.has(value) ? value : 30;
}

function getTypingDifficulty() {
  if (typeof window === "undefined") return "easy";
  const value = localStorage.getItem("lenuk-typing-difficulty") ?? "easy";
  return supportedDifficulties.has(value) ? value : "easy";
}

function toGeneratorDifficulty(difficulty: string): "common" | "mixed" {
  return difficulty === "easy" ? "common" : "mixed";
}

function getTypingWordCount() {
  if (typeof window === "undefined") return 60;
  const value = Number(localStorage.getItem("lenuk-typing-word-count"));
  return supportedTextWordCounts.has(value) ? value : 60;
}

export default function HomePage() {
  const [mode, setMode] = useState<"text" | "code">("text");
  const [duration, setDuration] = useState<DurationSeconds>(30);
  const [difficulty, setDifficulty] = useState("easy");
  const [typingLanguageCode, setTypingLanguageCode] = useState<SupportedLanguageCode>(DEFAULT_LANGUAGE_CODE);
  const [textWordCount, setTextWordCount] = useState<number>(60);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [userName, setUserName] = useState("");
  const [userCountry, setUserCountry] = useState("");
  const [draftName, setDraftName] = useState("");
  const [draftCountry, setDraftCountry] = useState("");
  const [countryOptions, setCountryOptions] = useState<CountryOption[]>([]);
  const [showCelebration, setShowCelebration] = useState(false);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const submittedRef = useRef(false);
  const celebrationTimeoutRef = useRef<number | null>(null);

  const generatorDifficulty = useMemo(() => toGeneratorDifficulty(difficulty), [difficulty]);
  const { content: generatedTextContent, regenerate: regenerateTextContent } = useTestContent({
    languageCode: typingLanguageCode,
    mode: "words",
    wordCount: textWordCount,
    duration,
    seed: `lenuk-type:${typingLanguageCode}:${difficulty}:${duration}:${textWordCount}`,
    punctuation: false,
    numbers: false,
    allowRepeat: true,
    difficulty: generatorDifficulty
  });
  const currentText = useMemo(
    () => (mode === "text" ? generatedTextContent.text : CODE_SAMPLE_TEXT),
    [generatedTextContent.text, mode]
  );
  const promptId = useMemo(() => {
    if (mode === "text") {
      return `gen:${generatedTextContent.languageCode}:${generatedTextContent.seed}`;
    }

    return `code:${CODE_SAMPLE_TEXT.length}`;
  }, [generatedTextContent.languageCode, generatedTextContent.seed, mode]);
  const onboardingComplete = Boolean(userName && userCountry);
  const requiresOnboarding = !onboardingComplete;
  const showProfileDialog = requiresOnboarding || isProfileDialogOpen;
  const isDraftCountryValid = showProfileDialog ? isSupportedCountryCode(draftCountry) : true;
  const typingEnabled = onboardingComplete && !isProfileDialogOpen;
  const { snapshot, restart, capture } = useTypingEngine(currentText, duration, typingEnabled);
  const focusTypingInput = capture.focusInput;
  const blurTypingInput = capture.blurInput;

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
    setMode(getTypingMode());
    setDuration(getTypingDuration());
    setDifficulty(getTypingDifficulty());
    setTypingLanguageCode(getTypingLanguageCode());
    setTextWordCount(getTypingWordCount());
    if (!existingName || !existingCountry) {
      startTransition(() => {
        setCountryOptions(getCountryOptions());
      });
    }
  }, []);

  useEffect(() => {
    if (!snapshot.metrics.finished || submittedRef.current || !userName || !userCountry) return;

    submittedRef.current = true;
    setSaveStatus("saving");
    setShowCelebration(true);
    if (celebrationTimeoutRef.current) window.clearTimeout(celebrationTimeoutRef.current);
    celebrationTimeoutRef.current = window.setTimeout(() => setShowCelebration(false), 2400);

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
        elapsed: snapshot.metrics.elapsed,
        languageCode: mode === "text" ? generatedTextContent.languageCode : null,
        contentSeed: mode === "text" ? generatedTextContent.seed : null,
        tokenCount: mode === "text" ? generatedTextContent.tokens.length : null,
        requestedWordCount: mode === "text" ? textWordCount : null
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
  }, [difficulty, duration, generatedTextContent.languageCode, generatedTextContent.seed, generatedTextContent.tokens.length, mode, promptId, snapshot.metrics, textWordCount, userCountry, userName]);

  useEffect(() => {
    return () => {
      if (celebrationTimeoutRef.current) window.clearTimeout(celebrationTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!typingEnabled) return;
    const frameId = window.requestAnimationFrame(() => focusTypingInput());
    return () => window.cancelAnimationFrame(frameId);
  }, [focusTypingInput, typingEnabled]);

  useEffect(() => {
    if (!snapshot.metrics.finished) return;
    blurTypingInput();
  }, [blurTypingInput, snapshot.metrics.finished]);

  const focusTypingSoon = () => {
    if (!typingEnabled) return;
    window.requestAnimationFrame(() => focusTypingInput());
  };

  const resetRunUiState = () => {
    submittedRef.current = false;
    setSaveStatus("idle");
  };

  const handleRestart = (options?: {
    nextDuration?: DurationSeconds;
    targetMode?: "text" | "code";
    regenerateText?: boolean;
  }) => {
    const nextDuration = options?.nextDuration ?? duration;
    const targetMode = options?.targetMode ?? mode;
    const shouldRegenerateText = Boolean(options?.regenerateText && targetMode === "text");

    resetRunUiState();

    if (shouldRegenerateText) {
      regenerateTextContent();
    } else {
      restart(nextDuration);
    }

    focusTypingSoon();
  };

  const ensureCountryOptionsLoaded = () => {
    if (countryOptions.length > 0) return;
    startTransition(() => {
      setCountryOptions(getCountryOptions());
    });
  };

  const openProfileDialog = () => {
    setDraftName(userName);
    setDraftCountry(userCountry);
    ensureCountryOptionsLoaded();
    setIsProfileDialogOpen(true);
  };
  
  const saveProfile = () => {
    const nextName = draftName.trim();
    const nextCountry = draftCountry.trim().toUpperCase();
    if (!nextName || !isSupportedCountryCode(nextCountry)) return;
    localStorage.setItem("lenuk-user-name", nextName);
    localStorage.setItem("lenuk-user-country", nextCountry);
    getOrCreateUserId();
    setUserName(nextName);
    setUserCountry(nextCountry);
    setIsProfileDialogOpen(false);
  };

  return (
    <>
      {showCelebration && <CelebrationOverlay name={userName} />}

      {showProfileDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <Card className="w-full max-w-md">
            <CardContent className="space-y-4 p-6">
              <h2 className="text-xl font-semibold">{requiresOnboarding ? "Welcome to Lenuk Type" : "Edit Profile"}</h2>
              <p className="text-sm text-muted-foreground">
                {requiresOnboarding
                  ? "Enter your name and country once to start. Next visits will remember you."
                  : "Update your display name and country for future leaderboard entries."}
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
              <CountryPicker value={draftCountry} options={countryOptions} onChange={setDraftCountry} />
              <div className="flex gap-2">
                {!requiresOnboarding && (
                  <Button variant="ghost" className="w-full" onClick={() => setIsProfileDialogOpen(false)}>
                    Cancel
                  </Button>
                )}
                <Button
                  onClick={saveProfile}
                  className="w-full"
                  disabled={!draftName.trim() || !isDraftCountryValid || countryOptions.length === 0}
                >
                  {requiresOnboarding ? "Save profile and start" : "Save profile"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center justify-center px-4 py-8 md:py-10">
        <Card className="w-full border border-border/80 bg-card/80 shadow-2xl shadow-black/10 backdrop-blur">
          <CardContent className="space-y-6 p-5 md:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 rounded-full border bg-background/60 px-3 py-1.5 text-sm backdrop-blur">
                <User className="h-4 w-4 text-primary" />
                {userCountry && <CountryFlag code={userCountry} />}
                <span>{userName || "Guest"}</span>
              </div>
              {onboardingComplete && (
                <Button variant="ghost" size="sm" onClick={openProfileDialog}>
                  Edit profile
                </Button>
              )}

              <Tabs
                value={mode}
                onValueChange={(next) => {
                  const nextMode = next as "text" | "code";
                  localStorage.setItem("lenuk-typing-mode", nextMode);
                  setMode(nextMode);
                  handleRestart({ targetMode: nextMode, regenerateText: nextMode === "text" });
                }}
                options={[
                  { label: "Text", value: "text" },
                  { label: "Code", value: "code" }
                ]}
              />
              <div className="flex items-center gap-2">
                <Select
                  className="max-w-[180px]"
                  value={typingLanguageCode}
                  options={typingLanguageOptions}
                  disabled={mode !== "text"}
                  onChange={(event) => {
                    const nextLanguageCode = event.target.value;
                    if (!isSupportedTypingLanguageCode(nextLanguageCode)) return;
                    resetRunUiState();
                    localStorage.setItem("lenuk-typing-language", nextLanguageCode);
                    setTypingLanguageCode(nextLanguageCode);
                    focusTypingSoon();
                  }}
                />
                <Select
                  className="w-[84px]"
                  value={String(textWordCount)}
                  options={textWordCountOptions.map((option) => ({ label: option.label, value: option.value }))}
                  disabled={mode !== "text"}
                  onChange={(event) => {
                    const nextWordCount = Number(event.target.value);
                    if (!supportedTextWordCounts.has(nextWordCount)) return;
                    resetRunUiState();
                    localStorage.setItem("lenuk-typing-word-count", String(nextWordCount));
                    setTextWordCount(nextWordCount);
                    focusTypingSoon();
                  }}
                />
                <Select
                  value={difficulty}
                  options={difficultyOptions}
                  onChange={(event) => {
                    resetRunUiState();
                    localStorage.setItem("lenuk-typing-difficulty", event.target.value);
                    setDifficulty(event.target.value);
                    restart(duration);
                    focusTypingSoon();
                  }}
                />
                <Select
                  value={String(duration)}
                  options={durationOptions.map((d) => ({ label: d.label, value: String(d.value) }))}
                  onChange={(event) => {
                    const next = Number(event.target.value) as DurationSeconds;
                    resetRunUiState();
                    localStorage.setItem("lenuk-typing-duration", String(next));
                    setDuration(next);
                    restart(next);
                    focusTypingSoon();
                  }}
                />
                <Tooltip text="Restart">
                  <Button variant="ghost" onClick={() => handleRestart()}>
                    Restart
                  </Button>
                </Tooltip>
                <Link
                  href="/leaderboard"
                  className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Leaderboard
                </Link>
                <ThemeToggle />
              </div>
            </div>

            <Progress value={snapshot.metrics.progress} />

            <TypingPrompt
              text={snapshot.text}
              statuses={snapshot.statuses}
              index={snapshot.index}
              strokeVersion={snapshot.strokeVersion}
              mode={mode}
              capture={capture}
              enabled={typingEnabled}
              finished={snapshot.metrics.finished}
            />

            <div className="min-h-9">
              <div
                className={`flex flex-wrap items-center justify-end gap-2 transition-opacity ${
                  snapshot.metrics.finished ? "opacity-100" : "pointer-events-none opacity-0"
                }`}
              >
                <Tooltip text="Restart same content">
                  <Button variant="ghost" size="sm" onClick={() => handleRestart()}>
                    <RotateCcw className="mr-1 h-4 w-4" />
                    Restart
                  </Button>
                </Tooltip>
                {mode === "text" && (
                  <Tooltip text="Next content">
                    <Button variant="ghost" size="sm" onClick={() => handleRestart({ regenerateText: true })}>
                      <ArrowRight className="mr-1 h-4 w-4" />
                      Next
                    </Button>
                  </Tooltip>
                )}
              </div>
            </div>

            <TypingStats metrics={snapshot.metrics} />

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
        <p className="text-3xl font-bold">Amazing, {name}!</p>
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

