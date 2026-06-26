# Plan: Bit (ביט) Payment Integration

## Context
The app currently shows `alert("תשלום בביט יהיה זמין בקרוב!")` when a user selects Bit. The UI (radio button, label, timing note) is already fully built in `components/UpgradeModal.tsx`. This plan completes the wiring.

**Key architectural difference from PayPal:**
- PayPal = redirect → user pays on PayPal.com → redirects back → server captures
- Bit = user stays on page → app opens on phone → **async webhook** confirms payment → client polls for result

There is no "capture" step after a redirect. The flow is: create payment request → show QR code + deep link → wait for webhook → poll for status.

---

## What you need to do from the Bit side (before any code runs)

### Step 1 — Register as a Bit Business merchant
Go to [bit.co.il](https://www.bit.co.il) and look for **"ביט לעסקים"** or **"ביט API"**.
- Individual freelancers (עצמאי) can register, not only חברות
- You'll need: Israeli ID / business number, bank account details, business description
- Registration and approval takes a few business days

### Step 2 — Get API credentials from the Bit dashboard
Once approved, the dashboard gives you:

| Variable | What it is |
|----------|------------|
| `BIT_MERCHANT_ID` | Your merchant ID |
| `BIT_API_KEY` | API key for creating payment requests |
| `BIT_API_SECRET` | Secret for signing requests |
| `BIT_WEBHOOK_SECRET` | Secret to verify webhook signatures |

### Step 3 — Register your webhook URL in the Bit dashboard
Point it at: `https://papa-tales.com/api/bit/webhook`
(Use a tunnel like [ngrok](https://ngrok.com) for local testing)

### Step 4 — Note the actual API endpoints from Bit's developer docs
The plan uses placeholder names below. Check Bit's official docs for exact endpoint paths and authentication scheme:
- Create payment request: likely `POST /payment-requests`
- Auth: likely `Authorization: Bearer <BIT_API_KEY>` or HMAC-signed headers

---

## New DB migration

```sql
-- supabase/migrations/YYYYMMDD_bit_pending_payments.sql
CREATE TABLE bit_pending_payments (
  id           TEXT PRIMARY KEY,          -- Bit's paymentId
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pkg_id       TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending',  -- pending | paid | expired
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
ALTER TABLE bit_pending_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own payments" ON bit_pending_payments
  FOR SELECT USING (auth.uid() = user_id);
```

---

## New file: `lib/bit.ts`

```typescript
export function bitBase(): string {
  return process.env.BIT_MODE === "live"
    ? "https://api.bit.co.il"           // verify exact URL from Bit docs
    : "https://sandbox.api.bit.co.il";  // verify sandbox URL from Bit docs
}

export async function createBitPayment(
  pkgId: string,
  amount: string,
  userId: string
): Promise<{ paymentId: string; paymentUrl: string }> {
  const res = await fetch(`${bitBase()}/payment-requests`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.BIT_API_KEY}`,
      "X-Merchant-Id": process.env.BIT_MERCHANT_ID!,
    },
    body: JSON.stringify({
      amount: parseFloat(amount),
      currency: "ILS",
      merchantReference: pkgId,
      description: `Papa Tales — חבילת ${pkgId}`,
    }),
  });
  if (!res.ok) throw new Error(`Bit API error: ${res.status}`);
  const data = await res.json();
  return { paymentId: data.paymentId, paymentUrl: data.paymentUrl };
}
```

> ⚠️ Fill in exact endpoint, auth headers, and response field names from Bit's official docs once you have access.

---

## New API routes

### `pages/api/bit/create-payment.ts`
- Auth via `getRequestUser`
- Extract `pkgId` from body, look up `PACKAGES[pkgId]`
- Call `createBitPayment(pkgId, pkg.amountILS, user.id)`
- Store row in `bit_pending_payments` with status `"pending"`
- Return `{ paymentId, paymentUrl }`

### `pages/api/bit/webhook.ts`
- Verify Bit's webhook signature using `BIT_WEBHOOK_SECRET`
- Extract `paymentId`, `status`, `merchantReference` (= pkgId) from payload
- If `status === "PAID"` (verify exact string from Bit docs):
  1. Look up `bit_pending_payments` by `paymentId` to get `user_id` and `pkg_id`
  2. Grant credits (same upsert logic as `capture-order.ts`)
  3. Update `bit_pending_payments.status = "paid"`, set `completed_at`
- Return `200` immediately (Bit expects fast acknowledgment)

### `pages/api/bit/check-status.ts`
- `GET /api/bit/check-status?paymentId=...`
- Auth via `getRequestUser`
- Query `bit_pending_payments` where `id = paymentId AND user_id = user.id`
- Return `{ status: "pending" | "paid" | "expired" }`

---

## Modified: `components/UpgradeModal.tsx`

Replace the `alert` in `handlePurchase` with the Bit flow:

```typescript
if (payMethod === "bit") {
  setLoading(true);
  const res = await authFetch("/api/bit/create-payment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pkgId: selectedPkg }),
  });
  const data = await res.json();
  if (!data.paymentUrl) { alert("שגיאה, נסו שוב"); setLoading(false); return; }
  setBitPaymentId(data.paymentId);
  setBitPaymentUrl(data.paymentUrl);
  setLoading(false);
  return;
}
```

Add a `BitPendingView` shown when `bitPaymentId` is set:
- Deep link button: `<a href={bitPaymentUrl}>פתחו את ביט ›</a>` (opens Bit app on mobile)
- QR code of `bitPaymentUrl` for desktop — use `qrcode` npm package as a data URI `<img>`
- Spinner + "ממתינים לאישור ביט..."
- Polls `/api/bit/check-status?paymentId=...` every 3 seconds
- On `status === "paid"` → `onClose()`, show SuccessModal, `refresh()`
- Timeout after 10 minutes → show error "הבקשה פגה, נסו שנית"

New state:
```typescript
const [bitPaymentId, setBitPaymentId] = useState<string | null>(null);
const [bitPaymentUrl, setBitPaymentUrl] = useState<string | null>(null);
```

---

## ILS amounts
Bit operates in ILS (₪), not USD. Add `amountILS` to `PACKAGES` in `lib/paypal.ts`:

```typescript
{ id: "p3",  stories: 3,  price: 3, amountILS: "11.00", ... }
{ id: "p6",  stories: 6,  price: 5, amountILS: "19.00", ... }
{ id: "p12", stories: 12, price: 8, amountILS: "30.00", ... }
```

Adjust ILS values once you confirm exchange rate with Bit.

---

## New dependencies
```bash
npm install qrcode
npm install --save-dev @types/qrcode
```

---

## Verification
1. Register with Bit Business, get credentials, add to `.env`
2. Run `ngrok http 3000`, register the ngrok URL as webhook in Bit dashboard
3. Select Bit in the modal → `BitPendingView` appears with QR + deep link
4. Open deep link on phone → Bit app opens → complete payment
5. Webhook fires → `bit_pending_payments.status = "paid"` → modal closes, SuccessModal appears
6. Check `user_credits` in Supabase Studio — credits added correctly
