/**
 * One-time script: generate demo story illustrations and save to public/demo/.
 * Run: npx tsx scripts/generate-demo-images.ts
 *
 * Character anchor: identical description in every prompt featuring Oz to
 * maximise visual consistency across images.
 */

import fs from "fs";
import path from "path";
import { config } from "dotenv";

config({ path: path.resolve(__dirname, "../.env") });

const STYLE =
  "simple flat vector illustration, 2D minimalist cartoon, cute children's storybook art, solid bold colors, soft black outlines, minimal background detail, flat shapes, warm magical mood, child-friendly";

// Identical character seed prepended to every prompt that shows Oz
const OZ =
  "a young boy named Oz, age 5, curly short dark brown hair, big round brown eyes, chubby cheeks, wearing blue pajamas covered in tiny white stars";

const PROMPTS: Record<string, string> = {
  cover:
    `storybook cover, ${OZ}, standing in a moonlit garden at night, looking up at a deep purple starry sky, one large golden glowing star streaking downward toward him, magical nighttime scene`,

  "1":
    `${OZ}, standing at his bedroom window at night, watching a single bright golden star falling from the purple starry sky outside, cozy warm bedroom interior behind him, his face full of wonder`,

  "2":
    `${OZ}, kneeling in a moonlit garden among flowers and grass, gently cupping a tiny glowing golden star in both hands, the star sparkles softly, night sky above, expression of delight`,

  "3":
    `${OZ}, sitting cross-legged in the garden at night, blowing a gentle breath toward a tiny sad golden star with drooping broken wings lying on the ground in front of him, expression of concentration and care`,

  "4":
    `${OZ}, standing in the garden at night, arms raised joyfully above his head, watching a brilliant golden star soaring back up into the deep purple sky leaving a trail of golden sparkles, big smile`,

  "5":
    `${OZ}, sleeping peacefully in a cozy bed with blue star-patterned sheets, a small bright golden star shining through the bedroom window casting a warm golden glow over him, serene and magical`,
};

const OUTPUT_DIR = path.resolve(__dirname, "../public/demo");

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

async function generateImage(prompt: string): Promise<{ data: string; mimeType: string }> {
  const rawKey = process.env.GOOGLE_API_KEY ?? "";
  const apiKey = rawKey.startsWith("AQ.") ? rawKey.slice(3) : rawKey;
  if (!apiKey) throw new Error("Missing GOOGLE_API_KEY in .env");

  const model = process.env.GOOGLE_IMAGE_MODEL ?? "gemini-2.0-flash-preview-image-generation";
  const finalPrompt = `${STYLE}, ${prompt}`;

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  for (let attempt = 1; attempt <= 4; attempt++) {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: finalPrompt }] }],
        generationConfig: { responseModalities: ["IMAGE"] },
      }),
    });

    const body = await res.json() as Record<string, unknown>;

    if (!res.ok) {
      const msg = (body as { error?: { message?: string } }).error?.message
        ?? JSON.stringify(body).slice(0, 300);
      if (attempt < 4 && /503|loading|warm|overload|demand/i.test(msg)) {
        console.warn(`  attempt ${attempt} failed (${msg}) — waiting 12s`);
        await sleep(12000);
        continue;
      }
      throw new Error(`Gemini ${res.status}: ${msg}`);
    }

    const candidates = (body as { candidates?: unknown[] }).candidates ?? [];
    const parts = (candidates[0] as { content?: { parts?: unknown[] } } | undefined)
      ?.content?.parts ?? [];
    const imagePart = parts.find(
      (p): p is { inlineData: { data: string; mimeType: string } } =>
        typeof (p as { inlineData?: unknown }).inlineData === "object"
    );

    if (!imagePart) {
      if (attempt < 4) {
        console.warn(`  attempt ${attempt} — no image in response, retrying in 12s`);
        await sleep(12000);
        continue;
      }
      throw new Error("Gemini returned no image after 4 attempts");
    }

    return { data: imagePart.inlineData.data, mimeType: imagePart.inlineData.mimeType };
  }
  throw new Error("All attempts exhausted");
}

function ext(mime: string) {
  if (mime.includes("png")) return "png";
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
  if (mime.includes("webp")) return "webp";
  return "png";
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const keys = Object.keys(PROMPTS);
  console.log(`Generating ${keys.length} demo images → ${OUTPUT_DIR}\n`);

  const manifest: Record<string, string> = {};

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    console.log(`[${i + 1}/${keys.length}] ${key} — prompting Gemini…`);
    try {
      const { data, mimeType } = await generateImage(PROMPTS[key]);
      const filename = `${key}.${ext(mimeType)}`;
      const filepath = path.join(OUTPUT_DIR, filename);
      fs.writeFileSync(filepath, Buffer.from(data, "base64"));
      manifest[key] = `/demo/${filename}`;
      console.log(`  ✓ ${filename}  (${Math.round(data.length * 0.75 / 1024)} KB)`);
    } catch (err) {
      console.error(`  ✗ ${key}: ${(err as Error).message}`);
    }
    // Rate-limit gap between images
    if (i < keys.length - 1) await sleep(4000);
  }

  fs.writeFileSync(
    path.join(OUTPUT_DIR, "manifest.json"),
    JSON.stringify(manifest, null, 2)
  );
  console.log("\n--- manifest ---");
  console.log(JSON.stringify(manifest, null, 2));
}

main().catch((err) => { console.error(err); process.exit(1); });
