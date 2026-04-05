"use client";

import { useEffect } from "react";
import { I18nextProvider } from "react-i18next";
import i18n, { UI_LANGUAGES } from "@/lib/i18n";

export function I18nProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const applyHtmlAttrs = (lang: string) => {
      const cfg = UI_LANGUAGES.find((l) => l.code === lang);
      document.documentElement.lang = lang;
      document.documentElement.dir = cfg?.dir ?? "ltr";
    };

    applyHtmlAttrs(i18n.language);
    i18n.on("languageChanged", applyHtmlAttrs);
    return () => {
      i18n.off("languageChanged", applyHtmlAttrs);
    };
  }, []);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
