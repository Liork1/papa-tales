-- User story library: persists credit-generated stories with image paths
CREATE TABLE user_story_library (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  author_name     TEXT NOT NULL DEFAULT '',
  pages           JSONB NOT NULL DEFAULT '{}',
  rhyme_scheme    VARCHAR(20),
  word_count      INTEGER DEFAULT 0,
  illustrated_story JSONB NOT NULL DEFAULT '{}',
  image_paths     JSONB NOT NULL DEFAULT '{}',
  age_group       VARCHAR(20) DEFAULT '4-6',
  prompt          TEXT NOT NULL DEFAULT '',
  used_credit     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_story_library_user_id ON user_story_library(user_id);

ALTER TABLE user_story_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own library" ON user_story_library
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON user_story_library TO authenticated, service_role;

-- Supabase Storage bucket for story images (private, user-scoped)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'story-images',
  'story-images',
  false,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "users upload own story images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'story-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "users read own story images" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'story-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "service role full access to story images" ON storage.objects
  FOR ALL TO service_role
  USING (bucket_id = 'story-images');
