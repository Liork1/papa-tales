import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import type { ReactNode } from "react";
import { getAuthClient, onAuthChange } from "./auth";
import type { User } from "./auth";

interface UserProfile {
  stories_generated: number;
  role: string;
}

type Tier = "guest" | "free" | "paid";

interface ContextState {
  user: User | null;
  profile: UserProfile | null;
  credits: number;
  ready: boolean;
}

interface UserContextValue {
  user: User | null;
  profile: UserProfile | null;
  credits: number;
  tier: Tier;
  role: string;
  ready: boolean;
  refresh: () => Promise<void>;
}

const UserContext = createContext<UserContextValue>({
  user: null, profile: null, credits: 0,
  tier: "guest", role: "user", ready: false,
  refresh: async () => {},
});

export function useUserContext(): UserContextValue {
  return useContext(UserContext);
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ContextState>({
    user: null, profile: null, credits: 0, ready: false,
  });

  // Track the user id currently being fetched to deduplicate concurrent calls
  const fetchingRef = useRef<string | null>(null);

  const fetchAndApply = useCallback(async (u: User) => {
    const uid = u.id;
    if (fetchingRef.current === uid) return; // already in-flight for this user
    fetchingRef.current = uid;

    const client = getAuthClient();
    const [profileRes, creditsRes] = await Promise.all([
      client.from("user_profiles").select("stories_generated, role").eq("id", uid).maybeSingle(),
      client.from("user_credits").select("credits_remaining").eq("user_id", uid).maybeSingle(),
    ]);

    if (fetchingRef.current !== uid) return; // user changed while we were fetching
    fetchingRef.current = null;

    // Single setState — no intermediate render with partial data
    setState({
      user: u,
      profile: profileRes.data ?? { stories_generated: 0, role: "user" },
      credits: creditsRes.data?.credits_remaining ?? 0,
      ready: true,
    });
  }, []);

  const refresh = useCallback(async () => {
    const { data: { session } } = await getAuthClient().auth.getSession();
    if (!session?.user) return;
    fetchingRef.current = null; // clear dedup so refresh always re-fetches
    await fetchAndApply(session.user);
  }, [fetchAndApply]);

  useEffect(() => {
    const unsub = onAuthChange((event, session) => {
      const u = session?.user ?? null;
      if (!u) {
        fetchingRef.current = null;
        setState({ user: null, profile: null, credits: 0, ready: true });
        return;
      }
      // TOKEN_REFRESHED only rotates the JWT — profile/credits haven't changed
      if (event === "TOKEN_REFRESHED") return;
      fetchAndApply(u);
    });
    return unsub;
  }, [fetchAndApply]);

  const { user, profile, credits, ready } = state;
  const tier: Tier = !user ? "guest" : credits > 0 ? "paid" : "free";
  const role = profile?.role ?? "user";

  return (
    <UserContext.Provider value={{ user, profile, credits, tier, role, ready, refresh }}>
      {children}
    </UserContext.Provider>
  );
}
