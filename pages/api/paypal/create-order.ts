import type { NextApiRequest, NextApiResponse } from "next";
import { getRequestUser } from "@/lib/api-auth";
import { getPackagePrice, PACKAGES, PkgId, paypalBase, getPayPalAccessToken } from "@/lib/paypal";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const user = await getRequestUser(req, res);
  if (!user) return;

  const requestedPkgId = req.body?.pkgId as string | undefined;
  const pkgId: PkgId = requestedPkgId && requestedPkgId in PACKAGES
    ? requestedPkgId as PkgId
    : "p6";
  const pkg = PACKAGES[pkgId];
  const locale = req.body?.locale === "he" ? "he" : "en";
  const price = getPackagePrice(pkg, locale);
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
        amount: { currency_code: price.currencyCode, value: price.amount },
        description: `Papa Tales — ${pkg.credits} סיפורים`,
      }],
      application_context: {
        return_url: `${appUrl}/?payment=success`,
        cancel_url: `${appUrl}/?payment=cancel`,
        brand_name: "Papa Tales",
        locale: locale === "he" ? "he-IL" : "en-US",
        landing_page: "BILLING",
        user_action: "PAY_NOW",
        shipping_preference: "NO_SHIPPING",
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
