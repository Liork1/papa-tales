import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin, adminDb } from "@/lib/admin-guard";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();
  const adminId = await requireAdmin(req, res);
  if (!adminId) return;

  const db = adminDb();

  const [usersRes, storiesRes, creditsGrantedRes, trendRes] = await Promise.all([
    db.auth.admin.listUsers({ perPage: 1000 }),
    db.from("user_profiles").select("stories_generated, role"),
    db.from("admin_credit_grants").select("amount"),
    db.from("user_generated_stories")
      .select("created_at")
      .gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString()),
  ]);

  const allUsers = usersRes.data?.users ?? [];
  const profiles = storiesRes.data ?? [];

  const totalUsers = allUsers.length;
  const totalStories = profiles.reduce((s, p) => s + (p.stories_generated ?? 0), 0);
  const creditsGranted = (creditsGrantedRes.data ?? []).reduce((s, g) => s + g.amount, 0);

  const oneWeekAgo = new Date(Date.now() - 7 * 86400000);
  const activeThisWeek = allUsers.filter((u) =>
    u.last_sign_in_at && new Date(u.last_sign_in_at) >= oneWeekAgo
  ).length;

  // 30-day daily story trend
  const trend = Array(30).fill(0);
  for (const row of trendRes.data ?? []) {
    const daysAgo = Math.floor((Date.now() - new Date(row.created_at).getTime()) / 86400000);
    if (daysAgo >= 0 && daysAgo < 30) trend[29 - daysAgo]++;
  }

  // Plan mix: users with credits vs free vs guest (no user_profiles row)
  const profileIds = new Set(profiles.map((_, i) => i)); // placeholder
  const creditsRes = await db.from("user_credits").select("user_id, credits_remaining");
  const creditsMap = new Map((creditsRes.data ?? []).map((r) => [r.user_id, r.credits_remaining]));
  const profileMap = new Map((profiles as Array<{ stories_generated: number; role: string } & { id?: string }>).map((p, _) => [p, p]));

  const profilesWithIds = await db.from("user_profiles").select("id, stories_generated, role");
  const profilesById = new Map((profilesWithIds.data ?? []).map((p) => [p.id, p]));

  let guestCount = 0, freeCount = 0, creditsCount = 0;
  for (const u of allUsers) {
    const hasProfile = profilesById.has(u.id);
    const credits = creditsMap.get(u.id) ?? 0;
    if (!hasProfile) guestCount++;
    else if (credits > 0) creditsCount++;
    else freeCount++;
  }
  const total = guestCount + freeCount + creditsCount || 1;

  // Age group distribution from user_generated_stories (use equal split as fallback)
  const ageRows = await db.from("user_story_library").select("age_group");
  const ageCounts: Record<string, number> = { "2-4": 0, "4-6": 0, "6-8": 0, "8-10": 0 };
  for (const r of ageRows.data ?? []) {
    const k = r.age_group as string;
    if (k in ageCounts) ageCounts[k]++;
  }
  const ageTotal = Object.values(ageCounts).reduce((s, v) => s + v, 0) || 1;
  const ageGroups = Object.fromEntries(
    Object.entries(ageCounts).map(([k, v]) => [k, Math.round((v / ageTotal) * 100)])
  );

  return res.status(200).json({
    totalUsers,
    totalStories,
    activeThisWeek,
    creditsGranted,
    trend,
    ageGroups,
    planMix: {
      guest: Math.round((guestCount / total) * 100),
      free: Math.round((freeCount / total) * 100),
      credits: Math.round((creditsCount / total) * 100),
    },
  });
}
