import type { NextApiRequest, NextApiResponse } from "next";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { PACKAGES, PkgId, paypalBase, getPayPalAccessToken } from "@/lib/paypal";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  // Anon client for auth only
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => Object.entries(req.cookies).map(([name, value]) => ({ name, value: value ?? "" })),
        setAll: (cookies) => cookies.forEach(({ name, value }) => {
          res.setHeader("Set-Cookie", `${name}=${value}; Path=/; HttpOnly; SameSite=Lax`);
        }),
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return res.status(401).json({ error: "Unauthorized" });

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

  // Service role client bypasses RLS — required for INSERT on first purchase
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

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
