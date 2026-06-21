import Anthropic from "@anthropic-ai/sdk";
import type { Story } from "@/types/stories";

let claudeClient: Anthropic | null = null;

export function initClaudeClient(): Anthropic {
  if (!claudeClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY");
    claudeClient = new Anthropic({ apiKey });
  }
  return claudeClient;
}

function buildSystemPrompt(
  inspirationalStories: Story[],
  ageGroup: string,
  wordCount: number
): string {
  const storiesContext = inspirationalStories
    .map(
      (s, i) =>
        `סיפור ${i + 1}: "${s.title}"\n${s.content.slice(0, 400)}...`
    )
    .join("\n\n");

  return `אתה סופר מומחה של סיפורים לילדים. המשימה שלך היא ליצור סיפור חרוז מקורי בעברית.

דרישות:
1. השתמש בשפה פשוטה והבנה לגיל ${ageGroup}
2. הסיפור צריך להיות בעל חרוזים קבועים (בחר AABB או ABAB)
3. אורך: ${wordCount} מילים בערך
4. השלח שיעור או ערך חיובי
5. היה יצירתי אבל השתמש בטמות מסיפורי ההשראה שלהלן כבעלי השפעה

סיפורי השראה:
${storiesContext}

תשובתך צריכה להיות בפורמט JSON בלבד (ללא טקסט נוסף):
{
  "title": "כותרת הסיפור",
  "story": "הסיפור המלא",
  "rhymeScheme": "AABB או ABAB",
  "themes": ["תמה1", "תמה2"]
}`;
}

export interface GenerateStoryOptions {
  prompt: string;
  inspirationalStories: Story[];
  ageGroup?: string;
  maxTokens?: number;
}

export interface GeneratedStory {
  story: string;
  title: string;
  rhymeScheme: string;
  themes?: string[];
}

export async function generateStory(
  options: GenerateStoryOptions
): Promise<GeneratedStory> {
  const {
    prompt,
    inspirationalStories,
    ageGroup = "4-6",
    maxTokens = 2000,
  } = options;

  const client = initClaudeClient();
  const wordCount = 600;
  const systemPrompt = buildSystemPrompt(
    inspirationalStories,
    ageGroup,
    wordCount
  );

  const stream = await client.messages.stream({
    model: "claude-opus-4-8",
    max_tokens: maxTokens,
    thinking: { type: "adaptive" },
    system: systemPrompt,
    messages: [{ role: "user", content: prompt }],
  });

  const message = await stream.finalMessage();

  const textBlock = message.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("שגיאה בעיבוד התשובה");
  }

  return parseStoryResponse(textBlock.text);
}

export function parseStoryResponse(response: string): GeneratedStory {
  // Extract JSON block from response (Claude may wrap it in markdown fences)
  const jsonMatch =
    response.match(/```(?:json)?\s*([\s\S]*?)```/) ||
    response.match(/(\{[\s\S]*\})/);

  const jsonStr = jsonMatch ? jsonMatch[1].trim() : response.trim();

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new Error("שגיאה בעיבוד התשובה");
  }

  const story = parsed.story as string;
  const title = parsed.title as string;
  const rhymeScheme = parsed.rhymeScheme as string;
  const themes = parsed.themes as string[] | undefined;

  if (!story || !title || !rhymeScheme) {
    throw new Error("שגיאה בעיבוד התשובה");
  }

  return { story, title, rhymeScheme, themes };
}
