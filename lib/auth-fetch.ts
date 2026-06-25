import { getAuthClient } from "./auth";

// Drop-in replacement for fetch() that automatically attaches the current
// session's Bearer token so Next.js API routes can verify it server-side.
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const { data: { session } } = await getAuthClient().auth.getSession();
  const token = session?.access_token;
  return fetch(url, {
    ...options,
    headers: {
      ...((options.headers as Record<string, string>) ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}
