import { serviceDb } from "@/lib/api-auth";
import { completeChat } from "@/lib/ai";

export async function tryReuseImage(
  newPrompt: string
): Promise<{ imageData: string; mimeType: string } | null> {
  const minPool = parseInt(process.env.IMAGE_REUSE_MIN_POOL ?? "150", 10);
  const db = serviceDb();

  // 1. Check pool size — only activate once we have enough variety
  const { count } = await db
    .from("user_story_library")
    .select("id", { count: "exact", head: true })
    .not("image_paths->cover", "is", null)
    .neq("image_paths->cover", "");

  if ((count ?? 0) < minPool) return null;

  // 2. Fetch last 1,000 cover (prompt, path) pairs
  const { data: rows } = await db
    .from("user_story_library")
    .select("illustrated_story, image_paths")
    .not("image_paths->cover", "is", null)
    .order("created_at", { ascending: false })
    .limit(1000);

  const candidates = ((rows ?? []) as Array<{
    illustrated_story: Record<string, string>;
    image_paths: Record<string, string>;
  }>)
    .map((r) => ({
      prompt: r.illustrated_story?.cover,
      path: r.image_paths?.cover,
    }))
    .filter((c): c is { prompt: string; path: string } => !!c.prompt && !!c.path);

  if (!candidates.length) return null;

  // 3. LLM comparison — ask for the visually closest match
  const listText = candidates.map((c, i) => `${i}: ${c.prompt}`).join("\n");

  const response = await completeChat({
    messages: [
      {
        role: "user",
        content: `Compare this new illustration prompt against the stored ones and find the visually closest match.

New prompt: "${newPrompt}"

Stored prompts:
${listText}

Return JSON: { "matchIndex": <number or null>, "confidence": <0-100> }
Set matchIndex only if confidence > 85, otherwise set it to null.
Focus on visual similarity: same type of scene, characters, setting, and mood. Exact wording does not matter.`,
      },
    ],
    jsonMode: true,
    temperature: 0,
  });

  let result: { matchIndex: number | null; confidence: number };
  try {
    result = JSON.parse(response) as typeof result;
  } catch {
    return null;
  }

  if (result.matchIndex === null || result.confidence <= 85) return null;

  const matched = candidates[result.matchIndex];
  if (!matched?.path) return null;

  // 4. Download matched image from storage and return as base64
  const { data: blob } = await db.storage.from("story-images").download(matched.path);
  if (!blob) return null;

  const arrayBuf = await blob.arrayBuffer();
  const imageData = Buffer.from(arrayBuf).toString("base64");
  return { imageData, mimeType: "image/webp" };
}
