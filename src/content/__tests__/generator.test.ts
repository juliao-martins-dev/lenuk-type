import { describe, expect, it } from "vitest";
import { applyToggles, generateWordList, toCharStream } from "@/src/content/generator";
import { getLanguage } from "@/src/content/languages/registry";

describe("content generator", () => {
  it("generates deterministic word lists for the same seed", () => {
    const first = generateWordList({
      languageCode: "en-US",
      count: 12,
      seed: "same-seed",
      allowRepeat: true,
      difficulty: "mixed"
    });

    const second = generateWordList({
      languageCode: "en-US",
      count: 12,
      seed: "same-seed",
      allowRepeat: true,
      difficulty: "mixed"
    });

    expect(first.words).toEqual(second.words);
  });

  it("switching languages changes the source output", () => {
    const en = generateWordList({
      languageCode: "en-US",
      count: 10,
      seed: "lang-seed"
    });
    const pt = generateWordList({
      languageCode: "pt-CPLP",
      count: 10,
      seed: "lang-seed"
    });

    expect(en.words).not.toEqual(pt.words);

    const enSet = new Set(getLanguage("en-US").words);
    const ptSet = new Set(getLanguage("pt-CPLP").words);

    expect(en.words.every((word) => enSet.has(word))).toBe(true);
    expect(pt.words.every((word) => ptSet.has(word))).toBe(true);
  });

  it("punctuation and numbers toggles are deterministic and change tokens", () => {
    const words = ["quick", "clear", "input", "score", "daily", "test", "state", "logic"];
    const toggledA = applyToggles(words, {
      punctuation: true,
      numbers: true,
      punctuationRate: 0.8,
      numbersRate: 0.6,
      seed: "toggle-seed"
    });

    const toggledB = applyToggles(words, {
      punctuation: true,
      numbers: true,
      punctuationRate: 0.8,
      numbersRate: 0.6,
      seed: "toggle-seed"
    });

    const plain = applyToggles(words, {
      punctuation: false,
      numbers: false,
      seed: "toggle-seed"
    });

    expect(toggledA.tokens).toEqual(toggledB.tokens);
    expect(toggledA.tokens).not.toEqual(plain.tokens);
    expect(toggledA.tokens.some((token) => /^\d+$/.test(token))).toBe(true);
    expect(toggledA.tokens.some((token) => /[.,?!;:]$/.test(token))).toBe(true);
  });

  it("joins tokens with single spaces and stable char output", () => {
    const { text, chars } = toCharStream(["alpha", "", " beta ", " ", "gamma", "delta"]);

    expect(text).toBe("alpha beta gamma delta");
    expect(text.includes("  ")).toBe(false);
    expect(chars.join("")).toBe(text);
    expect(chars.length).toBe(text.length);
  });

  it("never creates invalid punctuation patterns when punctuation is enabled", () => {
    const { tokens } = applyToggles(["word", "clean", "state", "logic", "input", "focus"], {
      punctuation: true,
      numbers: false,
      punctuationRate: 1,
      seed: "punct-seed"
    });

    expect(tokens.length).toBeGreaterThan(0);

    for (const token of tokens) {
      expect(/^[,.;:!?]/.test(token)).toBe(false);
      expect(/[.,?!;:]{2,}$/.test(token)).toBe(false);
      expect(/[,.;:!?]\S+[,.;:!?]$/.test(token)).toBe(false);
    }
  });

  it("adds exactly one number per word when numbersRate is 1", () => {
    const words = ["hau", "ita", "nia", "sira", "tempu", "pratika"];
    const { tokens } = applyToggles(words, {
      punctuation: false,
      numbers: true,
      numbersRate: 1,
      seed: "numbers-every-word"
    });

    const numberTokens = tokens.filter((token) => /^\d+$/.test(token));
    const wordTokens = tokens.filter((token) => !/^\d+$/.test(token));

    expect(numberTokens).toHaveLength(words.length);
    expect(wordTokens).toHaveLength(words.length);
  });

  it("can generate hard-style streams with punctuation on every word plus numbers", () => {
    const words = ["alpha", "beta", "gamma", "delta"];
    const { tokens } = applyToggles(words, {
      punctuation: true,
      numbers: true,
      punctuationRate: 1,
      numbersRate: 1,
      seed: "hard-style"
    });

    const wordTokens = tokens.filter((token) => /[A-Za-z]/.test(token));
    const numberTokens = tokens.filter((token) => /^\d+$/.test(token));

    expect(wordTokens).toHaveLength(words.length);
    expect(numberTokens).toHaveLength(words.length);
    expect(wordTokens.every((token) => /[.,?!;:]$/.test(token))).toBe(true);
  });
});
