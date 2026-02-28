export type LanguageDirection = "ltr";

export type SupportedLanguageCode = "en-US" | "pt-CPLP" | "id-ID" | "tet-TL";

export interface LanguageQuote {
  text: string;
  source?: string;
}

export interface LanguagePack {
  name: string;
  code: SupportedLanguageCode;
  direction: LanguageDirection;
  words: string[];
  bigrams?: string[];
  quotes?: LanguageQuote[];
}

export interface LanguageSummary {
  name: string;
  code: SupportedLanguageCode;
  direction: LanguageDirection;
}

export type WordDifficulty = "common" | "mixed";

export interface GenerateWordListOptions {
  languageCode: SupportedLanguageCode;
  count: number;
  seed: string | number;
  allowRepeat?: boolean;
  difficulty?: WordDifficulty;
}

export interface ApplyTogglesOptions {
  punctuation: boolean;
  numbers: boolean;
  punctuationRate?: number;
  numbersRate?: number;
  seed?: string | number;
  targetTokenCount?: number;
}

export interface GeneratedWordList {
  words: string[];
}

export interface ToggledTokenStream {
  tokens: string[];
}

export interface CharStream {
  chars: string[];
  text: string;
}

export type TestMode = "words" | "time";

export interface BuildTestContentOptions {
  languageCode: SupportedLanguageCode;
  mode: TestMode;
  wordCount: number;
  duration: number;
  seed: string | number;
  punctuation: boolean;
  numbers: boolean;
  punctuationRate?: number;
  numbersRate?: number;
  allowRepeat?: boolean;
  difficulty?: WordDifficulty;
}

export interface GeneratedTestContent {
  languageCode: SupportedLanguageCode;
  mode: TestMode;
  seed: string | number;
  targetWordCount: number;
  words: string[];
  tokens: string[];
  chars: string[];
  text: string;
}
