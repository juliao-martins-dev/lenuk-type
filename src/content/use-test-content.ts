"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { buildTestContent } from "@/src/content/generator";
import { DEFAULT_LANGUAGE_CODE } from "@/src/content/languages/registry";
import type { GeneratedTestContent, SupportedLanguageCode, TestMode, WordDifficulty } from "@/src/content/types";

export interface UseTestContentOptions {
  languageCode: SupportedLanguageCode;
  mode: TestMode;
  wordCount: number;
  duration: number;
  seed?: string | number;
  punctuation: boolean;
  numbers: boolean;
  punctuationRate?: number;
  numbersRate?: number;
  allowRepeat?: boolean;
  difficulty?: WordDifficulty;
}

function normalizeSeed(seed: string | number | undefined) {
  return seed ?? "lenuk-type";
}

function composeSeed(baseSeed: string | number, generationIndex: number) {
  return `${baseSeed}::${generationIndex}`;
}

function generateContentFromOptions(opts: UseTestContentOptions, generationIndex: number): GeneratedTestContent {
  const baseSeed = normalizeSeed(opts.seed);
  return buildTestContent({
    languageCode: opts.languageCode ?? DEFAULT_LANGUAGE_CODE,
    mode: opts.mode,
    wordCount: opts.wordCount,
    duration: opts.duration,
    seed: composeSeed(baseSeed, generationIndex),
    punctuation: opts.punctuation,
    numbers: opts.numbers,
    punctuationRate: opts.punctuationRate,
    numbersRate: opts.numbersRate,
    allowRepeat: opts.allowRepeat,
    difficulty: opts.difficulty
  });
}

export function useTestContent(opts: UseTestContentOptions) {
  const [generationIndex, setGenerationIndex] = useState(0);
  const latestOptsRef = useRef(opts);
  latestOptsRef.current = opts;

  const [content, setContent] = useState<GeneratedTestContent>(() => generateContentFromOptions(opts, 0));

  useEffect(() => {
    setGenerationIndex(0);
  }, [
    opts.languageCode,
    opts.mode,
    opts.wordCount,
    opts.duration,
    opts.seed,
    opts.punctuation,
    opts.numbers,
    opts.punctuationRate,
    opts.numbersRate,
    opts.allowRepeat,
    opts.difficulty
  ]);

  useEffect(() => {
    setContent(generateContentFromOptions(latestOptsRef.current, generationIndex));
  }, [
    generationIndex,
    opts.languageCode,
    opts.mode,
    opts.wordCount,
    opts.duration,
    opts.seed,
    opts.punctuation,
    opts.numbers,
    opts.punctuationRate,
    opts.numbersRate,
    opts.allowRepeat,
    opts.difficulty
  ]);

  const regenerate = useCallback((nextSeed?: string | number) => {
    if (nextSeed !== undefined) {
      setContent(
        buildTestContent({
          languageCode: latestOptsRef.current.languageCode ?? DEFAULT_LANGUAGE_CODE,
          mode: latestOptsRef.current.mode,
          wordCount: latestOptsRef.current.wordCount,
          duration: latestOptsRef.current.duration,
          seed: nextSeed,
          punctuation: latestOptsRef.current.punctuation,
          numbers: latestOptsRef.current.numbers,
          punctuationRate: latestOptsRef.current.punctuationRate,
          numbersRate: latestOptsRef.current.numbersRate,
          allowRepeat: latestOptsRef.current.allowRepeat,
          difficulty: latestOptsRef.current.difficulty
        })
      );
      return;
    }

    setGenerationIndex((value) => value + 1);
  }, []);

  return {
    content,
    regenerate,
    generationIndex
  };
}
