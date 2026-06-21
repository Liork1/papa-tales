# Papa Tales

AI-powered Hebrew children's story generator. Generates rhyming stories using Claude Opus with inspirational story seeds from a local Supabase database.

## Prerequisites

- Node.js 18+
- [Supabase CLI](https://supabase.com/docs/guides/cli) (`brew install supabase/tap/supabase`)
- Anthropic API key

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

Copy `.env` and fill in your keys, or create `.env.local`:

```env
ANTHROPIC_API_KEY=sk-ant-...
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=<see step 3>
```

### 3. Start local Supabase

```bash
npm run supabase:start
```

This prints the `anon key` — copy it into `SUPABASE_ANON_KEY`.

### 4. Run migrations

```bash
supabase db reset
```

This applies `supabase/migrations/20240101000000_create_stories_table.sql`.

### 5. Seed the database

```bash
npm run seed
```

Inserts 12 Hebrew inspirational stories covering friendship, courage, creativity, and more.

### 6. Start the dev server

```bash
npm run dev
```

App runs at `http://localhost:3000`.

## API

### `POST /api/generate-story`

Generate a Hebrew children's story.

**Request body:**
```json
{
  "prompt": "סיפור על ילד שמצא חברים חדשים",
  "ageGroup": "4-6",
  "theme": "friendship"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `prompt` | string | Yes | Hebrew story prompt (10–500 chars) |
| `ageGroup` | `"2-4"` \| `"4-6"` \| `"6-8"` \| `"8-10"` | No | Target age group |
| `theme` | string | No | Filter inspirational stories by theme |
| `maxLength` | number | No | Approximate word count |

**Response:**
```json
{
  "success": true,
  "data": {
    "story": "...",
    "title": "כותרת הסיפור",
    "rhymeScheme": "AABB",
    "wordCount": 620,
    "generatedAt": "2026-06-21T10:00:00Z",
    "inspiration": ["friendship", "adventure"]
  }
}
```

### `GET /api/health`

Returns `{ "status": "ok", "service": "papa-tales" }`.

## Project Structure

```
pages/
  api/
    generate-story.ts   # Main generation endpoint
    health.ts
  index.tsx
lib/
  claude.ts             # Claude API client + story generation
  supabase.ts           # Supabase client + DB queries
  stories.ts            # Story fetching and context building
  i18n.ts               # Hebrew translations helper
types/
  stories.ts
  api.ts
locales/
  he.json               # Hebrew error messages
scripts/
  seed.ts               # DB seed script
supabase/
  config.toml
  migrations/
    20240101000000_create_stories_table.sql
```
