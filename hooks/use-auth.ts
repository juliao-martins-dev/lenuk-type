"use client";

/**
 * useAuth — Supabase anonymous auth with magic-link upgrade path.
 *
 * Flow
 * ────
 * 1. On mount, check for an existing Supabase session.
 * 2. If none exists, call signInAnonymously() so every visitor gets a stable
 *    Supabase user ID immediately — no sign-up required.
 * 3. When the user wants to persist across devices they supply an email.
 *    signInWithEmail() sends a magic link via Supabase OTP.
 * 4. Clicking the link converts the anonymous account to a named account
 *    while preserving the same user ID — run history is never lost.
 *
 * Prerequisites (Supabase dashboard)
 * ───────────────────────────────────
 * • Authentication → Settings → "Allow anonymous sign-ins" must be ON.
 * • Authentication → Providers → Email must be enabled (on by default).
 * • Site URL and Redirect URLs must include your production domain.
 */

import { useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase";

export type MagicLinkStatus = "idle" | "sending" | "sent" | "error";

export interface AuthState {
  /** Supabase user — null while the session is being loaded. */
  user: User | null;
  /** True while the initial session check and anon sign-in are in flight. */
  loading: boolean;
  /** True when the account has no linked email (anonymous session). */
  isAnonymous: boolean;
  /** Status of the most recent magic-link send attempt. */
  magicLinkStatus: MagicLinkStatus;
  /** Error message from the most recent magic-link attempt. */
  magicLinkError: string | null;
}

export interface UseAuthReturn extends AuthState {
  /** Send a magic-link to the supplied email to upgrade an anonymous account. */
  sendMagicLink: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const INITIAL: AuthState = {
  user: null,
  loading: true,
  isAnonymous: false,
  magicLinkStatus: "idle",
  magicLinkError: null,
};

export function useAuth(): UseAuthReturn {
  const [state, setState] = useState<AuthState>(INITIAL);
  // Guard against calling signInAnonymously more than once.
  const anonSignInAttempted = useRef(false);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    // Subscribe to auth state changes first so we never miss a transition.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setState((prev) => ({
        ...prev,
        user: session?.user ?? null,
        loading: false,
        isAnonymous: session?.user?.is_anonymous ?? false,
      }));
    });

    // Bootstrap: resolve existing session or create an anonymous one.
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        setState((prev) => ({ ...prev, loading: false }));
        return;
      }

      if (session) {
        setState({
          ...INITIAL,
          user: session.user,
          loading: false,
          isAnonymous: session.user?.is_anonymous ?? false,
        });
        return;
      }

      // No session — sign in anonymously so the user gets a stable ID.
      if (anonSignInAttempted.current) return;
      anonSignInAttempted.current = true;

      supabase.auth.signInAnonymously().then(({ data, error: anonError }) => {
        if (anonError) {
          // Anonymous auth may not be enabled in the dashboard — degrade gracefully.
          console.warn("[useAuth] Anonymous sign-in failed:", anonError.message);
          setState((prev) => ({ ...prev, loading: false }));
          return;
        }
        setState({
          ...INITIAL,
          user: data.user,
          loading: false,
          isAnonymous: true,
        });
      });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const sendMagicLink = async (email: string): Promise<void> => {
    setState((prev) => ({
      ...prev,
      magicLinkStatus: "sending",
      magicLinkError: null,
    }));

    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/`,
      },
    });

    if (error) {
      setState((prev) => ({
        ...prev,
        magicLinkStatus: "error",
        magicLinkError: error.message,
      }));
    } else {
      setState((prev) => ({
        ...prev,
        magicLinkStatus: "sent",
        magicLinkError: null,
      }));
    }
  };

  const signOut = async (): Promise<void> => {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    setState(INITIAL);
    // Re-issue an anonymous session so the app keeps working.
    anonSignInAttempted.current = false;
  };

  return { ...state, sendMagicLink, signOut };
}
