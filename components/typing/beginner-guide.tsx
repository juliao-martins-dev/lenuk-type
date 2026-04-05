"use client";

import { BookOpen, ChevronDown, ChevronUp, Keyboard, Play, X } from "lucide-react";
import { memo, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

const HIDDEN_KEY = "lenuk-guide-hidden";
const COLLAPSED_KEY = "lenuk-guide-collapsed";

interface BeginnerGuideProps {
  typingLanguageCode: string;
  onFocusPrompt: () => void;
  canFocusPrompt: boolean;
}

function BeginnerGuideContent({ onFocusPrompt, canFocusPrompt }: BeginnerGuideProps) {
  const { t } = useTranslation();
  const [hidden, setHidden] = useState(false);
  const [collapsed, setCollapsed] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setHidden(localStorage.getItem(HIDDEN_KEY) === "1");
    const savedCollapsed = localStorage.getItem(COLLAPSED_KEY);
    setCollapsed(savedCollapsed === null ? true : savedCollapsed === "1");
  }, []);

  if (hidden) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-dashed bg-background/40 px-3 py-2">
        <p className="text-sm text-muted-foreground">{t("guideHidden")}</p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setHidden(false);
            localStorage.setItem(HIDDEN_KEY, "0");
          }}
        >
          {t("guideShowTips")}
        </Button>
      </div>
    );
  }

  return (
    <section className="rounded-2xl border bg-card/60 p-4 shadow-sm backdrop-blur" aria-label={t("guideBadge")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 rounded-full border bg-background/60 px-2.5 py-1 text-xs text-muted-foreground">
            <BookOpen className="h-3.5 w-3.5 text-primary" />
            {t("guideBadge")}
          </div>
          <h2 className="text-base font-semibold">{t("guideTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("guideSubtitle")}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
            {([1, 2, 3, 4] as const).map((n) => (
              <li key={n} className="flex items-start gap-3 rounded-xl border bg-background/45 px-3 py-2.5">
                <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary">
                  {n}
                </span>
                <span className="text-sm text-foreground/95">
                  {t(`guideStep${n}` as "guideStep1" | "guideStep2" | "guideStep3" | "guideStep4")}
                </span>
              </li>
            ))}
          </ol>

          <div className="space-y-3 rounded-xl border bg-background/45 p-3">
            <p className="text-sm text-muted-foreground">{t("guideHelperNote")}</p>

            <div className="flex flex-wrap gap-2">
              <ShortcutChip icon={<Keyboard className="h-3.5 w-3.5" />} label="Esc" hint={t("shortcutRestart")} />
              <ShortcutChip icon={<Keyboard className="h-3.5 w-3.5" />} label="Click" hint={t("shortcutFocusPrompt")} />
              <ShortcutChip icon={<Play className="h-3.5 w-3.5" />} label="Next" hint={t("shortcutNewText")} />
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-center border bg-background/60"
              onClick={onFocusPrompt}
              disabled={!canFocusPrompt}
            >
              {t("guideFocusArea")}
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
