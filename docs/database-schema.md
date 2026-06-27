# Database Schema — Papa Tales

## Overview

The app uses 6 Supabase tables plus one storage bucket. At a high level:

| Table | Purpose |
|---|---|
| `stories` | Curated seed stories — AI inspiration input only, never shown to users |
| `user_story_library` | Credit-generated user stories — the user-facing library |
| `user_profiles` | Per-user metadata: story count, admin role |
| `user_credits` | Credit balance and purchase totals |
| `user_generated_stories` | Lightweight event log (one row per generation) |
| `admin_credit_grants` | Audit log of manual credit grants by admins |

**The most important distinction:**
- `stories` → **internal reference content** fed to the AI as style inspiration
- `user_story_library` → **actual user output** saved after a credit-based generation

---

## Table Details

### `stories`

**Role:** Read-only reference table. Seeded with curated Hebrew children's stories that the AI uses as style and rhyme-scheme inspiration during generation. End users never interact with this table directly.

**Schema** (migration `20240101`, author column added in `20240103`):

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | auto |
| `title` | VARCHAR(255) | |
| `content` | TEXT | full story text |
| `author` | VARCHAR(255) | nullable |
| `theme` | VARCHAR(50) | e.g. `learning`, `adventure` |
| `age_group` | VARCHAR(20) | e.g. `4-6` |
| `keywords` | TEXT[] | tag array |
| `rhyme_scheme` | VARCHAR(20) | e.g. `AABB`, `ABAB` |
| `language` | VARCHAR(5) | default `he` |
| `word_count` | INTEGER | |
| `created_at` | TIMESTAMP | |
| `updated_at` | TIMESTAMP | |

**RLS:** Disabled — open `SELECT` to `anon` and `authenticated`.

**Indexes:** `theme`, `age_group`, `language`.

**Who writes:**
- `supabase/seed.sql` — initial seed (truncates and re-inserts)
- `scripts/sql/insert-troputi.sql` — one-off admin insert

**Who reads:**
- `lib/supabase.ts` → `getStories()`, `getRandomStories()`
- `lib/stories.ts` → `getContextualStories()`, `buildInspirationContext()` — selects up to 20 stories matching the user's theme/age, ranks by keyword overlap, and injects them as example context into the AI prompt
- `pages/api/generate-story.ts` line 157 — calls `getContextualStories()` before every generation

---

### `user_story_library`

**Role:** Persists the full output of a credit-based story generation — pages text, illustrated descriptions, and Storage image paths. This is the user-facing "My Library" view.

**Schema** (migration `20240104`):

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | auto |
| `user_id` | UUID FK → `auth.users` | ON DELETE CASCADE |
| `title` | TEXT | |
| `author_name` | TEXT | default `''` |
| `pages` | JSONB | `{ "1": "page text", "2": "...", ... }` |
| `rhyme_scheme` | VARCHAR(20) | |
| `word_count` | INTEGER | |
| `illustrated_story` | JSONB | `{ "cover": "image prompt", "1": "...", ... }` — AI-generated image descriptions |
| `image_paths` | JSONB | `{ "cover": "uid/filename.webp", "1": "...", ... }` — Storage paths |
| `age_group` | VARCHAR(20) | default `4-6` |
| `prompt` | TEXT | original user prompt |
| `used_credit` | BOOLEAN | always `true` for saved stories |
| `created_at` | TIMESTAMP WITH TIME ZONE | |

**RLS:** Enabled — users can only `SELECT / INSERT / UPDATE / DELETE` their own rows (`auth.uid() = user_id`).

**Index:** `user_id`.

**Storage:** Image files live in the private `story-images` bucket at paths `{user_id}/{filename}.webp`. Signed URLs (1 h TTL) are generated at read time.

**Who writes:**
- `pages/api/stories/save.ts` — called from the client after a successful credit generation; inserts one row per story

**Who reads:**
- `pages/api/stories/library.ts` — fetches all stories for the logged-in user, resolves signed URLs, returns `LibraryStory[]` to the client library view
- `lib/image-reuse.ts` — scans the last 1,000 cover image prompts + paths to find a visually similar existing image to reuse (skips re-generating if confidence > 85%)
- `pages/api/admin/stats.ts` — reads `age_group` for distribution chart
- `pages/api/admin/recompress-images.ts` — admin maintenance: re-downloads and recompresses stored images

---

### `user_profiles`

**Role:** Tracks per-user application state that isn't in Supabase Auth: how many free stories were generated, and the admin role flag.

**Schema** (migration `20240102`, role column added in `20240105`):

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK FK → `auth.users` | ON DELETE CASCADE |
| `stories_generated` | INTEGER | free-tier story counter |
| `role` | VARCHAR(20) | `'user'` (default) or `'admin'` |
| `created_at` | TIMESTAMP WITH TIME ZONE | |

**RLS:** Enabled — users access only their own row.

**Auto-created:** `handle_new_user()` trigger inserts a row with defaults on every `auth.users` insert.

**Who writes:**
- `pages/api/generate-story.ts` — increments `stories_generated` after a free/basic generation

**Who reads:**
- `lib/user-context.tsx` — `UserProvider` fetches `stories_generated` + `role` on sign-in to populate context
- `lib/admin-guard.ts` — `requireAdmin()` reads `role` to verify the request comes from an admin
- `pages/api/generate-story.ts` — reads `stories_generated` to enforce the free-tier 5-story limit
- `pages/api/admin/stats.ts` — used for total story counts, plan-mix breakdown
- `pages/api/admin/users.ts` — populates the admin user table

---

### `user_credits`

**Role:** Tracks the user's current credit balance and purchase history.

**Schema** (migration `20240102`):

| Column | Type | Notes |
|---|---|---|
| `user_id` | UUID PK FK → `auth.users` | ON DELETE CASCADE |
| `credits_remaining` | INTEGER | current spendable balance |
| `total_purchased` | INTEGER | lifetime purchase total |
| `updated_at` | TIMESTAMP WITH TIME ZONE | |

**RLS:** Enabled — users access only their own row.

**Auto-created:** `handle_new_user()` trigger inserts a row with `credits_remaining = 0` on sign-up.

**Who writes:**
- `pages/api/generate-story.ts` — decrements `credits_remaining` by 1 when a credit story is generated
- `pages/api/paypal/capture-order.ts` — upserts `credits_remaining` and `total_purchased` after a successful PayPal payment
- `pages/api/admin/grant-credits.ts` — admin endpoint to manually add credits

**Who reads:**
- `lib/user-context.tsx` — fetches `credits_remaining` on sign-in to determine tier (`paid` vs `free`)
- `pages/api/generate-story.ts` — checks balance before allowing a credit generation
- `pages/api/admin/stats.ts` — used for plan-mix breakdown
- `pages/api/admin/users.ts` — shown in admin user table

---

### `user_generated_stories`

**Role:** Lightweight event log — one row per story generation attempt. Does **not** store story content; that lives in `user_story_library`. Used for 30-day trend analytics in the admin dashboard.

**Schema** (migration `20240102`):

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | auto |
| `user_id` | UUID FK → `auth.users` | nullable (guests have no user_id); ON DELETE SET NULL |
| `used_credit` | BOOLEAN | `true` = credit story, `false` = free/basic |
| `prompt` | TEXT | user's original prompt |
| `title` | TEXT | generated story title |
| `created_at` | TIMESTAMP WITH TIME ZONE | |

**RLS:** Enabled — users see only their own rows.

**Who writes:**
- `pages/api/generate-story.ts` — inserts one row after every successful generation (both free and credit)

**Who reads:**
- `pages/api/admin/stats.ts` — queries the last 30 days for the daily trend chart (segmented into guest / free / credits)

---

### `admin_credit_grants`

**Role:** Audit log of every manual credit grant made via the admin panel. Readable only by the service role (server-side).

**Schema** (migration `20240105`):

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | auto |
| `recipient_id` | UUID FK → `auth.users` | ON DELETE CASCADE |
| `granted_by` | UUID FK → `auth.users` | the admin who granted |
| `amount` | INTEGER | must be > 0 |
| `reason` | TEXT | admin note |
| `created_at` | TIMESTAMP WITH TIME ZONE | |

**RLS:** Enabled — `service_role` only (no end-user access).

**Who writes:**
- `pages/api/admin/grant-credits.ts` — inserts a log row alongside the `user_credits` upsert

**Who reads:**
- `pages/api/admin/grants.ts` — returns the full grant log to the admin dashboard
- `pages/api/admin/stats.ts` — sums `amount` for the "credits granted" stat card

---

## Storage Bucket: `story-images`

**Private bucket** — files are not publicly accessible.

**Path convention:** `{user_id}/{uuid}.webp`

**RLS policies:**
- `authenticated` users can INSERT/SELECT only files under their own `user_id` folder
- `service_role` has full access

**Who writes:**
- `pages/api/generate-image.ts` — uploads generated images after each page illustration

**Who reads:**
- `pages/api/stories/library.ts` — calls `createSignedUrl()` (1 h TTL) for every image path stored in `user_story_library.image_paths`
- `lib/image-reuse.ts` — calls `storage.download()` to retrieve a matched image for reuse

---

## Data Flow Summary

```
User submits prompt
       │
       ▼
generate-story.ts
  ├── reads  user_profiles         (free-story limit check)
  ├── reads  user_credits          (balance check)
  ├── reads  stories               (AI inspiration context)
  ├── writes user_generated_stories (event log)
  └── writes user_credits          (decrement if credit used)
       │
       ▼ (client triggers save after reading the story)
stories/save.ts
  └── writes user_story_library    (full story + image paths)

User opens library
       │
       ▼
stories/library.ts
  ├── reads  user_story_library
  └── reads  story-images bucket   (signed URLs)

Admin dashboard
       │
       ├── reads user_profiles, user_credits, user_generated_stories, admin_credit_grants
       └── reads user_story_library (age group distribution only)
```
