import { enUSLanguagePack } from "@/src/content/languages/en-US";
import { idIDLanguagePack } from "@/src/content/languages/id-ID";
import { ptCplpLanguagePack } from "@/src/content/languages/pt-CPLP";
import { tetTLLanguagePack } from "@/src/content/languages/tet-TL";
import type { LanguagePack, LanguageSummary, SupportedLanguageCode } from "@/src/content/types";

function dedupeWords(words: string[]) {
  const seen = new Set<string>();
  const deduped: string[] = [];

  for (const rawWord of words) {
    const word = rawWord.trim();
    if (!word) continue;
    if (seen.has(word)) continue;
    seen.add(word);
    deduped.push(word);
  }

  return deduped;
}

function normalizePack(pack: LanguagePack): LanguagePack {
  return {
    ...pack,
    words: dedupeWords(pack.words)
  };
}

const registry: Record<SupportedLanguageCode, LanguagePack> = {
  "en-US": normalizePack(enUSLanguagePack),
  "pt-CPLP": normalizePack(ptCplpLanguagePack),
  "id-ID": normalizePack(idIDLanguagePack),
  "tet-TL": normalizePack(tetTLLanguagePack)
};

export const DEFAULT_LANGUAGE_CODE: SupportedLanguageCode = "en-US";

export function getLanguage(code: SupportedLanguageCode): LanguagePack {
  return registry[code];
}

export function listLanguages(): LanguageSummary[] {
  return Object.values(registry).map(({ code, name, direction }) => ({ code, name, direction }));
}

export type { SupportedLanguageCode } from "@/src/content/types";

