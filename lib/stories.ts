import { getStories, getRandomStories } from "@/lib/supabase";
import type { Story } from "@/types/stories";

export interface StoryContext {
  theme?: string;
  ageGroup?: string;
  keywords?: string[];
}

export async function getContextualStories(
  context: StoryContext,
  limit: number = 3
): Promise<Story[]> {
  const { theme, ageGroup } = context;

  // Try to fetch stories matching the given filters
  const filtered = await getStories({ theme, ageGroup, limit });

  if (filtered.length >= limit) {
    return filtered.slice(0, limit);
  }

  // Fall back to partially-filtered then random to fill quota
  if (filtered.length > 0) {
    const needed = limit - filtered.length;
    const extras = await getRandomStories(needed * 2);
    const existingIds = new Set(filtered.map((s) => s.id));
    const fresh = extras.filter((s) => !existingIds.has(s.id)).slice(0, needed);
    return [...filtered, ...fresh];
  }

  // No matching stories — just return random
  return getRandomStories(limit);
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
