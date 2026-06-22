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
  return genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
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

  return `You are an expert Hebrew children's story writer. Your task is to create a fun, rhyming Hebrew story divided into short pages.

ALL OUTPUT MUST BE IN HEBREW (right-to-left, no vowel marks / nikud).

Target audience: ${audienceNote}

Hard requirements:
1. Language must match age group ${ageGroup} as described above.
2. RHYMING — this is the most critical requirement. Choose one scheme (AABB or ABAB) and apply it consistently on every page:
   - AABB: line 1 rhymes with line 2, line 3 rhymes with line 4
   - ABAB: line 1 rhymes with line 3, line 2 rhymes with line 4
   - A true rhyme = the final syllable sounds IDENTICAL when spoken aloud. Example: sameach / poreach ✓ | sameach / gadol ✗
   - Before writing each page, say the line endings aloud — do they actually sound the same?
   - No weak rhymes: a word with itself, or only an inflection change (e.g. halach / lalechet) is NOT a rhyme.
3. EXACTLY ${pageRange} pages — no more, no less.
4. Each page: maximum ${maxWordsPerPage} words.${olderKids ? " Small enriching details are welcome." : " Short pages = happy kids."}
5. End with a simple positive lesson.
6. Draw themes from the inspirational stories below.
7. Write WITHOUT nikud (vowel marks) — plain Hebrew only.

Inspirational stories:
${storiesContext}

Your response must be pure JSON only (no extra text). Example structure (replace all values with real Hebrew content):
{
  "title": "שם הסיפור בעברית",
  "pages": {
    "1": "תוכן עמוד 1 בעברית — עד ${maxWordsPerPage} מילים",
    "2": "תוכן עמוד 2 בעברית — עד ${maxWordsPerPage} מילים",
    "${pageRange.split("-")[1]}": "תוכן העמוד האחרון — עד ${maxWordsPerPage} מילים"
  },
  "rhymeScheme": "AABB",
  "themes": ["חברות", "הרפתקה"]
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

  if (!story || !title || !rhymeScheme) throw new Error("שגיאה בעיבוד התשובה");

  return { pages: story, title, rhymeScheme, themes };
}
