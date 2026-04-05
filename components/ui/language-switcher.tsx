"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import i18n, { UI_LANGUAGES, STORAGE_KEY_UI_LANG, type UILanguageCode } from "@/lib/i18n";

interface DropdownPos {
  top: number;
  right: number;
}

export function LanguageSwitcher({ className }: { className?: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState<UILanguageCode>("en");
  const [dropdownPos, setDropdownPos] = useState<DropdownPos>({ top: 0, right: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const lang = i18n.language as UILanguageCode;
    setCurrentLang(lang);

    const handler = (lng: string) => setCurrentLang(lng as UILanguageCode);
    i18n.on("languageChanged", handler);
    return () => {
      i18n.off("languageChanged", handler);
    };
  }, []);

  // Recalculate position when opening
  const openDropdown = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setDropdownPos({
      top: rect.bottom + 6,
      right: window.innerWidth - rect.right,
    });
    setOpen(true);
  };

  // Close on outside click or scroll
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (triggerRef.current && !triggerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const closeOnScroll = () => setOpen(false);
    document.addEventListener("mousedown", close);
    window.addEventListener("scroll", closeOnScroll, { passive: true, capture: true });
    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("scroll", closeOnScroll, { capture: true });
    };
  }, [open]);

  const selectLanguage = (code: UILanguageCode) => {
    i18n.changeLanguage(code);
    localStorage.setItem(STORAGE_KEY_UI_LANG, code);
    setCurrentLang(code);
    setOpen(false);
  };

  const active = UI_LANGUAGES.find((l) => l.code === currentLang) ?? UI_LANGUAGES[0];

  const dropdown = open
    ? createPortal(
        <div
          role="listbox"
          aria-label={t("langSwitcherLabel")}
          style={{
            position: "fixed",
            top: dropdownPos.top,
            right: dropdownPos.right,
            zIndex: 9999,
          }}
          className="min-w-[170px] overflow-hidden rounded-xl border border-border/70 bg-background shadow-xl shadow-black/20 backdrop-blur"
        >
          {UI_LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              role="option"
              aria-selected={lang.code === currentLang}
              type="button"
              onMouseDown={(e) => {
                // Use mousedown so it fires before the outside-click handler
                e.preventDefault();
                selectLanguage(lang.code);
              }}
              className={cn(
                "flex w-full items-center gap-2.5 px-3 py-2.5 text-sm transition-colors hover:bg-primary/10 hover:text-primary",
                lang.code === currentLang && "font-semibold text-primary"
              )}
            >
              <span role="img" aria-label={lang.label} className="text-base leading-none">
                {lang.flag}
              </span>
              <span className="flex-1 text-left">{lang.label}</span>
              {lang.code === currentLang && (
                <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
              )}
            </button>
          ))}
        </div>,
        document.body
      )
    : null;

  return (
    <div className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? setOpen(false) : openDropdown())}
        aria-label={t("langSwitcherLabel")}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="inline-flex h-7 items-center gap-1.5 rounded-full border bg-background/50 px-2.5 text-[11px] font-medium transition-colors hover:border-primary/40 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span role="img" aria-label={active.label} className="text-sm leading-none">
          {active.flag}
        </span>
        <span className="hidden sm:inline">{active.code.toUpperCase()}</span>
        <ChevronDown
          className={cn(
            "h-3 w-3 text-muted-foreground transition-transform duration-150",
            open && "rotate-180"
          )}
        />
      </button>

      {dropdown}
    </div>
  );
}
