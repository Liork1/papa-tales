import { getStories, getRandomStories } from "@/lib/supabase";
import type { Story } from "@/types/stories";

export interface StoryContext {
  theme?: string;
  ageGroup?: string;
  keywords?: string[];
}

function scoreByKeywords(story: Story, keywords: string[]): number {
  if (!keywords.length) return 0;
  const haystack = [story.title, ...(story.keywords ?? []), story.theme ?? ""]
    .join(" ")
    .toLowerCase();
  return keywords.filter((kw) => haystack.includes(kw.toLowerCase())).length;
}

export async function getContextualStories(
  context: StoryContext,
  limit: number = 3
): Promise<Story[]> {
  const { theme, ageGroup, keywords = [] } = context;

  // Fetch a wider pool then re-rank by keyword relevance
  const pool = await getStories({ theme, ageGroup, limit: 20 });

  if (pool.length === 0) {
    return getRandomStories(limit);
  }

  if (keywords.length > 0) {
    pool.sort((a, b) => scoreByKeywords(b, keywords) - scoreByKeywords(a, keywords));
  }

  if (pool.length >= limit) {
    return pool.slice(0, limit);
  }

  // Fill remaining slots with random stories not already in pool
  const needed = limit - pool.length;
  const extras = await getRandomStories(needed * 2);
  const existingIds = new Set(pool.map((s) => s.id));
  const fresh = extras.filter((s) => !existingIds.has(s.id)).slice(0, needed);
  return [...pool, ...fresh];
}

export function buildInspirationContext(stories: Story[]): string {
  if (stories.length === 0) return "אין סיפורי השראה זמינים";

  return stories
    .map(
      (s, i) =>
        `[${i + 1}] כותרת: ${s.title}` +
        (s.theme ? ` | נושא: ${s.theme}` : "") +
        (s.ageGroup ? ` | גיל: ${s.ageGroup}` : "") +
        `\n${s.content.slice(0, 500)}`
    )
    .join("\n\n---\n\n");
}

export function validateGeneratedStory(story: unknown): boolean {
  if (!story || typeof story !== "object") return false;
  const s = story as Record<string, unknown>;
  return (
    typeof s.story === "string" &&
    s.story.trim().length > 0 &&
    typeof s.title === "string" &&
    s.title.trim().length > 0 &&
    typeof s.rhymeScheme === "string" &&
    ["AABB", "ABAB", "ABCB", "ABBA"].includes(s.rhymeScheme)
  );
}
