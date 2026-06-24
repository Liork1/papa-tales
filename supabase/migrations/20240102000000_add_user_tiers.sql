-- User profile tied to auth.users (tracks free story count)
CREATE TABLE user_profiles (
  id                UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  stories_generated INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Credit balance per user
CREATE TABLE user_credits (
  user_id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  credits_remaining INTEGER NOT NULL DEFAULT 0,
  total_purchased   INTEGER NOT NULL DEFAULT 0,
  updated_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Per-story record to track which stories used a credit (for audio gating)
CREATE TABLE user_generated_stories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  used_credit BOOLEAN NOT NULL DEFAULT FALSE,
  prompt      TEXT NOT NULL,
  title       TEXT,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row-level security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_generated_stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own profile" ON user_profiles
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "own credits" ON user_credits
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "own stories" ON user_generated_stories
  FOR ALL USING (auth.uid() = user_id);

-- Auto-create user_profile + user_credits rows on first sign-up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO user_profiles (id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  INSERT INTO user_credits (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
