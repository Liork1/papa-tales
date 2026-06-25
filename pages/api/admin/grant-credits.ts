import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin, adminDb } from "@/lib/admin-guard";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  const adminId = await requireAdmin(req, res);
  if (!adminId) return;

  const { userId, amount, reason } = req.body as { userId: string; amount: number; reason: string };
  if (!userId || !amount || amount < 1) return res.status(400).json({ error: "Invalid request" });

  const db = adminDb();

  const { data: existing } = await db
    .from("user_credits")
    .select("credits_remaining, total_purchased")
    .eq("user_id", userId)
    .single();

  const { error: upsertErr } = await db.from("user_credits").upsert({
    user_id: userId,
    credits_remaining: (existing?.credits_remaining ?? 0) + amount,
    total_purchased: (existing?.total_purchased ?? 0) + amount,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });

  if (upsertErr) return res.status(500).json({ error: upsertErr.message });

  await db.from("admin_credit_grants").insert({
    recipient_id: userId,
    granted_by: adminId,
    amount,
    reason: reason?.trim() || "No reason provided",
  });

  return res.status(200).json({ ok: true });
}
