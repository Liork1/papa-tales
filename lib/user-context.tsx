import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { ReactNode } from "react";
import { getAuthClient, onAuthChange } from "./auth";
import type { User } from "./auth";

interface UserProfile {
  stories_generated: number;
}

type Tier = "guest" | "free" | "paid";

interface UserContextValue {
  user: User | null;
  profile: UserProfile | null;
  credits: number;
  tier: Tier;
  refresh: () => Promise<void>;
}

const UserContext = createContext<UserContextValue>({
  user: null,
  profile: null,
  credits: 0,
  tier: "guest",
  refresh: async () => {},
});

export function useUserContext(): UserContextValue {
  return useContext(UserContext);
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [credits, setCredits] = useState(0);

  const fetchUserData = useCallback(async (uid: string) => {
    const client = getAuthClient();
    const [profileRes, creditsRes] = await Promise.all([
      client.from("user_profiles").select("stories_generated").eq("id", uid).single(),
      client.from("user_credits").select("credits_remaining").eq("user_id", uid).single(),
    ]);
    setProfile(profileRes.data ?? { stories_generated: 0 });
    setCredits(creditsRes.data?.credits_remaining ?? 0);
  }, []);

  const refresh = useCallback(async () => {
    if (!user) return;
    await fetchUserData(user.id);
  }, [user, fetchUserData]);

  useEffect(() => {
    // Load initial session
    const client = getAuthClient();
    client.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null;
      setUser(u);
      if (u) fetchUserData(u.id);
    });

    // Subscribe to auth changes
    const unsub = onAuthChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        fetchUserData(u.id);
      } else {
        setProfile(null);
        setCredits(0);
      }
    });

    return unsub;
  }, [fetchUserData]);

  const tier: Tier = !user ? "guest" : credits > 0 ? "paid" : "free";

  return (
    <UserContext.Provider value={{ user, profile, credits, tier, refresh }}>
      {children}
    </UserContext.Provider>
  );
}
