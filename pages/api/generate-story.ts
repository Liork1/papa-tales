import type { NextApiRequest, NextApiResponse } from "next";
import type { GenerateStoryRequest, GenerateStoryResponse } from "@/types/api";
import { generateStory } from "@/lib/claude";
import { getContextualStories } from "@/lib/stories";
import { t } from "@/lib/i18n";

const VALID_AGE_GROUPS = ["2-4", "4-6", "6-8", "8-10"] as const;

function validateRequest(body: unknown): GenerateStoryRequest {
  if (!body || typeof body !== "object") {
    throw { code: "INVALID_INPUT", message: t("api.errors.invalidPrompt"), status: 400 };
  }

  const req = body as Record<string, unknown>;
  const prompt = req.prompt;

  if (typeof prompt !== "string" || prompt.trim().length < 10) {
    throw {
      code: "INVALID_INPUT",
      message: t("api.errors.promptTooShort"),
      status: 400,
      details: { field: "prompt", reason: "too_short", minLength: 10 },
    };
  }

  if (prompt.trim().length > 500) {
    throw {
      code: "INVALID_INPUT",
      message: t("api.errors.promptTooLong"),
      status: 400,
      details: { field: "prompt", reason: "too_long", maxLength: 500 },
    };
  }

  const ageGroup = req.ageGroup as string | undefined;
  if (ageGroup && !VALID_AGE_GROUPS.includes(ageGroup as typeof VALID_AGE_GROUPS[number])) {
    throw {
      code: "INVALID_INPUT",
      message: t("api.errors.invalidAgeGroup"),
      status: 400,
      details: { field: "ageGroup", validValues: VALID_AGE_GROUPS },
    };
  }

  return {
    prompt: prompt.trim(),
    ageGroup: ageGroup as GenerateStoryRequest["ageGroup"],
    theme: typeof req.theme === "string" ? req.theme : undefined,
    maxLength: typeof req.maxLength === "number" ? req.maxLength : undefined,
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GenerateStoryResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: { code: "METHOD_NOT_ALLOWED", message: t("api.errors.methodNotAllowed") },
    });
  }

  let validRequest: GenerateStoryRequest;
  try {
    validRequest = validateRequest(req.body);
  } catch (err) {
    const e = err as { code: string; message: string; status: number; details?: Record<string, unknown> };
    return res.status(e.status ?? 400).json({
      success: false,
      error: { code: e.code, message: e.message, details: e.details },
    });
  }

  let inspirationalStories;
  try {
    inspirationalStories = await getContextualStories(
      { theme: validRequest.theme, ageGroup: validRequest.ageGroup },
      5
    );
  } catch {
    return res.status(500).json({
      success: false,
      error: { code: "DB_ERROR", message: t("api.errors.dbError"), details: { operation: "fetch_stories", retry: true } },
    });
  }

  let generated;
  try {
    generated = await generateStory({
      prompt: validRequest.prompt,
      inspirationalStories,
      ageGroup: validRequest.ageGroup,
      maxTokens: validRequest.maxLength ? Math.ceil(validRequest.maxLength * 3) : 2000,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : t("api.errors.claudeError");
    const isParseError = message === "שגיאה בעיבוד התשובה";
    return res.status(500).json({
      success: false,
      error: {
        code: isParseError ? "PARSE_ERROR" : "CLAUDE_ERROR",
        message,
      },
    });
  }

  const wordCount = generated.story.split(/\s+/).filter(Boolean).length;

  return res.status(200).json({
    success: true,
    data: {
      story: generated.story,
      title: generated.title,
      rhymeScheme: generated.rhymeScheme,
      wordCount,
      generatedAt: new Date().toISOString(),
      inspiration: inspirationalStories.map((s) => s.theme).filter((t): t is string => Boolean(t)),
    },
  });
}
