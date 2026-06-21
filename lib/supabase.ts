import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Story } from "@/types/stories";

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY;
    if (!url || !key) {
      throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY");
    }
    client = createClient(url, key);
  }
  return client;
}

interface StoryFilters {
  theme?: string;
  ageGroup?: string;
  limit?: number;
}

function mapRow(row: Record<string, unknown>): Story {
  return {
    id: row.id as string,
    title: row.title as string,
    content: row.content as string,
    theme: row.theme as string | undefined,
    ageGroup: row.age_group as string | undefined,
    keywords: (row.keywords as string[]) ?? [],
    rhymeScheme: row.rhyme_scheme as string | undefined,
    language: (row.language as string) ?? "he",
    wordCount: row.word_count as number | undefined,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}

export async function getStories(filters: StoryFilters = {}): Promise<Story[]> {
  const db = getSupabaseClient();
  const { theme, ageGroup, limit = 10 } = filters;

  let query = db.from("stories").select("*").eq("language", "he").limit(limit);

  if (theme) query = query.eq("theme", theme);
  if (ageGroup) query = query.eq("age_group", ageGroup);

  const { data, error } = await query;

  if (error) throw new Error(`DB fetch error: ${error.message}`);
  return (data ?? []).map(mapRow);
}

export async function getRandomStories(count: number): Promise<Story[]> {
  const db = getSupabaseClient();
  const { data, error } = await db.rpc("get_random_stories", { n: count });

  if (error) {
    // Fallback: fetch all and shuffle in JS
    const all = await getStories({ limit: 50 });
    return all.sort(() => Math.random() - 0.5).slice(0, count);
  }

  return (data ?? []).map(mapRow);
}
