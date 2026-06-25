import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";

// Singleton service-role client for server-side DB operations.
// Typed as `any` so callers aren't blocked by missing Supabase schema types.
let _admin: ReturnType<typeof createClient> | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function serviceDb(): any {
  if (!_admin) {
    _admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _admin;
}

// Verify a Bearer token from the Authorization header and return the user.
// Calls res.status(401) and returns null if missing or invalid.
export async function getRequestUser(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<User | null> {
  const token = (req.headers.authorization ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!token) { res.status(401).json({ error: "Unauthorized" }); return null; }
  const { data: { user }, error } = await serviceDb().auth.getUser(token);
  if (error || !user) { res.status(401).json({ error: "Unauthorized" }); return null; }
  return user;
}
