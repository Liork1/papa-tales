import type { NextApiRequest, NextApiResponse } from "next";
import { getRequestUser, serviceDb } from "@/lib/api-auth";
import { PLAY_PRODUCTS, PlayProductId } from "@/lib/billing-packages";
import { verifyAndConsumePurchase } from "@/lib/google-play";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const user = await getRequestUser(req, res);
  if (!user) return;

  const productId = req.body?.productId as string;
  const purchaseToken = req.body?.purchaseToken as string;
  if (!productId || !purchaseToken) {
    return res.status(400).json({ error: "Missing productId or purchaseToken" });
  }

  const product = PLAY_PRODUCTS[productId as PlayProductId];
  if (!product) return res.status(400).json({ error: "Unknown product" });

  const packageName = process.env.GOOGLE_PLAY_PACKAGE_NAME;
  if (!packageName) {
    return res.status(500).json({ error: "Server not configured for Play Billing" });
  }

  const admin = serviceDb();

  const { data: existingPurchase } = await admin
    .from("play_billing_purchases")
    .select("purchase_token")
    .eq("purchase_token", purchaseToken)
    .maybeSingle();
  if (existingPurchase) {
    return res.status(200).json({ credits: 0, alreadyProcessed: true });
  }

  const { valid } = await verifyAndConsumePurchase(packageName, productId, purchaseToken);
  if (!valid) return res.status(402).json({ error: "Purchase not verified" });

  const creditsToAdd = product.credits;

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

  const { error: insertError } = await admin.from("play_billing_purchases").insert({
    purchase_token: purchaseToken,
    user_id: user.id,
    product_id: productId,
    credits: creditsToAdd,
  });
  if (insertError) {
    console.error("Failed to log Play Billing purchase:", insertError.message);
  }

  return res.status(200).json({ credits: creditsToAdd });
}
