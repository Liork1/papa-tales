import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import type { Story } from "@/types/stories";
import { logger } from "@/lib/logger";

let genAI: GoogleGenerativeAI | null = null;

export function initGenerativeModel(): GenerativeModel {
  if (!genAI) {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) throw new Error("Missing GOOGLE_API_KEY");
    genAI = new GoogleGenerativeAI(apiKey);
  }
  const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash-lite";
  return genAI.getGenerativeModel({ model });
}

function buildSystemPrompt(
  inspirationalStories: Story[],
  ageGroup: string
): string {
  const storiesContext = inspirationalStories
    .map((s, i) => `Story ${i + 1}: "${s.title}"\n${s.content.slice(0, 400)}...`)
    .join("\n\n");

  const olderKids = ageGroup === "6-8" || ageGroup === "8-10";
  const pageRange = olderKids ? "10-12" : "8-10";
  const maxWordsPerPage = olderKids ? 70 : 50;
  const audienceNote = olderKids
    ? `children aged ${ageGroup} — slightly richer language, short vivid descriptions, occasional new interesting words are welcome`
    : `very young children (up to age 6) — short words, short sentences, very simple language`;

  const STYLE_SUFFIX = "watercolor children's book illustration, soft colored pencil linework, warm whimsical lighting, pastel color palette with warm greens and blues, professional picture book art style, NO text, NO letters, NO words, NO signs anywhere in the image";

  return `You are an expert Hebrew children's story writer AND art director for a picture book.
Your task is TWO things in ONE response:
  A) Write a fun, rhyming Hebrew story divided into short pages.
  B) Write ONE English illustration prompt per page (plus a cover prompt).

═══ PART A: STORY ═══

ALL STORY TEXT MUST BE IN HEBREW (right-to-left, no vowel marks / nikud).

Target audience: ${audienceNote}

Story requirements:
1. Language must match age group ${ageGroup} as described above.
2. RHYMING — most critical. Choose one scheme (AABB or ABAB) and apply consistently on every page:
   - AABB: line 1 rhymes with line 2, line 3 rhymes with line 4
   - ABAB: line 1 rhymes with line 3, line 2 rhymes with line 4
   - True rhyme = final syllable sounds IDENTICAL aloud. Example: sameach / poreach ✓ | sameach / gadol ✗
   - No weak rhymes: same word or only an inflection change is NOT a rhyme.
3. EXACTLY ${pageRange} pages — no more, no less.
4. Each page: maximum ${maxWordsPerPage} words.${olderKids ? " Small enriching details are welcome." : " Short pages = happy kids."}
5. End with a simple positive lesson.
6. Draw themes from the inspirational stories below.
7. Write WITHOUT nikud — plain Hebrew only.

Inspirational stories:
${storiesContext}

═══ PART B: ILLUSTRATION PROMPTS ═══

After writing the full story, plan ONE English illustration prompt for each page plus a cover.

Illustration rules:
1. Read the entire story first. Identify each character's SPECIES/TYPE (human child, cartoon pig, superhero, etc.)
   and lock that visual description — reuse it IDENTICALLY in every prompt.
2. NEVER change a character's species or appearance between pages.
3. For well-known characters (Peppa Pig, Spider-Man, etc.), use their EXACT name.
4. Only include characters PRESENT in that specific page's text.
5. Describe the scene happening on that page (action, setting, mood). 2-3 sentences only.
6. COVER prompt: main characters together, warm and inviting mood — no specific scene.
7. Do NOT put any text, titles, letters, or signs in any image.
8. Every prompt must end with exactly: "${STYLE_SUFFIX}"

═══ JSON OUTPUT ═══

Return ONLY valid JSON — no extra text. Example structure:
{
  "title": "שם הסיפור בעברית",
  "pages": {
    "1": "תוכן עמוד 1 בעברית — עד ${maxWordsPerPage} מילים",
    "2": "תוכן עמוד 2 בעברית — עד ${maxWordsPerPage} מילים",
    "${pageRange.split("-")[1]}": "תוכן העמוד האחרון — עד ${maxWordsPerPage} מילים"
  },
  "rhymeScheme": "AABB",
  "themes": ["חברות", "הרפתקה"],
  "illustrated_story": {
    "cover": "Main characters together in a warm setting, cheerful expressions, inviting mood. ${STYLE_SUFFIX}",
    "1": "Scene description for page 1 with consistent character appearances. ${STYLE_SUFFIX}",
    "2": "Scene description for page 2. ${STYLE_SUFFIX}",
    "${pageRange.split("-")[1]}": "Scene description for the last page. ${STYLE_SUFFIX}"
  }
}`;
}

export interface GenerateStoryOptions {
  prompt: string;
  inspirationalStories: Story[];
  ageGroup?: string;
  maxTokens?: number;
}

export interface GeneratedStory {
  pages: Record<string, string>;
  title: string;
  rhymeScheme: string;
  themes?: string[];
  illustratedStory: Record<string, string>;
}

export async function generateStory(
  options: GenerateStoryOptions
): Promise<GeneratedStory> {
  const { prompt, inspirationalStories, ageGroup = "4-6", maxTokens = 15000 } = options;

  const model = initGenerativeModel();
  const systemPrompt = buildSystemPrompt(inspirationalStories, ageGroup);

  const TIMEOUT_MS = 60_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  console.log(`\n${"─".repeat(60)}\n[GEMINI PROMPT] ${new Date().toISOString()}\n${"─".repeat(60)}\n[SYSTEM]\n${systemPrompt}\n\n[USER]\n${prompt}\n${"─".repeat(60)}\n`);

  let text: string;
  try {
    const result = await model.generateContent(
      {
        systemInstruction: systemPrompt,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: maxTokens, responseMimeType: "application/json" },
      },
    );
    text = result.response.text();
  } catch (err) {
    if ((err as Error).name === "AbortError") throw new Error("שגיאה בעיבוד בקשתך");
    throw err;
  } finally {
    clearTimeout(timer);
  }

  console.log(`\n${"─".repeat(60)}\n[GEMINI RAW RESPONSE]\n${"─".repeat(60)}\n${text}\n${"─".repeat(60)}\n`);
  return parseStoryResponse(text);
}

export function parseStoryResponse(response: string): GeneratedStory {
  const jsonMatch =
    response.match(/```(?:json)?\s*([\s\S]*?)```/) ||
    response.match(/(\{[\s\S]*\})/);

  const jsonStr = jsonMatch ? jsonMatch[1].trim() : response.trim();

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (err) {
    console.error(`[PARSE ERROR] ${(err as Error).message}\n[RAW (first 500 chars)]: ${jsonStr.slice(0, 500)}`);
    throw new Error("שגיאה בעיבוד התשובה");
  }

  const story = parsed.pages as Record<string, string>;
  const title = parsed.title as string;
  const rhymeScheme = parsed.rhymeScheme as string;
  const themes = parsed.themes as string[] | undefined;
  const illustratedStory = parsed.illustrated_story as Record<string, string> | undefined;

  if (!story || !title || !rhymeScheme) throw new Error("שגיאה בעיבוד התשובה");
  if (!illustratedStory || Object.keys(illustratedStory).length === 0) throw new Error("שגיאה בעיבוד התשובה");

  const STYLE_SUFFIX = "watercolor children's book illustration, soft colored pencil linework, warm whimsical lighting, pastel color palette with warm greens and blues, professional picture book art style, NO text, NO letters, NO words, NO signs anywhere in the image";
  const normalizedPrompts: Record<string, string> = {};
  for (const [key, prompt] of Object.entries(illustratedStory)) {
    normalizedPrompts[key] = prompt.endsWith(STYLE_SUFFIX) ? prompt : `${prompt} ${STYLE_SUFFIX}`;
  }

  return { pages: story, title, rhymeScheme, themes, illustratedStory: normalizedPrompts };
}
