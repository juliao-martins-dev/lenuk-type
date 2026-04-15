/**
 * Runtime-injected public config.
 *
 * Why this file exists
 * ────────────────────
 * We deliberately do NOT use Next.js `NEXT_PUBLIC_*` env vars. Anything with
 * that prefix is inlined at build time and ends up baked into the compiled
 * client JS bundle — anyone who downloads the site can grep the minified JS
 * and extract the value.
 *
 * Instead, the root layout (server component) reads private env vars at
 * request time and emits them as a small inline script that sets
 * `window.__LENUK_CONFIG__`. The browser reads that global at runtime.
 *
 * Result: the compiled JS in `.next/static/*` never contains the values.
 * They only appear in the dynamically-rendered HTML response.
 */

export interface LenukPublicConfig {
  supabaseUrl: string;
  supabasePublishableKey: string;
  supabaseResultsTable: string;
}

/** Key used on `window` and in the inline script. */
export const RUNTIME_CONFIG_GLOBAL = "__LENUK_CONFIG__";

declare global {
  interface Window {
    __LENUK_CONFIG__?: LenukPublicConfig;
  }
}

/**
 * Read config from server env. Server-only — called from the root layout.
 * Never import this from a file marked "use client".
 */
export function getServerPublicConfig(): LenukPublicConfig {
  return {
    supabaseUrl: process.env.SUPABASE_URL?.trim() ?? "",
    supabasePublishableKey:
      process.env.SUPABASE_PUBLISHABLE_KEY?.trim() ||
      process.env.SUPABASE_ANON_KEY?.trim() ||
      "",
    supabaseResultsTable:
      process.env.SUPABASE_RESULTS_TABLE?.trim() || "lenuk_typing_users",
  };
}

/**
 * Serialize the config for safe embedding in a <script> tag.
 * Escapes `<` to prevent </script>-based injection; values are JSON strings so
 * other metacharacters are already safe.
 */
export function serializePublicConfig(config: LenukPublicConfig): string {
  return JSON.stringify(config).replace(/</g, "\\u003c");
}

/**
 * Read config in the browser. Throws if the inline bootstrap hasn't run yet
 * (which would only happen if this is called before hydration).
 */
export function readPublicConfig(): LenukPublicConfig {
  if (typeof window === "undefined") {
    throw new Error("readPublicConfig() called on the server");
  }
  const cfg = window.__LENUK_CONFIG__;
  if (!cfg) {
    throw new Error(
      "Lenuk runtime config missing — the inline bootstrap script did not run.",
    );
  }
  return cfg;
}
