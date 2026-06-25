import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

export async function requireAdmin(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<string | null> {
  const token = (req.headers.authorization ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!token) { res.status(401).json({ error: "Unauthorized" }); return null; }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) { res.status(401).json({ error: "Unauthorized" }); return null; }

  const { data: profile } = await admin
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return null; }

  return user.id;
}

export function adminDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
