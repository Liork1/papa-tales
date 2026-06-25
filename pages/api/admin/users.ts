import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin, adminDb } from "@/lib/admin-guard";

export interface AdminUser {
  id: string;
  email: string;
  displayName: string;
  plan: "credits" | "free" | "guest";
  credits: number;
  stories: number;
  createdAt: string;
  lastSignIn: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();
  const adminId = await requireAdmin(req, res);
  if (!adminId) return;

  const db = adminDb();
  const q = (req.query.q as string | undefined)?.toLowerCase() ?? "";

  const [authRes, profilesRes, creditsRes] = await Promise.all([
    db.auth.admin.listUsers({ perPage: 1000 }),
    db.from("user_profiles").select("id, stories_generated"),
    db.from("user_credits").select("user_id, credits_remaining"),
  ]);

  const profileMap = new Map((profilesRes.data ?? []).map((p) => [p.id, p.stories_generated as number]));
  const creditsMap = new Map((creditsRes.data ?? []).map((c) => [c.user_id, c.credits_remaining as number]));

  let users: AdminUser[] = (authRes.data?.users ?? []).map((u) => {
    const stories = profileMap.get(u.id) ?? 0;
    const credits = creditsMap.get(u.id) ?? 0;
    const hasProfile = profileMap.has(u.id);
    const plan: AdminUser["plan"] = !hasProfile ? "guest" : credits > 0 ? "credits" : "free";
    const displayName = (u.user_metadata?.display_name as string | undefined) ?? u.email?.split("@")[0] ?? "User";
    return {
      id: u.id,
      email: u.email ?? "",
      displayName,
      plan,
      credits,
      stories,
      createdAt: u.created_at,
      lastSignIn: u.last_sign_in_at ?? u.created_at,
    };
  });

  if (q) {
    users = users.filter(
      (u) => u.email.toLowerCase().includes(q) || u.displayName.toLowerCase().includes(q)
    );
  }

  users.sort((a, b) => new Date(b.lastSignIn).getTime() - new Date(a.lastSignIn).getTime());

  return res.status(200).json({ users });
}
