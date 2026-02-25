"use client";

import { BookOpen, ChevronDown, ChevronUp, Keyboard, Play, X } from "lucide-react";
import { memo, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

type GuideCopyLanguage = "en" | "tet";

const HIDDEN_KEY = "lenuk-guide-hidden";
const COLLAPSED_KEY = "lenuk-guide-collapsed";
const COPY_LANG_KEY = "lenuk-guide-lang";

interface BeginnerGuideProps {
  typingLanguageCode: string;
  mode: "text" | "code";
  onFocusPrompt: () => void;
  canFocusPrompt: boolean;
}

type GuideStep = {
  en: string;
  tet: string;
};

const STEPS: GuideStep[] = [
  {
    en: "Click the typing area (or just start typing) to begin.",
    tet: "Klik area tipu (ka hahuu deit atu hakerek) atu komesa."
  },
  {
    en: "Choose language and word count before the round starts.",
    tet: "Hili lingua no total liafuan molok ronda hahuu."
  },
  {
    en: "Pick your duration and difficulty, then focus on accuracy first.",
    tet: "Hili durasaun no nivel, depois foku uluk ba akurasia."
  },
  {
    en: "After you finish, use Restart for the same text or Next for a new text.",
    tet: "Depois remata, uza Restart ba testu hanesan ka Next ba testu foun."
  }
];

function getDefaultGuideLanguage(typingLanguageCode: string): GuideCopyLanguage {
  return typingLanguageCode === "tet-TL" ? "tet" : "en";
}

function BeginnerGuideContent({ typingLanguageCode, mode, onFocusPrompt, canFocusPrompt }: BeginnerGuideProps) {
  const [hidden, setHidden] = useState(false);
  const [collapsed, setCollapsed] = useState(true);
  const [copyLanguage, setCopyLanguage] = useState<GuideCopyLanguage>(getDefaultGuideLanguage(typingLanguageCode));

  useEffect(() => {
    if (typeof window === "undefined") return;

    setHidden(localStorage.getItem(HIDDEN_KEY) === "1");
    const savedCollapsed = localStorage.getItem(COLLAPSED_KEY);
    setCollapsed(savedCollapsed === null ? true : savedCollapsed === "1");

    const savedCopyLang = localStorage.getItem(COPY_LANG_KEY);
    if (savedCopyLang === "en" || savedCopyLang === "tet") {
      setCopyLanguage(savedCopyLang);
      return;
    }

    setCopyLanguage(getDefaultGuideLanguage(typingLanguageCode));
  }, [typingLanguageCode]);

  const title = copyLanguage === "tet" ? "Oinsa uza Lenuk Type" : "How to use Lenuk Type";
  const subtitle =
    copyLanguage === "tet"
      ? "Guia badak ba ema hahuu atu aprende tipu lalais."
      : "Quick beginner guide so first-time users can start typing confidently.";

  const helperNote = useMemo(() => {
    if (mode === "code") {
      return copyLanguage === "tet"
        ? "Mode code uza snippet fixu. Selektor lingua no liafuan sei desativa."
        : "Code mode uses a fixed snippet. Language and word count controls are disabled.";
    }

    return copyLanguage === "tet"
      ? "Mode text suporta English no Tetun ho gerasaun kontentu aleatoriu (seeded)."
      : "Text mode supports English and Tetun with deterministic generated content.";
  }, [copyLanguage, mode]);

  if (hidden) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-dashed bg-background/40 px-3 py-2">
        <p className="text-sm text-muted-foreground">
          {copyLanguage === "tet" ? "Guia beginner hetan subar." : "Beginner guide hidden."}
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setHidden(false);
            localStorage.setItem(HIDDEN_KEY, "0");
          }}
        >
          {copyLanguage === "tet" ? "Haree fila fali" : "Show tips"}
        </Button>
      </div>
    );
  }

  return (
    <section className="rounded-2xl border bg-card/60 p-4 shadow-sm backdrop-blur" aria-label="Beginner guide">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 rounded-full border bg-background/60 px-2.5 py-1 text-xs text-muted-foreground">
            <BookOpen className="h-3.5 w-3.5 text-primary" />
            {copyLanguage === "tet" ? "Guia beginner" : "Beginner guide"}
          </div>
          <h2 className="text-base font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border bg-muted/40 p-1">
            <button
              type="button"
              onClick={() => {
                setCopyLanguage("en");
                localStorage.setItem(COPY_LANG_KEY, "en");
              }}
              className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                copyLanguage === "en" ? "bg-background text-foreground" : "text-muted-foreground"
              }`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => {
                setCopyLanguage("tet");
                localStorage.setItem(COPY_LANG_KEY, "tet");
              }}
              className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                copyLanguage === "tet" ? "bg-background text-foreground" : "text-muted-foreground"
              }`}
            >
              Tetun
            </button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const next = !collapsed;
              setCollapsed(next);
              localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0");
            }}
            aria-label={collapsed ? "Expand guide" : "Collapse guide"}
          >
            {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setHidden(true);
              localStorage.setItem(HIDDEN_KEY, "1");
            }}
            aria-label="Hide guide"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!collapsed && (
        <div className="mt-4 grid gap-4 lg:grid-cols-[1.25fr_0.9fr]">
          <ol className="space-y-2">
            {STEPS.map((step, index) => (
              <li key={index} className="flex items-start gap-3 rounded-xl border bg-background/45 px-3 py-2.5">
                <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary">
                  {index + 1}
                </span>
                <span className="text-sm text-foreground/95">{copyLanguage === "tet" ? step.tet : step.en}</span>
              </li>
            ))}
          </ol>

          <div className="space-y-3 rounded-xl border bg-background/45 p-3">
            <p className="text-sm text-muted-foreground">{helperNote}</p>

            <div className="flex flex-wrap gap-2">
              <ShortcutChip icon={<Keyboard className="h-3.5 w-3.5" />} label="Esc" hint="Restart" />
              <ShortcutChip icon={<Keyboard className="h-3.5 w-3.5" />} label="Click" hint="Focus prompt" />
              {mode === "text" && <ShortcutChip icon={<Play className="h-3.5 w-3.5" />} label="Next" hint="New text" />}
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-center border bg-background/60"
              onClick={onFocusPrompt}
              disabled={!canFocusPrompt}
            >
              {copyLanguage === "tet" ? "Foku ba area tipu" : "Focus typing area"}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

function ShortcutChip({ icon, label, hint }: { icon: ReactNode; label: string; hint: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border bg-background/70 px-2.5 py-1 text-xs">
      <span className="text-primary">{icon}</span>
      <span className="font-semibold">{label}</span>
      <span className="text-muted-foreground">{hint}</span>
    </span>
  );
}

export const BeginnerGuide = memo(BeginnerGuideContent);
