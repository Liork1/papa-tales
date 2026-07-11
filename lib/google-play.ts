import { GoogleAuth } from "google-auth-library";

const SCOPES = ["https://www.googleapis.com/auth/androidpublisher"];

let _auth: GoogleAuth | null = null;

function getAuth(): GoogleAuth {
  if (!_auth) {
    const credentials = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON
      ? JSON.parse(process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON)
      : {
          client_email: process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL,
          private_key: process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        };
    _auth = new GoogleAuth({ credentials, scopes: SCOPES });
  }
  return _auth;
}

async function authorizedFetch(url: string, init?: RequestInit): Promise<Response> {
  const client = await getAuth().getClient();
  const { token } = await client.getAccessToken();
  return fetch(url, {
    ...init,
    headers: { ...(init?.headers ?? {}), Authorization: `Bearer ${token}` },
  });
}

// Verifies a purchase token against the Android Publisher API, then consumes it
// (required for consumable in-app products, and prevents auto-refund after 3 days).
export async function verifyAndConsumePurchase(
  packageName: string,
  productId: string,
  purchaseToken: string
): Promise<{ valid: boolean }> {
  const base = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/products/${productId}/tokens/${purchaseToken}`;

  const getRes = await authorizedFetch(base);
  if (!getRes.ok) return { valid: false };

  const purchase = await getRes.json();
  // purchaseState: 0 = purchased, 1 = canceled, 2 = pending
  if (purchase.purchaseState !== 0) return { valid: false };

  const consumeRes = await authorizedFetch(`${base}:consume`, { method: "POST" });
  if (!consumeRes.ok) {
    console.error("Failed to consume Play purchase:", await consumeRes.text());
  }

  return { valid: true };
}
