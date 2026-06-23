import type { NextApiRequest, NextApiResponse } from "next";
import { GoogleGenerativeAI } from "@google/generative-ai";

const STYLE_SUFFIX =
  "watercolor children's book illustration, soft colored pencil linework, warm whimsical lighting, " +
  "pastel color palette with warm greens and blues, professional picture book art style, " +
  "NO text, NO letters, NO words, NO signs anywhere in the image";

export interface PlanIllustrationsRequest {
  title: string;
  pages: Record<string, string>;
}

export interface PlanIllustrationsResponse {
  success: boolean;
  prompts?: Record<string, string>; // "cover" | "1" | "2" | ...
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PlanIllustrationsResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ success: false, error: "Missing GOOGLE_API_KEY" });
  }

  const { title, pages } = req.body as PlanIllustrationsRequest;

  const sortedEntries = Object.entries(pages).sort(
    ([a], [b]) => Number(a) - Number(b)
  );

  const storyText = sortedEntries
    .map(([num, text]) => `Page ${num}:\n${text}`)
    .join("\n\n");

  const pageNumbers = sortedEntries.map(([num]) => num);

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash-lite" });

  try {
    const result = await model.generateContent(
      `You are the art director for a Hebrew children's picture book called "${title}".

Here is the full story in Hebrew:
${storyText}

Your job: write ONE English illustration prompt for EACH page, plus a cover prompt.

Rules:
1. Read the ENTIRE story first to understand all characters and their appearance.
2. Identify each character's SPECIES/TYPE (human child, cartoon pig, superhero, etc.)
   and write a fixed visual description you will reuse IDENTICALLY in every prompt.
   Example: "Aur — a human boy with curly red hair and a blue striped shirt".
3. NEVER change a character's species between pages. If a character is human on page 1,
   they must be human on every page. If Peppa Pig is a cartoon pig, other characters
   are NOT pigs unless the story explicitly says so.
4. If the story includes well-known characters (Peppa Pig, Spider-Man, etc.),
   use their EXACT name so the illustrator recognizes them.
5. Only include characters that are PRESENT in that specific page's text.
   Do not add characters who are not mentioned on that page.
6. Describe the specific scene happening on that page (action, setting, mood).
7. Each prompt: 2–3 sentences only.
8. The COVER prompt should capture the overall mood — main characters together,
   warm and inviting — without depicting a specific scene.
9. End every prompt with: "${STYLE_SUFFIX}"
10. Do NOT put any text, titles, or letters in any image.

Return ONLY valid JSON, no extra text:
{
  "cover": "...",
  ${pageNumbers.map((n) => `"${n}": "..."`).join(",\n  ")}
}`
    );

    const raw = result.response.text().trim();
    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) || raw.match(/(\{[\s\S]*\})/);
    const jsonStr = jsonMatch ? jsonMatch[1].trim() : raw;

    const prompts: Record<string, string> = JSON.parse(jsonStr);

    console.log("[plan-illustrations] generated prompts for", Object.keys(prompts).length, "pages");

    return res.status(200).json({ success: true, prompts });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Planning failed";
    console.error("[plan-illustrations] error:", message);
    return res.status(500).json({ success: false, error: message });
  }
}
