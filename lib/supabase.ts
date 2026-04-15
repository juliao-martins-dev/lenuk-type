import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readPublicConfig } from "@/lib/public-config";

function getServerSupabaseUrl() {
  const url = process.env.SUPABASE_URL?.trim() ?? "";
  if (!url) throw new Error("Missing SUPABASE_URL");
  return url;
}

function getServerSupabaseServerKey() {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_ANON_KEY?.trim() ||
    process.env.SUPABASE_PUBLISHABLE_KEY?.trim() ||
    ""
  );
}

let browserClient: SupabaseClient | null = null;
let serverClient: SupabaseClient | null = null;

/**
 * Browser Supabase client — reads the URL + publishable key from the runtime
 * config injected by the root layout (window.__LENUK_CONFIG__). The values
 * never appear in the compiled client JS bundle.
 */
export function getSupabaseBrowserClient() {
  if (!browserClient) {
    const { supabaseUrl, supabasePublishableKey } = readPublicConfig();
    if (!supabaseUrl || !supabasePublishableKey) {
      throw new Error("Supabase public config is missing at runtime.");
    }
    browserClient = createClient(supabaseUrl, supabasePublishableKey);
  }
  return browserClient;
}

/**
 * Server Supabase client — uses the service role key when available, else
 * falls back to the anon/publishable key. Must only be called server-side.
 */
export function getSupabaseServerClient() {
  if (!serverClient) {
    const key = getServerSupabaseServerKey();
    if (!key) throw new Error("Missing Supabase server key");
    serverClient = createClient(getServerSupabaseUrl(), key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return serverClient;
}
