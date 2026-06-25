import type { NextApiRequest, NextApiResponse } from "next";
import { getRequestUser } from "@/lib/api-auth";
import { PACKAGES, PkgId, paypalBase, getPayPalAccessToken } from "@/lib/paypal";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const user = await getRequestUser(req, res);
  if (!user) return;

  const pkgId = ((req.body?.pkgId as string) ?? "p6") as PkgId;
  const pkg = PACKAGES[pkgId] ?? PACKAGES.p6;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const accessToken = await getPayPalAccessToken();

  const orderRes = await fetch(`${paypalBase()}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [{
        custom_id: pkgId,
        amount: { currency_code: "USD", value: pkg.amount },
        description: `Papa Tales — ${pkg.credits} סיפורים`,
      }],
      application_context: {
        return_url: `${appUrl}/?payment=success`,
        cancel_url: `${appUrl}/?payment=cancel`,
        brand_name: "Papa Tales",
        locale: "he-IL",
        landing_page: "BILLING",
        user_action: "PAY_NOW",
      },
    }),
  });

  const order = await orderRes.json();
  if (!orderRes.ok) {
    return res.status(500).json({ error: order.message ?? "PayPal error" });
  }

  const approveLink = (order.links as Array<{ rel: string; href: string }>)
    ?.find((l) => l.rel === "approve");
  if (!approveLink) return res.status(500).json({ error: "No approve link from PayPal" });

  return res.status(200).json({ approveUrl: approveLink.href });
}
