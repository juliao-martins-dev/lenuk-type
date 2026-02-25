import { getLanguage } from "@/src/content/languages/registry";
import type {
  ApplyTogglesOptions,
  BuildTestContentOptions,
  CharStream,
  GeneratedTestContent,
  GeneratedWordList,
  GenerateWordListOptions,
  ToggledTokenStream,
  WordDifficulty
} from "@/src/content/types";

type Rng = () => number;

const PUNCTUATION_SYMBOLS = [".", ",", "?", "!", ";", ":"];
const DEFAULT_PUNCTUATION_RATE = 0.12;
const DEFAULT_NUMBERS_RATE = 0.08;
const LEADING_TRAILING_PUNCTUATION_RE = /^[.,?!;:]+|[.,?!;:]+$/g;
const TRAILING_PUNCTUATION_RE = /[.,?!;:]+$/;

function xmur3(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let index = 0; index < seed.length; index += 1) {
    h = Math.imul(h ^ seed.charCodeAt(index), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function nextHash() {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

function mulberry32(seed: number): Rng {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let t = Math.imul(value ^ (value >>> 15), 1 | value);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clampRate(value: number | undefined, fallback: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(1, Math.max(0, Number(value)));
}

function randomInt(rng: Rng, minInclusive: number, maxExclusive: number) {
  if (maxExclusive <= minInclusive) return minInclusive;
  return Math.floor(rng() * (maxExclusive - minInclusive)) + minInclusive;
}

function sanitizeWordToken(token: string) {
  return token.trim().replace(/\s+/g, "").replace(LEADING_TRAILING_PUNCTUATION_RE, "");
}

function hasTrailingPunctuation(token: string) {
  return TRAILING_PUNCTUATION_RE.test(token);
}

function pickPunctuation(rng: Rng) {
  return PUNCTUATION_SYMBOLS[randomInt(rng, 0, PUNCTUATION_SYMBOLS.length)];
}

function buildToggleSeed(words: string[], opts: ApplyTogglesOptions) {
  return [
    "toggles",
    opts.seed ?? "",
    opts.punctuation ? "p1" : "p0",
    opts.numbers ? "n1" : "n0",
    String(opts.punctuationRate ?? DEFAULT_PUNCTUATION_RATE),
    String(opts.numbersRate ?? DEFAULT_NUMBERS_RATE),
    String(words.length),
    words.join("|")
  ].join("::");
}

function buildNumberToken(rng: Rng) {
  const length = randomInt(rng, 1, 5);
  if (length === 1) return String(randomInt(rng, 0, 10));

  let output = String(randomInt(rng, 1, 10));
  for (let index = 1; index < length; index += 1) {
    output += String(randomInt(rng, 0, 10));
  }
  return output;
}

function getDifficultyPool(words: string[], difficulty: WordDifficulty = "mixed") {
  if (difficulty !== "common") return words;
  const commonSize = Math.max(16, Math.min(words.length, Math.floor(words.length * 0.6)));
  return words.slice(0, commonSize);
}

function pickUniqueWords(pool: string[], count: number, rng: Rng) {
  const copy = pool.slice();
  const limit = Math.min(count, copy.length);
  const output: string[] = [];

  for (let index = 0; index < limit; index += 1) {
    const randomIndex = randomInt(rng, index, copy.length);
    [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
    output.push(copy[index]);
  }

  return output;
}

export function createRng(seed: string | number): Rng {
  const normalized = typeof seed === "number" ? String(seed) : seed;
  const seedFactory = xmur3(normalized);
  return mulberry32(seedFactory());
}

export function pickWord(words: string[], rng: Rng): string {
  if (words.length === 0) {
    throw new Error("pickWord requires a non-empty word list");
  }

  return words[randomInt(rng, 0, words.length)];
}

export function generateWordList(opts: GenerateWordListOptions): GeneratedWordList {
  const { languageCode, seed, difficulty = "mixed" } = opts;
  const count = Math.max(0, Math.floor(opts.count));
  const allowRepeat = opts.allowRepeat ?? true;

  if (count === 0) return { words: [] };

  const pack = getLanguage(languageCode);
  const pool = getDifficultyPool(pack.words, difficulty);
  if (pool.length === 0) return { words: [] };

  const rng = createRng(seed);

  if (!allowRepeat) {
    return { words: pickUniqueWords(pool, count, rng) };
  }

  const words: string[] = [];
  for (let index = 0; index < count; index += 1) {
    words.push(pickWord(pool, rng));
  }

  return { words };
}

export function applyToggles(words: string[], opts: ApplyTogglesOptions): ToggledTokenStream {
  const punctuationRate = clampRate(opts.punctuationRate, DEFAULT_PUNCTUATION_RATE);
  const numbersRate = clampRate(opts.numbersRate, DEFAULT_NUMBERS_RATE);
  const rng = createRng(buildToggleSeed(words, opts));
  const tokens: string[] = [];

  for (const rawWord of words) {
    const baseWord = sanitizeWordToken(rawWord);
    if (!baseWord) continue;

    if (opts.numbers && rng() < numbersRate * 0.5) {
      tokens.push(buildNumberToken(rng));
    }

    let token = baseWord;
    if (opts.punctuation && rng() < punctuationRate && !hasTrailingPunctuation(token)) {
      token = `${token}${pickPunctuation(rng)}`;
    }

    tokens.push(token);

    if (opts.numbers && rng() < numbersRate * 0.5) {
      tokens.push(buildNumberToken(rng));
    }
  }

  return { tokens };
}

export function toCharStream(tokens: string[]): CharStream {
  const normalizedTokens = tokens.map((token) => token.trim()).filter(Boolean);
  const text = normalizedTokens.join(" ");
  return {
    chars: Array.from(text),
    text
  };
}

function resolveTargetWordCount(mode: BuildTestContentOptions["mode"], wordCount: number, duration: number) {
  if (mode === "words") {
    return Math.max(1, Math.floor(wordCount));
  }

  // Time mode needs a buffered stream so the user does not hit the end too early.
  return Math.max(40, Math.ceil(duration * 4.5), Math.floor(wordCount));
}

export function buildTestContent(opts: BuildTestContentOptions): GeneratedTestContent {
  const targetWordCount = resolveTargetWordCount(opts.mode, opts.wordCount, opts.duration);
  const { words } = generateWordList({
    languageCode: opts.languageCode,
    count: targetWordCount,
    seed: opts.seed,
    allowRepeat: opts.allowRepeat,
    difficulty: opts.difficulty
  });

  const { tokens } = applyToggles(words, {
    punctuation: opts.punctuation,
    numbers: opts.numbers,
    seed: opts.seed
  });

  const { chars, text } = toCharStream(tokens);

  return {
    languageCode: opts.languageCode,
    mode: opts.mode,
    seed: opts.seed,
    targetWordCount,
    words,
    tokens,
    chars,
    text
  };
}

export type { Rng };

