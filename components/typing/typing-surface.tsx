"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, BarChart3, Keyboard, Pencil, Play, RotateCcw, Shuffle, SlidersHorizontal, Trophy, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CountryFlag } from "@/components/ui/country-flag";
import { CountryPicker } from "@/components/ui/country-picker";
import { Tabs } from "@/components/ui/tabs";
import { Select } from "@/components/ui/select";
import { Tooltip } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { SiteCreditsFooter } from "@/components/ui/site-credits-footer";
import { TypingPrompt } from "@/components/typing/typing-prompt";
import { TypingStats } from "@/components/typing/typing-stats";
import { BeginnerGuide } from "@/components/typing/beginner-guide";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { DEFAULT_SEED, STORAGE_KEYS } from "@/lib/config";
import { getCountryOptions, isSupportedCountryCode, type CountryOption } from "@/lib/countries";
import { DurationSeconds, type EngineSnapshot } from "@/lib/engine/typing-engine";
import { recordRunCompleted, recordRunStarted } from "@/lib/user-stats";
import { useTypingEngine } from "@/hooks/use-typing-engine";
import { listLanguages, type SupportedLanguageCode } from "@/src/content/languages";
import { useTestContent } from "@/src/content/use-test-content";

const CelebrationOverlay = dynamic(() => import("./celebration-overlay").then((mod) => mod.CelebrationOverlay), {
  ssr: false
});

const LazySplashScreen = dynamic(() => import("../ui/lenuk-splash-screen").then((mod) => mod.LenukSplashScreen), {
  ssr: false,
  loading: () => null
});

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
type DifficultyLevel = (typeof difficultyOptions)[number]["value"];

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
const supportedDifficulties = new Set<DifficultyLevel>(difficultyOptions.map((option) => option.value));
const supportedTextWordCounts = new Set<number>(textWordCountOptions.map((option) => Number(option.value)));
const DEFAULT_TYPING_LANGUAGE_CODE: SupportedLanguageCode = "tet-TL";
const DEFAULT_TYPING_WORD_COUNT = 25;

interface ReplayFrame {
  atMs: number;
  index: number;
  statuses: Int8Array;
}

interface ReplayRun {
  text: string;
  frames: ReplayFrame[];
}

interface ReplayViewState {
  index: number;
  statuses: Int8Array;
  strokeVersion: number;
}

interface DifficultyContentSettings {
  generatorDifficulty: "common" | "mixed";
  punctuation: boolean;
  numbers: boolean;
  punctuationRate?: number;
  numbersRate?: number;
}

function isDifficultyLevel(value: string): value is DifficultyLevel {
  return supportedDifficulties.has(value as DifficultyLevel);
}

function createReplaySignature(snapshot: EngineSnapshot) {
  return [
    snapshot.strokeVersion,
    snapshot.index,
    snapshot.metrics.typedChars,
    snapshot.metrics.correctChars,
    snapshot.metrics.errors,
    snapshot.text.length
  ].join(":");
}

function createReplayFrame(snapshot: EngineSnapshot): ReplayFrame {
  return {
    atMs: Math.max(0, Math.round(snapshot.metrics.elapsed * 1000)),
    index: snapshot.index,
    statuses: snapshot.statuses.slice()
  };
}

function getOrCreateUserId() {
  if (typeof window === "undefined") return "anonymous";
  const key = STORAGE_KEYS.userId;
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const created = crypto.randomUUID();
  localStorage.setItem(key, created);
  return created;
}

function getUserName() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(STORAGE_KEYS.userName) ?? "";
}

function getUserCountry() {
  if (typeof window === "undefined") return "";
  return (localStorage.getItem(STORAGE_KEYS.userCountry) ?? "").toUpperCase();
}

function isSupportedTypingLanguageCode(value: string): value is SupportedLanguageCode {
  return supportedTypingLanguageCodes.has(value as SupportedLanguageCode);
}

function getTypingLanguageCode() {
  if (typeof window === "undefined") return DEFAULT_TYPING_LANGUAGE_CODE;
  const value = localStorage.getItem(STORAGE_KEYS.typingLanguage);
  return value && isSupportedTypingLanguageCode(value) ? value : DEFAULT_TYPING_LANGUAGE_CODE;
}

function getTypingMode() {
  if (typeof window === "undefined") return "text" as const;
  const value = localStorage.getItem(STORAGE_KEYS.typingMode);
  return value && supportedModes.has(value as "text" | "code") ? (value as "text" | "code") : "text";
}

function getTypingDuration() {
  if (typeof window === "undefined") return 30 as DurationSeconds;
  const value = Number(localStorage.getItem(STORAGE_KEYS.typingDuration)) as DurationSeconds;
  return supportedDurations.has(value) ? value : 30;
}

function getTypingDifficulty(): DifficultyLevel {
  if (typeof window === "undefined") return "easy";
  const value = localStorage.getItem(STORAGE_KEYS.typingDifficulty) ?? "easy";
  return isDifficultyLevel(value) ? value : "easy";
}

function toGeneratorDifficulty(difficulty: DifficultyLevel): "common" | "mixed" {
  return difficulty === "easy" ? "common" : "mixed";
}

function getDifficultyContentSettings(difficulty: DifficultyLevel): DifficultyContentSettings {
  if (difficulty === "medium") {
    return {
      generatorDifficulty: "mixed",
      punctuation: false,
      numbers: true,
      numbersRate: 1
    };
  }

  if (difficulty === "hard") {
    return {
      generatorDifficulty: "mixed",
      punctuation: true,
      numbers: true,
      punctuationRate: 1,
      numbersRate: 1
    };
  }

  return {
    generatorDifficulty: toGeneratorDifficulty(difficulty),
    punctuation: false,
    numbers: false
  };
}

function getTypingWordCount() {
  if (typeof window === "undefined") return DEFAULT_TYPING_WORD_COUNT;
  const value = Number(localStorage.getItem(STORAGE_KEYS.typingWordCount));
  return supportedTextWordCounts.has(value) ? value : DEFAULT_TYPING_WORD_COUNT;
}

function getOrCreateContentSeed() {
  if (typeof window === "undefined") return DEFAULT_SEED;
  const existing = localStorage.getItem(STORAGE_KEYS.contentSeed);
  if (existing) return existing;
  const fresh = `lenuk-${crypto.randomUUID()}`;
  localStorage.setItem(STORAGE_KEYS.contentSeed, fresh);
  localStorage.setItem(STORAGE_KEYS.firstVisitAt, new Date().toISOString());
  return fresh;
}

export default function TypingSurface() {
  const [mode, setMode] = useState<"text" | "code">("text");
  const [duration, setDuration] = useState<DurationSeconds>(30);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>("easy");
  const [baseContentSeed, setBaseContentSeed] = useState(DEFAULT_SEED);
  const [typingLanguageCode, setTypingLanguageCode] = useState<SupportedLanguageCode>(DEFAULT_TYPING_LANGUAGE_CODE);
  const [textWordCount, setTextWordCount] = useState<number>(DEFAULT_TYPING_WORD_COUNT);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [userName, setUserName] = useState("");
  const [userCountry, setUserCountry] = useState("");
  const [draftName, setDraftName] = useState("");
  const [draftCountry, setDraftCountry] = useState("");
  const [countryOptions, setCountryOptions] = useState<CountryOption[]>([]);
  const [showCelebration, setShowCelebration] = useState(false);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [isSplashVisible, setIsSplashVisible] = useState(true);
  const [shouldRenderSplash, setShouldRenderSplash] = useState(true);
  const [isFrontendBootReady, setIsFrontendBootReady] = useState(false);
  const [completedReplayRun, setCompletedReplayRun] = useState<ReplayRun | null>(null);
  const [replayView, setReplayView] = useState<ReplayViewState | null>(null);
  const submittedRef = useRef(false);
  const runStartedRef = useRef(false);
  const celebrationTimeoutRef = useRef<number | null>(null);
  const replayCaptureRef = useRef<{
    text: string;
    frames: ReplayFrame[];
    lastSignature: string | null;
  }>({
    text: "",
    frames: [],
    lastSignature: null
  });
  const replayTimeoutsRef = useRef<number[]>([]);
  const profileNameInputRef = useRef<HTMLInputElement>(null);
  const shouldRestoreTypingFocusRef = useRef(false);

  useEffect(() => {
    setBaseContentSeed(getOrCreateContentSeed());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = localStorage.getItem(STORAGE_KEYS.splashSeen) === "1";
    if (seen) {
      setShouldRenderSplash(false);
      setIsSplashVisible(false);
    }
  }, []);

  const difficultyContentSettings = useMemo(() => getDifficultyContentSettings(difficulty), [difficulty]);
  const { content: generatedTextContent, regenerate: regenerateTextContent } = useTestContent({
    languageCode: typingLanguageCode,
    mode: "words",
    wordCount: textWordCount,
    duration,
    seed: `${baseContentSeed}:${typingLanguageCode}:${difficulty}:${duration}:${textWordCount}`,
    punctuation: difficultyContentSettings.punctuation,
    numbers: difficultyContentSettings.numbers,
    punctuationRate: difficultyContentSettings.punctuationRate,
    numbersRate: difficultyContentSettings.numbersRate,
    allowRepeat: true,
    difficulty: difficultyContentSettings.generatorDifficulty
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
  const typingEnabled = onboardingComplete && !isProfileDialogOpen && !isSplashVisible;
  const { snapshot, restart, capture } = useTypingEngine(currentText, duration, typingEnabled);
  const isRunFinished = snapshot.metrics.finished;
  const focusTypingInput = capture.focusInput;
  const blurTypingInput = capture.blurInput;
  const isReplaying = replayView !== null;
  const promptIndex = replayView?.index ?? snapshot.index;
  const promptStatuses = replayView?.statuses ?? snapshot.statuses;
  const promptStrokeVersion = replayView?.strokeVersion ?? snapshot.strokeVersion;
  const promptProgress = snapshot.text.length === 0 ? 0 : (promptIndex / snapshot.text.length) * 100;
  const canReplayFinishedRun =
    isRunFinished &&
    Boolean(completedReplayRun && completedReplayRun.text === snapshot.text && completedReplayRun.frames.length > 0);

  useEffect(() => {
    let raf1 = 0;
    let raf2 = 0;
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

    // Mark the page as ready only after the initial client state bootstraps and a paint occurs.
    raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => setIsFrontendBootReady(true));
    });

    return () => {
      window.cancelAnimationFrame(raf1);
      window.cancelAnimationFrame(raf2);
    };
  }, []);

  useEffect(() => {
    if (!typingEnabled) return;
    if (!snapshot.metrics.started || runStartedRef.current) return;
    if (!userName || !userCountry) return;
    runStartedRef.current = true;
    recordRunStarted({ name: userName, country: userCountry });
  }, [snapshot.metrics.started, typingEnabled, userCountry, userName]);

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

    recordRunCompleted({
      userName,
      country: userCountry,
      durationSeconds: duration,
      difficulty,
      mode,
      wpm: snapshot.metrics.wpm,
      rawWpm: snapshot.metrics.rawWpm,
      accuracy: snapshot.metrics.accuracy,
      errors: snapshot.metrics.errors,
      promptId,
      wordCount: mode === "text" ? textWordCount : null,
      languageCode: mode === "text" ? generatedTextContent.languageCode : null,
      elapsedSeconds: snapshot.metrics.elapsed,
      typedChars: snapshot.metrics.typedChars,
      correctChars: snapshot.metrics.correctChars
    });

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
    if (!typingEnabled || showProfileDialog || !shouldRestoreTypingFocusRef.current) return;

    shouldRestoreTypingFocusRef.current = false;
    const frameId = window.requestAnimationFrame(() => focusTypingInput());
    return () => window.cancelAnimationFrame(frameId);
  }, [focusTypingInput, showProfileDialog, typingEnabled]);

  useEffect(() => {
    if (!showProfileDialog) return;

    blurTypingInput();

    if (isSplashVisible) return;

    const frameId = window.requestAnimationFrame(() => {
      profileNameInputRef.current?.focus({ preventScroll: true });
      profileNameInputRef.current?.select();
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [blurTypingInput, isSplashVisible, showProfileDialog]);

  useEffect(() => {
    if (!typingEnabled || isRunFinished || isReplaying || capture.isFocused) return;

    const handleWindowKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.closest("[role='dialog']") ||
          ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(target.tagName))
      ) {
        return;
      }

      if (event.key === "Tab") return;

      focusTypingInput();
      const handled = capture.handleExternalKeyDown(event);
      if (handled) return;
      event.preventDefault();
    };

    window.addEventListener("keydown", handleWindowKeyDown);
    return () => window.removeEventListener("keydown", handleWindowKeyDown);
  }, [capture.handleExternalKeyDown, capture.isFocused, focusTypingInput, isReplaying, isRunFinished, typingEnabled]);

  useEffect(() => {
    if (!snapshot.metrics.finished) return;
    blurTypingInput();
  }, [blurTypingInput, snapshot.metrics.finished]);

  useEffect(() => {
    const tracker = replayCaptureRef.current;

    if (tracker.text !== snapshot.text) {
      tracker.text = snapshot.text;
      tracker.frames = [];
      tracker.lastSignature = null;
    }

    const signature = createReplaySignature(snapshot);

    if (!snapshot.metrics.started) {
      tracker.frames = [{ atMs: 0, index: snapshot.index, statuses: snapshot.statuses.slice() }];
      tracker.lastSignature = signature;
      return;
    }

    if (tracker.lastSignature === signature) return;

    tracker.frames.push(createReplayFrame(snapshot));
    tracker.lastSignature = signature;
  }, [snapshot]);

  useEffect(() => {
    if (!snapshot.metrics.finished) return;

    const tracker = replayCaptureRef.current;
    const finalSignature = createReplaySignature(snapshot);
    const finalFrame = createReplayFrame(snapshot);
    const lastFrame = tracker.frames[tracker.frames.length - 1];

    if (tracker.lastSignature !== finalSignature) {
      tracker.frames.push(finalFrame);
      tracker.lastSignature = finalSignature;
    } else if (!lastFrame || finalFrame.atMs > lastFrame.atMs) {
      tracker.frames.push(finalFrame);
    }

    setCompletedReplayRun({
      text: snapshot.text,
      frames: tracker.frames.map((frame) => ({ ...frame }))
    });
  }, [snapshot]);

  useEffect(() => {
    return () => {
      for (const timeoutId of replayTimeoutsRef.current) {
        window.clearTimeout(timeoutId);
      }
      replayTimeoutsRef.current = [];
    };
  }, []);

  const focusTypingSoon = () => {
    if (!typingEnabled) return;
    window.requestAnimationFrame(() => focusTypingInput());
  };

  const clearReplayTimeouts = () => {
    for (const timeoutId of replayTimeoutsRef.current) {
      window.clearTimeout(timeoutId);
    }
    replayTimeoutsRef.current = [];
  };

  const resetReplayCaptureTracker = () => {
    replayCaptureRef.current = {
      text: "",
      frames: [],
      lastSignature: null
    };
  };

  const resetRunUiState = () => {
    clearReplayTimeouts();
    resetReplayCaptureTracker();
    setReplayView(null);
    setCompletedReplayRun(null);
    submittedRef.current = false;
    runStartedRef.current = false;
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

  const shufflePrompt = () => {
    if (mode !== "text") return;
    resetRunUiState();
    regenerateTextContent(`shuffle:${crypto.randomUUID()}`);
    focusTypingSoon();
  };

  const handleReplay = () => {
    if (!completedReplayRun || completedReplayRun.text !== snapshot.text || completedReplayRun.frames.length === 0) return;

    clearReplayTimeouts();
    blurTypingInput();

    const frames = completedReplayRun.frames;
    setReplayView({
      index: frames[0].index,
      statuses: frames[0].statuses,
      strokeVersion: 1
    });

    for (let frameIndex = 1; frameIndex < frames.length; frameIndex += 1) {
      const frame = frames[frameIndex];
      const timeoutId = window.setTimeout(() => {
        setReplayView({
          index: frame.index,
          statuses: frame.statuses,
          strokeVersion: frameIndex + 1
        });
      }, frame.atMs);
      replayTimeoutsRef.current.push(timeoutId);
    }

    const endTimeoutId = window.setTimeout(() => {
      clearReplayTimeouts();
      setReplayView(null);
    }, (frames[frames.length - 1]?.atMs ?? 0) + 150);
    replayTimeoutsRef.current.push(endTimeoutId);
  };

  const ensureCountryOptionsLoaded = () => {
    if (countryOptions.length > 0) return;
    startTransition(() => {
      setCountryOptions(getCountryOptions());
    });
  };

  const openProfileDialog = () => {
    blurTypingInput();
    shouldRestoreTypingFocusRef.current = false;
    setDraftName(userName);
    setDraftCountry(userCountry);
    ensureCountryOptionsLoaded();
    setIsProfileDialogOpen(true);
  };

  const closeProfileDialog = () => {
    shouldRestoreTypingFocusRef.current = true;
    setIsProfileDialogOpen(false);
  };
  
  const saveProfile = () => {
    const nextName = draftName.trim();
    const nextCountry = draftCountry.trim().toUpperCase();
    if (!nextName || !isSupportedCountryCode(nextCountry)) return;
    localStorage.setItem(STORAGE_KEYS.userName, nextName);
    localStorage.setItem(STORAGE_KEYS.userCountry, nextCountry);
    getOrCreateUserId();
    setUserName(nextName);
    setUserCountry(nextCountry);
    closeProfileDialog();
  };

  return (
    <>
      {shouldRenderSplash ? <LazySplashScreen ready={isFrontendBootReady} onVisibilityChange={setIsSplashVisible} /> : null}
      {showCelebration && <CelebrationOverlay name={userName} />}

      {showProfileDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <Card
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-dialog-title"
            aria-describedby="profile-dialog-description"
            className="w-full max-w-md"
          >
            <CardContent className="space-y-4 p-6">
              <h2 id="profile-dialog-title" className="text-xl font-semibold">
                {requiresOnboarding ? "Welcome to Lenuk Type" : "Edit Profile"}
              </h2>
              <p id="profile-dialog-description" className="text-sm text-muted-foreground">
                {requiresOnboarding
                  ? "Enter your name and country once to start. Next visits will remember you."
                  : "Update your display name and country for future leaderboard entries."}
              </p>
              <input
                ref={profileNameInputRef}
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
                  <Button variant="ghost" className="w-full" onClick={closeProfileDialog}>
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

      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center justify-start px-4 py-5 md:py-6">
        <Card className="w-full border-0 bg-transparent shadow-none">
          <CardContent className="space-y-3 p-0">
            <section className="rounded-xl border border-border/60 bg-background/20 p-2.5 shadow-sm backdrop-blur">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <div className="inline-flex items-center gap-2 rounded-full border bg-background/60 px-3 py-1 text-sm font-semibold">
                    <span className="inline-flex h-2 w-2 rounded-full bg-primary" />
                    Lenuk Type
                  </div>
                  <span className="hidden rounded-full border bg-background/50 px-2.5 py-1 text-[11px] text-muted-foreground md:inline-flex">
                    English + Tetun typing practice
                  </span>
                  <span className="hidden rounded-full border bg-background/50 px-2.5 py-1 text-[11px] text-muted-foreground lg:inline-flex">
                    Click prompt or start typing
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2">
                  {onboardingComplete && (
                    <Tooltip text="Edit profile">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 rounded-full border bg-background/50 p-0"
                        onClick={openProfileDialog}
                        aria-label="Edit profile"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </Tooltip>
                  )}
                  <div className="flex items-center gap-2 rounded-full border bg-background/60 px-2.5 py-1 text-xs backdrop-blur">
                    <User className="h-3.5 w-3.5 text-primary" />
                    {userCountry && <CountryFlag code={userCountry} />}
                    <span>{userName || "Guest"}</span>
                  </div>
                  <span className="inline-flex items-center rounded-full border bg-background/50 px-2 py-1 text-[11px] text-muted-foreground">
                    {mode === "text" ? "Text" : "Code"}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border bg-background/50 px-2 py-1 text-[11px] text-muted-foreground">
                    <span
                      aria-hidden
                      className={`inline-flex h-1.5 w-1.5 rounded-full ${
                        isRunFinished ? "bg-primary" : typingEnabled ? "bg-emerald-500 motion-safe:animate-pulse" : "bg-muted-foreground"
                      }`}
                    />
                    {!onboardingComplete
                      ? "Complete profile"
                      : isSplashVisible
                        ? "Preparing..."
                        : isRunFinished
                          ? "Finished"
                          : "Ready"}
                  </span>
                  {onboardingComplete && mode === "text" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 rounded-full border bg-background/50 px-2.5 text-[11px]"
                      onClick={shufflePrompt}
                      disabled={!typingEnabled || isRunFinished}
                    >
                      <Shuffle className="mr-1 h-3.5 w-3.5" />
                      New prompt
                    </Button>
                  )}
                  {onboardingComplete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 rounded-full border bg-background/50 px-2.5 text-[11px]"
                      onClick={focusTypingSoon}
                      disabled={!typingEnabled || isRunFinished}
                    >
                      <Keyboard className="mr-1 h-3.5 w-3.5" />
                      Focus
                    </Button>
                  )}
                </div>
              </div>
            </section>

            <section className="space-y-2 rounded-xl border border-border/60 bg-background/15 p-2.5 shadow-sm backdrop-blur" aria-label="Typing controls">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="inline-flex items-center gap-2 rounded-full border bg-background/50 px-2.5 py-1 text-[11px] text-muted-foreground">
                  <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
                  Test controls
                </div>
                <p className="hidden text-[11px] text-muted-foreground md:block">
                  Set your test, then click the prompt or start typing. `Esc` restarts.
                </p>
              </div>

              <div className="grid gap-2 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center">
                <div className="flex flex-wrap items-center gap-2">
                  <Tabs
                    ariaLabel="Typing mode"
                    value={mode}
                    onValueChange={(next) => {
                      const nextMode = next as "text" | "code";
                      localStorage.setItem(STORAGE_KEYS.typingMode, nextMode);
                      setMode(nextMode);
                      handleRestart({ targetMode: nextMode, regenerateText: nextMode === "text" });
                    }}
                    options={[
                      { label: "Text", value: "text" },
                      { label: "Code", value: "code" }
                    ]}
                  />
                </div>

                <div className="relative min-w-0 overflow-hidden rounded-xl border border-border/70 bg-[linear-gradient(to_bottom,hsl(var(--background)/0.50),hsl(var(--background)/0.28))] p-2 shadow-sm shadow-black/[0.04] ring-1 ring-white/10 backdrop-blur dark:ring-white/5">
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_12%,hsl(var(--primary)/0.10),transparent_34%),radial-gradient(circle_at_92%_14%,hsl(var(--primary)/0.06),transparent_26%)]"
                  />
                  <div
                    className="no-scrollbar relative flex flex-nowrap items-center gap-2 overflow-x-auto overflow-y-hidden"
                    tabIndex={0}
                    aria-label="Typing option controls"
                  >
                    <Select
                      className="shrink-0 max-w-[170px]"
                      value={typingLanguageCode}
                      aria-label="Typing language"
                      options={typingLanguageOptions}
                      disabled={mode !== "text"}
                      onChange={(event) => {
                        const nextLanguageCode = event.target.value;
                        if (!isSupportedTypingLanguageCode(nextLanguageCode)) return;
                        resetRunUiState();
                        localStorage.setItem(STORAGE_KEYS.typingLanguage, nextLanguageCode);
                        setTypingLanguageCode(nextLanguageCode);
                        focusTypingSoon();
                      }}
                    />
                    <Select
                      className="shrink-0 w-[88px]"
                      value={String(textWordCount)}
                      aria-label="Word count"
                      options={textWordCountOptions.map((option) => ({ label: option.label, value: option.value }))}
                      disabled={mode !== "text"}
                      onChange={(event) => {
                        const nextWordCount = Number(event.target.value);
                        if (!supportedTextWordCounts.has(nextWordCount)) return;
                        resetRunUiState();
                        localStorage.setItem(STORAGE_KEYS.typingWordCount, String(nextWordCount));
                        setTextWordCount(nextWordCount);
                        focusTypingSoon();
                      }}
                    />
                    <Select
                      className="shrink-0"
                      value={difficulty}
                      aria-label="Difficulty"
                      options={difficultyOptions}
                      onChange={(event) => {
                        if (!isDifficultyLevel(event.target.value)) return;
                        resetRunUiState();
                        localStorage.setItem(STORAGE_KEYS.typingDifficulty, event.target.value);
                        setDifficulty(event.target.value);
                        restart(duration);
                        focusTypingSoon();
                      }}
                    />
                    <Select
                      className="shrink-0"
                      value={String(duration)}
                      aria-label="Duration"
                      options={durationOptions.map((d) => ({ label: d.label, value: String(d.value) }))}
                      onChange={(event) => {
                        const next = Number(event.target.value) as DurationSeconds;
                        resetRunUiState();
                        localStorage.setItem(STORAGE_KEYS.typingDuration, String(next));
                        setDuration(next);
                        restart(next);
                        focusTypingSoon();
                      }}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                  <Tooltip text="Restart">
                    <Button variant="ghost" onClick={() => handleRestart()}>
                      <RotateCcw className="mr-1 h-4 w-4" />
                      Restart
                    </Button>
                  </Tooltip>
                  <Tooltip text={mode === "text" ? "Next content" : "Start next run"}>
                    <Button variant="ghost" onClick={() => handleRestart({ regenerateText: mode === "text" })}>
                      <ArrowRight className="mr-1 h-4 w-4" />
                      Next
                    </Button>
                  </Tooltip>
                  <Link
                    href="/stats"
                    className="inline-flex h-9 items-center gap-2 rounded-md border border-border/70 bg-background/70 px-3 text-sm font-semibold transition hover:border-primary/40 hover:text-primary"
                    aria-label="Open user stats"
                  >
                    <BarChart3 className="h-4 w-4" />
                    User stats
                  </Link>
                  <Link
                    href="/leaderboard"
                    className="leaderboard-live-button group relative inline-flex h-9 items-center justify-center gap-2 overflow-hidden rounded-md border border-primary/20 bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 transition-all duration-200 hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-safe:animate-[leaderboard-button-pulse_2.8s_cubic-bezier(0.22,1,0.36,1)_infinite]"
                    aria-label="Open leaderboard"
                  >
                    <span aria-hidden className="leaderboard-live-aura absolute inset-0 rounded-md" />
                    <span
                      aria-hidden
                      className="absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100 bg-[radial-gradient(circle_at_20%_15%,rgba(255,255,255,0.22),transparent_42%)]"
                    />
                    <span
                      aria-hidden
                      className="absolute inset-y-0 left-[-40%] w-10 rotate-12 bg-white/20 blur-sm transition-transform duration-700 group-hover:translate-x-[290%] motion-safe:animate-[leaderboard-sheen_3.4s_ease-in-out_infinite]"
                    />
                    <span aria-hidden className="leaderboard-live-orb relative h-2 w-2 rounded-full bg-white/95" />
                    <Trophy className="relative h-4 w-4 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110" />
                    <span className="relative">Leaderboard</span>
                    <span className="leaderboard-live-badge relative hidden items-center rounded-full border border-white/20 bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] sm:inline-flex">
                      Live
                    </span>
                  </Link>
                  <ThemeToggle />
                </div>
              </div>
            </section>

            <div
              className={`space-y-6 transition-[filter,opacity] duration-300 ${
                isRunFinished && !isReplaying ? "pointer-events-none select-none blur-[3px] opacity-50 saturate-50" : ""
              }`}
              aria-hidden={isRunFinished && !isReplaying ? true : undefined}
            >
              <Progress value={promptProgress} className="h-2.5 bg-muted/70" />

              <TypingPrompt
                text={snapshot.text}
                statuses={promptStatuses}
                index={promptIndex}
                strokeVersion={promptStrokeVersion}
                mode={mode}
                capture={capture}
                enabled={typingEnabled && !isReplaying}
                finished={isRunFinished}
              />

              <BeginnerGuide
                typingLanguageCode={typingLanguageCode}
                mode={mode}
                onFocusPrompt={focusTypingSoon}
                canFocusPrompt={typingEnabled && !isRunFinished}
              />
            </div>

            <div className="min-h-[3.75rem] flex items-center justify-center">
              <div
                className={`relative flex flex-wrap items-center justify-center gap-2 rounded-2xl border px-2 py-1.5 transition-all duration-300 ${
                  isRunFinished
                    ? "border-primary/20 bg-card/90 opacity-100 shadow-xl shadow-primary/10 ring-1 ring-primary/20 backdrop-blur"
                    : "pointer-events-none scale-95 border-transparent opacity-0"
                }`}
              >
                <div
                  aria-hidden
                  className={`pointer-events-none absolute inset-0 -z-10 rounded-2xl bg-[radial-gradient(circle_at_center,hsl(var(--primary)/0.14),transparent_70%)] transition-opacity duration-300 ${
                    isRunFinished ? "opacity-100" : "opacity-0"
                  }`}
                />
                <Tooltip text="Replay your typing">
                  <Button variant="ghost" size="sm" onClick={handleReplay} disabled={!canReplayFinishedRun}>
                    <Play className="mr-1 h-4 w-4" />
                    {isReplaying ? "Replaying..." : "Replay"}
                  </Button>
                </Tooltip>
                <Tooltip text="Restart same content">
                  <Button variant="ghost" size="sm" onClick={() => handleRestart()}>
                    <RotateCcw className="mr-1 h-4 w-4" />
                    Restart
                  </Button>
                </Tooltip>
                <Tooltip text={mode === "text" ? "Next content" : "Start next run"}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRestart({ regenerateText: mode === "text" })}
                  >
                    <ArrowRight className="mr-1 h-4 w-4" />
                    Next
                  </Button>
                </Tooltip>
              </div>
            </div>

            <div
              className={`space-y-4 transition-[filter,opacity] duration-300 ${
                isRunFinished ? "pointer-events-none select-none blur-[2px] opacity-60" : ""
              }`}
            >
              <TypingStats metrics={snapshot.metrics} />

              <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
                Save status: {saveStatus === "idle" ? "waiting for completed run" : saveStatus}
              </p>
            </div>
          </CardContent>
        </Card>
        <SiteCreditsFooter className="mt-3" />
      </main>
    </>
  );
}


