-- Add role column to user_profiles
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user';

-- Credit grant log (written by admin routes via service role)
CREATE TABLE IF NOT EXISTS admin_credit_grants (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_by   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount       INTEGER NOT NULL CHECK (amount > 0),
  reason       TEXT NOT NULL DEFAULT '',
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE admin_credit_grants ENABLE ROW LEVEL SECURITY;

-- Only service_role (server-side) can touch this table
CREATE POLICY "service role only" ON admin_credit_grants
  FOR ALL TO service_role USING (true);
