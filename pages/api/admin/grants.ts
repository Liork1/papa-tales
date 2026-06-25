import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin, adminDb } from "@/lib/admin-guard";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();
  const adminId = await requireAdmin(req, res);
  if (!adminId) return;

  const db = adminDb();

  const { data: grants, error } = await db
    .from("admin_credit_grants")
    .select("id, recipient_id, granted_by, amount, reason, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return res.status(500).json({ error: error.message });

  const userIds = [...new Set([
    ...(grants ?? []).map((g) => g.recipient_id),
    ...(grants ?? []).map((g) => g.granted_by),
  ])];

  const nameMap: Record<string, string> = {};
  await Promise.all(
    userIds.map(async (id) => {
      const { data } = await db.auth.admin.getUserById(id);
      if (data?.user) {
        nameMap[id] = (data.user.user_metadata?.display_name as string | undefined)
          ?? data.user.email?.split("@")[0]
          ?? id.slice(0, 8);
      }
    })
  );

  const rows = (grants ?? []).map((g) => ({
    id: g.id,
    recipientId: g.recipient_id,
    recipientName: nameMap[g.recipient_id] ?? g.recipient_id.slice(0, 8),
    adminName: nameMap[g.granted_by] ?? g.granted_by.slice(0, 8),
    amount: g.amount,
    reason: g.reason,
    createdAt: g.created_at,
  }));

  return res.status(200).json({ grants: rows });
}
