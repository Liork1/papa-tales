# Papa Tales

AI-powered Hebrew children's story generator. Generates rhyming stories using OpenRouter with inspirational story seeds from a local Supabase database.

## Prerequisites

- Node.js 18+
- [Supabase CLI](https://supabase.com/docs/guides/cli) (`brew install supabase/tap/supabase`)
- OpenRouter API key

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

Copy `.env` and fill in your keys, or create `.env.local`:

```env
OPENROUTER_API_KEY=your-openrouter-api-key
OPENROUTER_MODEL=google/gemini-2.5-flash-lite
OPENROUTER_SITE_URL=http://localhost:3000
OPENROUTER_APP_NAME=Papa Tales
AI_REQUEST_TIMEOUT_MS=120000
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=<see step 3>
```

Change `OPENROUTER_MODEL` to switch providers, for example `google/gemini-2.5-pro`, `google/gemini-2.5-flash-lite`, `openai/o3-pro`, or any other model slug available in OpenRouter.

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
  ai.ts                 # OpenRouter AI client + story generation
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

## Publishing & Deployment

### Web (Vercel)
Every merge to `main` automatically deploys to Vercel. No extra steps needed.

### Google Play Store (Android)

Papa Tales is published to Google Play as a **Trusted Web Activity (TWA)**: a thin Android shell that renders `papa-tales.vercel.app` in full-screen Chrome. This means **most updates require no Play Store action at all**.

#### When Vercel deployment is enough (most changes)
UI changes, new features, bug fixes, content updates — just merge your PR. Android users get the new version automatically on next app open.

#### When you need a new Play Store release
Only required if you change the Android shell itself:
- Production domain changes (e.g. moving to a custom domain)
- `scope` or `start_url` changed in `public/manifest.webmanifest`
- Package name changed (`com.papa_tales.twa`)
- New Android permissions needed
- Enabling Google Play Billing support (one-time — see below)

#### Google Play Billing (in-app credit purchases)

Google Play policy requires in-app digital purchases to go through Google Play Billing, not PayPal. The app detects at runtime whether it's running inside the Play-installed TWA (via the browser's Digital Goods API, only present in that context) and shows Play Billing there instead of PayPal — see `lib/play-billing.ts` and `components/UpgradeModal.tsx`.

Server-side purchase verification (`lib/google-play.ts`, `pages/api/play-billing/verify-purchase.ts`) needs these env vars, from a Google Cloud service account granted "Manage orders and subscriptions" access in Play Console → Setup → API access:

```env
GOOGLE_PLAY_PACKAGE_NAME=com.papa_tales.twa
GOOGLE_PLAY_SERVICE_ACCOUNT_JSON=<the full service account key JSON, as one line>
```

The three credit packs (`p3`/`p6`/`p12`) must also exist as in-app products in Play Console → Monetize → Products → In-app products, with product IDs `credits_3`, `credits_6`, `credits_12` (see `lib/billing-packages.ts`).

When regenerating the Android package via PWABuilder, make sure Play Billing support is enabled in the Android package options so the generated app includes the `com.android.vending.BILLING` permission and Play Billing bridge — without this, the Digital Goods API won't be available inside the app and it'll silently fall back to PayPal.

**To cut a new release:**
1. Go to [pwabuilder.com](https://pwabuilder.com), enter the production URL
2. Click Build My PWA → Android, bump the version number
3. Download the new `.aab` and the keystore `.jks` (keep the same keystore — losing it means you can't update the app)
4. Upload the new AAB in Play Console → Production → Create new release
5. If the domain changed: update `public/.well-known/assetlinks.json` with the new SHA-256 fingerprint from Play Console → App signing, deploy, and verify

#### Digital Asset Links
The file `public/.well-known/assetlinks.json` links the domain to the Android app. It must stay deployed and accessible at:
```
https://papa-tales.vercel.app/.well-known/assetlinks.json
```
Do not delete or move this file — it keeps the app in full-screen mode (without the Chrome address bar).
