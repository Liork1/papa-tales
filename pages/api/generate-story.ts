import type { NextApiRequest, NextApiResponse } from "next";
import type { GenerateStoryRequest, GenerateStoryResponse } from "@/types/api";
import { generateStory } from "@/lib/ai";
import { getContextualStories } from "@/lib/stories";
import { t } from "@/lib/i18n";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limit";

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

function getClientIp(req: NextApiRequest): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
  return req.socket.remoteAddress ?? "unknown";
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GenerateStoryResponse>
) {
  const startTime = Date.now();

  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: { code: "METHOD_NOT_ALLOWED", message: t("api.errors.methodNotAllowed") },
    });
  }

  // Rate limiting
  const ip = getClientIp(req);
  const rateLimit = checkRateLimit(ip);
  res.setHeader("X-RateLimit-Remaining", rateLimit.remaining);
  res.setHeader("X-RateLimit-Reset", rateLimit.resetAt);

  if (!rateLimit.allowed) {
    logger.warn("api", "rate_limit_exceeded", { ip });
    return res.status(429).json({
      success: false,
      error: { code: "RATE_LIMIT_EXCEEDED", message: t("api.errors.rateLimitExceeded") },
    });
  }

  // Input validation
  let validRequest: GenerateStoryRequest;
  try {
    validRequest = validateRequest(req.body);
  } catch (err) {
    const e = err as { code: string; message: string; status: number; details?: Record<string, unknown> };
    logger.warn("api", "validation_failed", { code: e.code });
    return res.status(e.status ?? 400).json({
      success: false,
      error: { code: e.code, message: e.message, details: e.details },
    });
  }

  logger.info("api", "generate_story_start", {
    ageGroup: validRequest.ageGroup,
    theme: validRequest.theme,
    promptLength: validRequest.prompt.length,
  });

  // Fetch inspirational stories
  let inspirationalStories;
  try {
    const dbStart = Date.now();
    inspirationalStories = await getContextualStories(
      { theme: validRequest.theme, ageGroup: validRequest.ageGroup },
      5
    );
    logger.info("db", "fetch_stories", {
      count: inspirationalStories.length,
      duration_ms: Date.now() - dbStart,
    });
  } catch (err) {
    logger.error("db", "fetch_stories_failed", {
      error: err instanceof Error ? err.message : String(err),
      duration_ms: Date.now() - startTime,
    });
    return res.status(500).json({
      success: false,
      error: { code: "DB_ERROR", message: t("api.errors.dbError"), details: { operation: "fetch_stories", retry: true } },
    });
  }

  // Generate story via Gemini
  let generated;
  try {
    const aiStart = Date.now();
    generated = await generateStory({
      prompt: validRequest.prompt,
      inspirationalStories,
      ageGroup: validRequest.ageGroup,
      maxTokens: validRequest.maxLength ? Math.ceil(validRequest.maxLength * 4) : undefined,
    });
    logger.info("ai", "story_generated", {
      title: generated.title,
      rhymeScheme: generated.rhymeScheme,
      duration_ms: Date.now() - aiStart,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : t("api.errors.aiError");
    const isParseError = message === "שגיאה בעיבוד התשובה";
    logger.error("ai", isParseError ? "parse_failed" : "generation_failed", {
      error: message,
      duration_ms: Date.now() - startTime,
    });
    return res.status(500).json({
      success: false,
      error: { code: isParseError ? "PARSE_ERROR" : "AI_ERROR", message },
    });
  }

  const wordCount = Object.values(generated.pages)
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;

  logger.info("api", "generate_story_success", {
    wordCount,
    duration_ms: Date.now() - startTime,
  });

  return res.status(200).json({
    success: true,
    data: {
      pages: generated.pages,
      title: generated.title,
      rhymeScheme: generated.rhymeScheme,
      wordCount,
      generatedAt: new Date().toISOString(),
      inspiration: inspirationalStories.map((s) => s.theme).filter((t): t is string => Boolean(t)),
      illustratedStory: generated.illustratedStory,
    },
  });
}
