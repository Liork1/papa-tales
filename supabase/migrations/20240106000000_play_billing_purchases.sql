-- Google Play Billing purchase log (idempotency + audit trail for consumed purchase tokens)
CREATE TABLE IF NOT EXISTS play_billing_purchases (
  purchase_token TEXT PRIMARY KEY,
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id     TEXT NOT NULL,
  credits        INTEGER NOT NULL CHECK (credits > 0),
  status         VARCHAR(20) NOT NULL DEFAULT 'consumed',
  created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE play_billing_purchases ENABLE ROW LEVEL SECURITY;

-- Only service_role (server-side verify-purchase route) can touch this table
CREATE POLICY "service role only" ON play_billing_purchases
  FOR ALL TO service_role USING (true);
