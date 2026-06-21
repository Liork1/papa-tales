-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE stories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  theme VARCHAR(50),
  age_group VARCHAR(20),
  keywords TEXT[] DEFAULT '{}',
  rhyme_scheme VARCHAR(20),
  language VARCHAR(5) DEFAULT 'he',
  word_count INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_stories_theme ON stories(theme);
CREATE INDEX idx_stories_age_group ON stories(age_group);
CREATE INDEX idx_stories_language ON stories(language);

-- Allow the API (anon/authenticated) to read stories
GRANT SELECT ON TABLE stories TO anon, authenticated;

-- Allow the service role full access (used by seed script and admin ops)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE stories TO service_role;
