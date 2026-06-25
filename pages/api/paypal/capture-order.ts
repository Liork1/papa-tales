import type { NextApiRequest, NextApiResponse } from "next";
import { getRequestUser, serviceDb } from "@/lib/api-auth";
import { PACKAGES, PkgId, paypalBase, getPayPalAccessToken } from "@/lib/paypal";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const user = await getRequestUser(req, res);
  if (!user) return;

  const orderId = req.body?.orderId as string;
  if (!orderId) return res.status(400).json({ error: "Missing orderId" });

  const accessToken = await getPayPalAccessToken();

  const captureRes = await fetch(`${paypalBase()}/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${accessToken}`,
    },
  });

  const capture = await captureRes.json();
  if (!captureRes.ok || capture.status !== "COMPLETED") {
    return res.status(402).json({ error: "Payment not completed", details: capture });
  }

  const pkgId = (capture.purchase_units?.[0]?.custom_id ?? "p6") as PkgId;
  const creditsToAdd = PACKAGES[pkgId]?.credits ?? 6;

  const admin = serviceDb();

  const { data: existing } = await admin
    .from("user_credits")
    .select("credits_remaining, total_purchased")
    .eq("user_id", user.id)
    .single();

  const { error: upsertError } = await admin.from("user_credits").upsert({
    user_id: user.id,
    credits_remaining: (existing?.credits_remaining ?? 0) + creditsToAdd,
    total_purchased: (existing?.total_purchased ?? 0) + creditsToAdd,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });

  if (upsertError) {
    console.error("Failed to credit user:", upsertError.message);
    return res.status(500).json({ error: "Failed to apply credits" });
  }

  return res.status(200).json({ credits: creditsToAdd });
}
