import type { NextApiRequest, NextApiResponse } from "next";
import sharp from "sharp";

export interface GenerateImageRequest {
  prompt: string;
}

export interface GenerateImageResponse {
  success: boolean;
  imageData?: string;
  mimeType?: string;
  error?: string;
}

const STYLE_PREFIX =
  "simple flat vector illustration, 2D minimalist cartoon, cute storybook drawing, solid colors, soft outlines, minimal detail, storybook style, flat shapes, child-friendly composition";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GenerateImageResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const rawKey = process.env.GOOGLE_API_KEY ?? "";
  // Google AI Studio sometimes prefixes keys with "AQ." — strip it
  const apiKey = rawKey.startsWith("AQ.") ? rawKey.slice(3) : rawKey;
  if (!apiKey) {
    return res.status(500).json({ success: false, error: "Missing GOOGLE_API_KEY" });
  }

  const { prompt } = req.body as GenerateImageRequest;
  if (!prompt) {
    return res.status(400).json({ success: false, error: "Missing prompt" });
  }

  const model =
    process.env.GOOGLE_IMAGE_MODEL ?? "gemini-2.0-flash-preview-image-generation";
  const finalPrompt = `${STYLE_PREFIX} ${prompt}`;

  console.log(`[generate-image] model=${model}`);
  console.log(`[generate-image] PROMPT:\n${finalPrompt}`);

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  let lastError: unknown;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: finalPrompt }] }],
          generationConfig: { responseModalities: ["IMAGE"], imageSize: "0.5K" },
        }),
      });

      const body = await response.json() as Record<string, unknown>;

      if (!response.ok) {
        const errMsg =
          (body as { error?: { message?: string } }).error?.message ??
          JSON.stringify(body).slice(0, 300);
        throw new Error(`Gemini API ${response.status}: ${errMsg}`);
      }

      // Extract inlineData from the first image part
      const candidates = (body as { candidates?: unknown[] }).candidates ?? [];
      const parts =
        (candidates[0] as { content?: { parts?: unknown[] } } | undefined)
          ?.content?.parts ?? [];
      const imagePart = parts.find(
        (p): p is { inlineData: { data: string; mimeType: string } } =>
          typeof (p as { inlineData?: unknown }).inlineData === "object"
      );

      if (!imagePart) {
        throw new Error("Gemini returned no image in response");
      }

      const { data } = imagePart.inlineData;
      const compressed = await sharp(Buffer.from(data, "base64"))
        .resize(512, 512, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 75 })
        .toBuffer();
      return res.status(200).json({ success: true, imageData: compressed.toString("base64"), mimeType: "image/webp" });
    } catch (err) {
      lastError = err;
      const message = err instanceof Error ? err.message : String(err);

      if (attempt < 3 && /503|loading|warm|timed out?|overload|demand|no image/i.test(message)) {
        console.warn(`[generate-image] retrying (${attempt}/3) after: ${message}`);
        await sleep(8000);
        continue;
      }

      throw err;
    }
  }

  throw lastError;
}
