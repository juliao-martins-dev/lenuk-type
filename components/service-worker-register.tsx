"use client";

import { useEffect } from "react";

/**
 * Registers the Serwist-built service worker so the app becomes installable
 * and plays offline after the first successful load. No-ops in dev (where the
 * SW is disabled in next.config.ts) and on browsers without SW support.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch(() => {
          // Swallow — offline play is a progressive enhancement.
        });
    };

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}
