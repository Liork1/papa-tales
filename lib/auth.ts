import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient, User, Session, AuthChangeEvent } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

export function getAuthClient(): SupabaseClient {
  if (!browserClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
    // createClient (supabase-js) uses localStorage — more reliable for browser PKCE flows
    // than createBrowserClient (SSR) which uses cookies and can miss the session cross-origin
    browserClient = createClient(url, key);
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
