import { getAuthClient } from "./auth";

// Drop-in replacement for fetch() that automatically attaches the current
// session's Bearer token so Next.js API routes can verify it server-side.
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const client = getAuthClient();
  let { data: { session } } = await client.auth.getSession();

  // If the token expires within 60 s, refresh proactively so the server
  // doesn't receive an already-expired JWT.
  if (session?.expires_at && session.expires_at - Math.floor(Date.now() / 1000) < 60) {
    const { data } = await client.auth.refreshSession();
    session = data.session;
  }

  const token = session?.access_token;
  return fetch(url, {
    ...options,
    headers: {
      ...((options.headers as Record<string, string>) ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}
