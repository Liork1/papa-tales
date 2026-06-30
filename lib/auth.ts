import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient, User, Session, AuthChangeEvent } from "@supabase/supabase-js";

// MIUI (Xiaomi) and some other browsers block localStorage in privacy mode.
// sessionStorage survives page-to-page navigation within the same tab (including
// OAuth redirects), which is all PKCE needs. Falls back to in-memory as last resort.
function makeSafeStorage(): Storage {
  if (typeof window === "undefined") {
    const m: Record<string, string> = {};
    return { getItem: (k) => m[k] ?? null, setItem: (k, v) => { m[k] = v; }, removeItem: (k) => { delete m[k]; }, clear: () => { Object.keys(m).forEach(k => delete m[k]); }, key: (i) => Object.keys(m)[i] ?? null, get length() { return Object.keys(m).length; } } as Storage;
  }
  for (const store of [localStorage, sessionStorage]) {
    try {
      store.setItem("__sb_check__", "1");
      store.removeItem("__sb_check__");
      return store;
    } catch { /* blocked — try next */ }
  }
  // Both blocked: in-memory (no cross-tab persistence, but OAuth within one tab works)
  const m: Record<string, string> = {};
  return { getItem: (k) => m[k] ?? null, setItem: (k, v) => { m[k] = v; }, removeItem: (k) => { delete m[k]; }, clear: () => { Object.keys(m).forEach(k => delete m[k]); }, key: (i) => Object.keys(m)[i] ?? null, get length() { return Object.keys(m).length; } } as Storage;
}

let browserClient: SupabaseClient | null = null;

export function getAuthClient(): SupabaseClient {
  if (!browserClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
    browserClient = createClient(url, key, { auth: { storage: makeSafeStorage() } });
  }
  return browserClient;
}

export async function signInWithGoogle(): Promise<void> {
  const client = getAuthClient();
  await client.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin}/auth/callback` },
  });
}

export async function signUpWithEmail(
  email: string,
  password: string,
  displayName?: string
): Promise<{ error: string | null }> {
  const client = getAuthClient();
  const { error } = await client.auth.signUp({
    email,
    password,
    options: displayName ? { data: { display_name: displayName } } : undefined,
  });
  return { error: error?.message ?? null };
}

export async function signInWithEmail(
  email: string,
  password: string
): Promise<{ error: string | null }> {
  const client = getAuthClient();
  const { error } = await client.auth.signInWithPassword({ email, password });
  return { error: error?.message ?? null };
}

export async function sendPasswordReset(email: string): Promise<{ error: string | null }> {
  const client = getAuthClient();
  const { error } = await client.auth.resetPasswordForEmail(email, {
    redirectTo: `${typeof window !== "undefined" ? window.location.origin : ""}/auth?mode=reset`,
  });
  return { error: error?.message ?? null };
}

export async function signOut(): Promise<void> {
  const client = getAuthClient();
  await client.auth.signOut();
}

export async function getSession(): Promise<Session | null> {
  const client = getAuthClient();
  const { data } = await client.auth.getSession();
  return data.session;
}

export function onAuthChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void
): () => void {
  const client = getAuthClient();
  const { data: { subscription } } = client.auth.onAuthStateChange(callback);
  return () => subscription.unsubscribe();
}

export type { User, Session };
