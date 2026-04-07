"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowRight, BarChart3, Keyboard, Pencil, Play, RotateCcw, Shuffle, Trophy, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CountryFlag } from "@/components/ui/country-flag";
import { CountryPicker } from "@/components/ui/country-picker";
import { Select } from "@/components/ui/select";
import { Tooltip } from "@/components/ui/tooltip";
import { SiteCreditsFooter } from "@/components/ui/site-credits-footer";
import { TypingPrompt } from "@/components/typing/typing-prompt";
import { TypingStats } from "@/components/typing/typing-stats";
import { BeginnerGuide } from "@/components/typing/beginner-guide";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { DEFAULT_SEED, STORAGE_KEYS } from "@/lib/config";
import { getCountryOptions, isSupportedCountryCode, type CountryOption } from "@/lib/countries";
import { DurationSeconds, type EngineMetrics, type EngineSnapshot } from "@/lib/engine/typing-engine";
import { readUserStats, recordRunCompleted, recordRunStarted, type KeystrokeEntry } from "@/lib/user-stats";
import { useTypingEngine } from "@/hooks/use-typing-engine";
import { useSwipeToRestart } from "@/hooks/use-swipe-to-restart";
import { listLanguages, type SupportedLanguageCode } from "@/src/content/languages";
import { useTestContent } from "@/src/content/use-test-content";
import { LanguageSwitcher } from "@/components/ui/language-switcher";

const CelebrationOverlay = dynamic(() => import("./celebration-overlay").then((mod) => mod.CelebrationOverlay), {
  ssr: false
});

const LazySplashScreen = dynamic(() => import("../ui/lenuk-splash-screen").then((mod) => mod.LenukSplashScreen), {
  ssr: false,
  loading: () => null
});

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
  const { t } = useTranslation();
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
  const swipeArenaRef = useRef<HTMLDivElement>(null);
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
  // Always holds the latest snapshot metrics without being a reactive dependency.
  // Initialized to null; assigned on every render after snapshot is available (see below).
  const latestMetricsRef = useRef<EngineMetrics | null>(null);

  // Ghost replay cursor — loaded from the PB run for the current duration.
  const [ghostLog, setGhostLog] = useState<KeystrokeEntry[] | null>(null);
  const [ghostWpm, setGhostWpm] = useState<number | null>(null);

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
  const currentText = generatedTextContent.text;
  const promptId = useMemo(
    () => `gen:${generatedTextContent.languageCode}:${generatedTextContent.seed}`,
    [generatedTextContent.languageCode, generatedTextContent.seed]
  );
  const onboardingComplete = Boolean(userName && userCountry);
  const requiresOnboarding = !onboardingComplete;
  const showProfileDialog = requiresOnboarding || isProfileDialogOpen;
  const isDraftCountryValid = showProfileDialog ? isSupportedCountryCode(draftCountry) : true;
  const typingEnabled = onboardingComplete && !isProfileDialogOpen && !isSplashVisible;
  const { snapshot, restart, capture, getInputLog } = useTypingEngine(currentText, duration, typingEnabled);
  // Stable ref so the save effect can read the log without it being a reactive dep.
  const getInputLogRef = useRef(getInputLog);
  getInputLogRef.current = getInputLog;
  const isRunFinished = snapshot.metrics.finished;
  // Keep ref in sync with the latest metrics on every render so effects can read
  // the final values without listing snapshot.metrics as a reactive dependency.
  latestMetricsRef.current = snapshot.metrics;
  const focusTypingInput = capture.focusInput;
  const blurTypingInput = capture.blurInput;
  const handleExternalKeyDown = capture.handleExternalKeyDown;
  const isCaptureFocused = capture.isFocused;
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
    if (!isRunFinished || submittedRef.current || !userName || !userCountry) return;

    submittedRef.current = true;
    setSaveStatus("saving");
    setShowCelebration(true);
    if (celebrationTimeoutRef.current) window.clearTimeout(celebrationTimeoutRef.current);
    celebrationTimeoutRef.current = window.setTimeout(() => setShowCelebration(false), 2400);

    // Capture all metric values now (engine has stopped; latestMetricsRef holds the final state).
    // The ref is always assigned during render before this effect fires, so null only on first mount.
    if (!latestMetricsRef.current) return;
    const metrics = latestMetricsRef.current;
    const capturedUserId = getOrCreateUserId();

    const apiPayload = {
      userId: capturedUserId,
      player: userName,
      country: userCountry,
      mode: "text" as const,
      difficulty,
      durationSeconds: duration,
      wpm: metrics.wpm,
      rawWpm: metrics.rawWpm,
      accuracy: metrics.accuracy,
      errors: metrics.errors,
      promptId,
      metadata: {
        correctChars: metrics.correctChars,
        typedChars: metrics.typedChars,
        elapsed: metrics.elapsed,
        languageCode: generatedTextContent.languageCode,
        contentSeed: generatedTextContent.seed,
        tokenCount: generatedTextContent.tokens.length,
        requestedWordCount: textWordCount
      }
    };

    const localPayload = {
      userName,
      country: userCountry,
      durationSeconds: duration,
      difficulty,
      mode: "text" as const,
      wpm: metrics.wpm,
      rawWpm: metrics.rawWpm,
      accuracy: metrics.accuracy,
      errors: metrics.errors,
      promptId,
      wordCount: textWordCount,
      languageCode: generatedTextContent.languageCode,
      elapsedSeconds: metrics.elapsed,
      typedChars: metrics.typedChars,
      correctChars: metrics.correctChars,
      bestStreak: metrics.bestStreak
    };

    // Build a compact keystroke log for the heatmap. Timestamps are stored
    // relative to the first keystroke so they are portable and compact.
    const rawLog = getInputLogRef.current();
    const firstTs = rawLog.length > 0 ? rawLog[0].timestampMs : 0;
    const keystrokeLog = rawLog.map((e) => ({
      t: Math.round(e.timestampMs - firstTs),
      c: e.correct,
      i: e.charIndex,
    }));

    // Defer the synchronous localStorage write and network request to the next
    // macrotask so the celebration UI renders before the main thread is blocked.
    const saveTimerId = window.setTimeout(() => {
      recordRunCompleted({ ...localPayload, keystrokeLog, promptText: currentText });
      fetch("/api/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(apiPayload)
      })
        .then((response) => {
          if (!response.ok) throw new Error("Failed to save result");
          setSaveStatus("saved");
        })
        .catch(() => setSaveStatus("error"));
    }, 0);

    return () => window.clearTimeout(saveTimerId);
  }, [difficulty, duration, generatedTextContent.languageCode, generatedTextContent.seed, generatedTextContent.tokens.length, isRunFinished, promptId, textWordCount, userCountry, userName]);

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
    if (!typingEnabled || isRunFinished || isReplaying || isCaptureFocused) return;

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
      const handled = handleExternalKeyDown(event);
      if (handled) return;
      event.preventDefault();
    };

    window.addEventListener("keydown", handleWindowKeyDown);
    return () => window.removeEventListener("keydown", handleWindowKeyDown);
  }, [focusTypingInput, handleExternalKeyDown, isCaptureFocused, isReplaying, isRunFinished, typingEnabled]);

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

  // Load / refresh ghost log whenever duration changes.
  useEffect(() => {
    const stats = readUserStats();
    const pb = stats?.bestByDuration[duration] ?? null;
    if (pb?.keystrokeLog && pb.keystrokeLog.length > 0) {
      setGhostLog(pb.keystrokeLog);
      setGhostWpm(pb.wpm);
    } else {
      setGhostLog(null);
      setGhostWpm(null);
    }
  }, [duration]);

  // After a run finishes, re-read the PB in case this was a new record.
  // The save effect uses setTimeout(0) to write, so we wait a tick longer.
  useEffect(() => {
    if (!isRunFinished) return;
    const timerId = window.setTimeout(() => {
      const stats = readUserStats();
      const pb = stats?.bestByDuration[duration] ?? null;
      if (pb?.keystrokeLog && pb.keystrokeLog.length > 0) {
        setGhostLog(pb.keystrokeLog);
        setGhostWpm(pb.wpm);
      }
    }, 50);
    return () => window.clearTimeout(timerId);
  }, [isRunFinished, duration]);

  // Ghost cursor index — derived from elapsed time against the PB keystroke log.
  // Recomputed on every engine tick (60fps) with no extra rAF needed.
  const ghostIndex = useMemo<number | null>(() => {
    if (!ghostLog || !snapshot.metrics.started || isRunFinished || isReplaying) return null;
    const elapsedMs = snapshot.metrics.elapsed * 1000;
    let idx = 0;
    for (const entry of ghostLog) {
      if (entry.t > elapsedMs) break;
      // Forward char: cursor advances past the char that was typed.
      // Backspace: cursor retreats to the cleared position.
      if (entry.c !== null) idx = entry.i + 1;
      else idx = entry.i;
    }
    return idx;
  }, [ghostLog, snapshot.metrics.elapsed, snapshot.metrics.started, isRunFinished, isReplaying]);

  const focusTypingSoon = useCallback(() => {
    if (!typingEnabled) return;
    window.requestAnimationFrame(() => focusTypingInput());
  }, [typingEnabled, focusTypingInput]);

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
    regenerateText?: boolean;
  }) => {
    const nextDuration = options?.nextDuration ?? duration;
    const shouldRegenerateText = Boolean(options?.regenerateText);

    resetRunUiState();

    if (shouldRegenerateText) {
      regenerateTextContent();
    } else {
      restart(nextDuration);
    }

    focusTypingSoon();
  };

  // Placed after handleRestart so the closure captures its final definition.
  const swipeState = useSwipeToRestart(swipeArenaRef, {
    enabled: !showProfileDialog && !isSplashVisible && !isReplaying,
    onRestart: () => handleRestart(),
  });

  const shufflePrompt = () => {
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
                {requiresOnboarding ? t("profileWelcomeTitle") : t("profileEditTitle")}
              </h2>
              <p id="profile-dialog-description" className="text-sm text-muted-foreground">
                {requiresOnboarding ? t("profileWelcomeDesc") : t("profileEditDesc")}
              </p>
              <input
                ref={profileNameInputRef}
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                placeholder={t("profileNamePlaceholder")}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none ring-ring focus:ring-2"
                onKeyDown={(event) => {
                  if (event.key === "Enter") saveProfile();
                }}
              />
              <CountryPicker value={draftCountry} options={countryOptions} onChange={setDraftCountry} />
              <div className="flex gap-2">
                {!requiresOnboarding && (
                  <Button variant="ghost" className="w-full" onClick={closeProfileDialog}>
                    {t("btnCancel")}
                  </Button>
                )}
                <Button
                  onClick={saveProfile}
                  className="w-full"
                  disabled={!draftName.trim() || !isDraftCountryValid || countryOptions.length === 0}
                >
                  {requiresOnboarding ? t("btnSaveAndStart") : t("btnSaveProfile")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center justify-start px-4 py-4 md:py-5">
        <div className="w-full space-y-3">

          {/* ── HUD HEADER ── */}
          <header className="flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-card/90 px-3 py-2.5 shadow-sm backdrop-blur md:px-4">
            {/* Brand */}
            <div className="flex shrink-0 items-center gap-2.5">
              <div className="flex items-center gap-2 text-sm font-bold tracking-tight">
                <span aria-hidden className="h-2 w-2 rounded-full bg-primary motion-safe:animate-pulse" />
                <span>Lenuk Type</span>
              </div>
              <span className="hidden rounded-full border border-primary/25 bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary md:inline-flex">
                {t("tagline")}
              </span>
            </div>

            {/* Center: profile + status + quick actions */}
            <div className="flex min-w-0 flex-1 items-center justify-center gap-2 px-2">
              {onboardingComplete ? (
                <Tooltip text={t("tooltipEditProfile")}>
                  <button
                    type="button"
                    onClick={openProfileDialog}
                    className="flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3 py-1 text-xs font-medium transition hover:border-primary/40 hover:bg-background/90"
                  >
                    <User className="h-3.5 w-3.5 shrink-0 text-primary" />
                    {userCountry && <CountryFlag code={userCountry} />}
                    <span className="max-w-[100px] truncate">{userName}</span>
                    <Pencil className="h-3 w-3 shrink-0 text-muted-foreground" />
                  </button>
                </Tooltip>
              ) : (
                <button
                  type="button"
                  onClick={openProfileDialog}
                  className="flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary transition hover:bg-primary/20"
                >
                  <User className="h-3.5 w-3.5 shrink-0" />
                  {t("statusCompleteProfile")}
                </button>
              )}
              <span
                className={`hidden sm:inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
                  isRunFinished
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : typingEnabled
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "border-border/50 bg-background/40 text-muted-foreground"
                }`}
              >
                <span
                  aria-hidden
                  className={`h-1.5 w-1.5 rounded-full ${
                    isRunFinished ? "bg-primary" : typingEnabled ? "bg-emerald-500 motion-safe:animate-pulse" : "bg-muted-foreground"
                  }`}
                />
                {isSplashVisible
                  ? t("statusPreparing")
                  : isRunFinished
                    ? t("statusFinished")
                    : t("statusReady")}
              </span>
              {onboardingComplete && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="hidden h-7 rounded-full border border-border/60 bg-background/50 px-2.5 text-[11px] sm:inline-flex"
                  onClick={shufflePrompt}
                  disabled={!typingEnabled || isRunFinished}
                >
                  <Shuffle className="mr-1 h-3 w-3" />
                  {t("btnNewPrompt")}
                </Button>
              )}
            </div>

            {/* Utility: language + theme */}
            <div className="flex shrink-0 items-center gap-1">
              <LanguageSwitcher />
              <ThemeToggle />
            </div>
          </header>

          {/* ── TEST SETUP PANEL ── */}
          <section
            className="rounded-xl border border-border/60 bg-background/20 p-2.5 backdrop-blur"
            aria-label={t("testControls")}
          >
            <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              {/* Dropdowns */}
              <div className="relative overflow-hidden rounded-lg border border-border/70 bg-background/50 px-2 py-1.5 shadow-sm">
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_50%,hsl(var(--primary)/0.09),transparent_38%)]"
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

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                <div className="flex items-center gap-1">
                  <Tooltip text={t("tooltipRestartSame")}>
                    <Button variant="ghost" size="sm" onClick={() => handleRestart()}>
                      <RotateCcw className="mr-1 h-3.5 w-3.5" />
                      {t("btnRestart")}
                    </Button>
                  </Tooltip>
                  <Tooltip text={t("tooltipNextContent")}>
                    <Button variant="ghost" size="sm" onClick={() => handleRestart({ regenerateText: true })}>
                      <ArrowRight className="mr-1 h-3.5 w-3.5" />
                      {t("btnNext")}
                    </Button>
                  </Tooltip>
                </div>
                <span aria-hidden className="hidden h-5 w-px bg-border/60 sm:block" />
                <Link
                  href="/stats"
                  className="inline-flex h-8 items-center gap-2 rounded-md border border-border/70 bg-background/70 px-3 text-sm font-medium transition hover:border-primary/40 hover:text-primary"
                  aria-label={t("linkUserStats")}
                >
                  <BarChart3 className="h-4 w-4" />
                  {t("linkUserStats")}
                </Link>
                <Link
                  href="/leaderboard"
                  className="leaderboard-live-button group relative inline-flex h-8 items-center justify-center gap-2 overflow-hidden rounded-md border border-primary/20 bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 transition-all duration-200 hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-safe:animate-[leaderboard-button-pulse_2.8s_cubic-bezier(0.22,1,0.36,1)_infinite]"
                  aria-label={t("linkLeaderboard")}
                >
                  <span aria-hidden className="leaderboard-live-aura absolute inset-0 rounded-md" />
                  <span aria-hidden className="absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100 bg-[radial-gradient(circle_at_20%_15%,rgba(255,255,255,0.22),transparent_42%)]" />
                  <span aria-hidden className="absolute inset-y-0 left-[-40%] w-10 rotate-12 bg-white/20 blur-sm transition-transform duration-700 group-hover:translate-x-[290%] motion-safe:animate-[leaderboard-sheen_3.4s_ease-in-out_infinite]" />
                  <span aria-hidden className="leaderboard-live-orb relative h-2 w-2 rounded-full bg-white/95" />
                  <Trophy className="relative h-4 w-4 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110" />
                  <span className="relative">{t("linkLeaderboard")}</span>
                  <span className="leaderboard-live-badge relative hidden items-center rounded-full border border-white/20 bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] sm:inline-flex">
                    {t("badgeLive")}
                  </span>
                </Link>
              </div>
            </div>
          </section>

          {/* ── TYPING ARENA ── */}
          <div
            ref={swipeArenaRef}
            className={`typing-arena relative overflow-hidden rounded-2xl border bg-card/80 p-4 backdrop-blur transition-[border-color,box-shadow] duration-300 md:p-6 ${
              isRunFinished && !isReplaying
                ? "pointer-events-none select-none border-border/40 opacity-40 saturate-50 blur-[3px]"
                : typingEnabled && !isRunFinished
                  ? "typing-arena-active border-primary/30"
                  : "border-border/60"
            }`}
            aria-hidden={isRunFinished && !isReplaying ? true : undefined}
          >
            {/* Swipe-to-restart indicator — visible only during an active swipe gesture */}
            {swipeState.direction !== null && (
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-center py-2"
                style={{ opacity: Math.min(swipeState.progress * 1.6, 1) }}
              >
                <span className="flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary backdrop-blur">
                  <RotateCcw className="h-3.5 w-3.5" />
                  {swipeState.progress >= 1 ? t("swipeRelease") : t("swipeHint")}
                </span>
              </div>
            )}

            {/* Slideable content — shifts with the swipe gesture for tactile feedback */}
            <div
              className="space-y-5"
              style={{
                transform: swipeState.direction
                  ? `translateX(${(swipeState.direction === "right" ? 1 : -1) * swipeState.progress * 22}px)`
                  : undefined,
                transition: swipeState.direction ? undefined : "transform 0.25s ease-out",
              }}
            >
              {/* Gaming progress bar — color shifts as test progresses */}
              <div className="relative h-3 overflow-hidden rounded-full bg-muted/60">
                <div
                  className={`h-full rounded-full transition-all duration-150 ${
                    promptProgress < 34
                      ? "bg-primary"
                      : promptProgress < 67
                        ? "bg-amber-500"
                        : "bg-rose-500"
                  }`}
                  style={{ width: `${promptProgress}%` }}
                />
              </div>

              <TypingPrompt
                text={snapshot.text}
                statuses={promptStatuses}
                index={promptIndex}
                strokeVersion={promptStrokeVersion}
                capture={capture}
                enabled={typingEnabled && !isReplaying}
                finished={isRunFinished}
                ghostIndex={ghostIndex}
                ghostWpm={ghostWpm}
              />

              <BeginnerGuide
                typingLanguageCode={typingLanguageCode}
                onFocusPrompt={focusTypingSoon}
                canFocusPrompt={typingEnabled && !isRunFinished}
              />
            </div>
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
                <Tooltip text={t("tooltipReplay")}>
                  <Button variant="ghost" size="sm" onClick={handleReplay} disabled={!canReplayFinishedRun}>
                    <Play className="mr-1 h-4 w-4" />
                    {isReplaying ? t("btnReplaying") : t("btnReplay")}
                  </Button>
                </Tooltip>
                <Tooltip text={t("tooltipRestartSame")}>
                  <Button variant="ghost" size="sm" onClick={() => handleRestart()}>
                    <RotateCcw className="mr-1 h-4 w-4" />
                    {t("btnRestart")}
                  </Button>
                </Tooltip>
                <Tooltip text={t("tooltipNextContent")}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRestart({ regenerateText: true })}
                  >
                    <ArrowRight className="mr-1 h-4 w-4" />
                    {t("btnNext")}
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
                {t("saveStatusLabel")}{" "}
                {saveStatus === "idle"
                  ? t("saveWaiting")
                  : saveStatus === "saving"
                    ? t("saveSaving")
                    : saveStatus === "saved"
                      ? t("saveSaved")
                      : t("saveError")}
              </p>
            </div>

            <section className="grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]" aria-labelledby="lenuk-about-title">
              <article className="rounded-2xl border border-border/70 bg-background/35 p-4 shadow-sm backdrop-blur md:p-5">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 rounded-full border bg-background/60 px-2.5 py-1 text-xs text-muted-foreground">
                    <Keyboard className="h-3.5 w-3.5 text-primary" />
                    {t("aboutBadge")}
                  </div>
                  <div className="space-y-2">
                    <h2 id="lenuk-about-title" className="text-xl font-semibold tracking-tight">
                      {t("aboutTitle")}
                    </h2>
                    <p className="text-sm text-muted-foreground">{t("aboutDesc")}</p>
                  </div>
                  <ul className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                    <li className="rounded-xl border bg-background/50 px-3 py-2">{t("feature1")}</li>
                    <li className="rounded-xl border bg-background/50 px-3 py-2">{t("feature2")}</li>
                    <li className="rounded-xl border bg-background/50 px-3 py-2">{t("feature3")}</li>
                    <li className="rounded-xl border bg-background/50 px-3 py-2">{t("feature4")}</li>
                  </ul>
                </div>
              </article>

              <article className="rounded-2xl border border-border/70 bg-background/35 p-4 shadow-sm backdrop-blur md:p-5">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 rounded-full border bg-background/60 px-2.5 py-1 text-xs text-muted-foreground">
                    <Trophy className="h-3.5 w-3.5 text-primary" />
                    {t("faqBadge")}
                  </div>
                  <div className="space-y-3">
                    <div>
                      <h2 className="text-base font-semibold">{t("faqQ1")}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">{t("faqA1")}</p>
                    </div>
                    <div>
                      <h2 className="text-base font-semibold">{t("faqQ2")}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">{t("faqA2")}</p>
                    </div>
                    <div>
                      <h2 className="text-base font-semibold">{t("faqQ3")}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">{t("faqA3")}</p>
                    </div>
                  </div>
                </div>
              </article>
            </section>
          </div>
        <SiteCreditsFooter className="mt-3" />
      </main>
    </>
  );
}


