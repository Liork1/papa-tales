import type { NextApiRequest, NextApiResponse } from "next";
import sharp from "sharp";
import { requireAdmin, adminDb } from "@/lib/admin-guard";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const adminId = await requireAdmin(req, res);
  if (!adminId) return;

  const db = adminDb();

  const { data: stories, error } = await db
    .from("user_story_library")
    .select("id, image_paths")
    .not("image_paths", "eq", "{}");

  if (error) return res.status(500).json({ error: error.message });

  let processed = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const story of stories ?? []) {
    const imagePaths = (story.image_paths ?? {}) as Record<string, string>;
    const updatedPaths: Record<string, string> = { ...imagePaths };
    let changed = false;

    for (const [key, oldPath] of Object.entries(imagePaths)) {
      if (typeof oldPath !== "string" || oldPath.endsWith(".webp")) {
        skipped++;
        continue;
      }

      try {
        const { data: blob, error: dlError } = await db.storage
          .from("story-images")
          .download(oldPath);

        if (dlError || !blob) throw new Error(dlError?.message ?? "download failed");

        const arrayBuf = await blob.arrayBuffer();
        const compressed = await sharp(Buffer.from(arrayBuf))
          .resize(512, 512, { fit: "inside", withoutEnlargement: true })
          .webp({ quality: 75 })
          .toBuffer();

        const newPath = oldPath.replace(/\.\w+$/, ".webp");

        const { error: upError } = await db.storage
          .from("story-images")
          .upload(newPath, compressed, { contentType: "image/webp", upsert: false });

        if (upError) throw new Error(upError.message);

        await db.storage.from("story-images").remove([oldPath]);

        updatedPaths[key] = newPath;
        changed = true;
        processed++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`${story.id}/${key}: ${msg}`);
      }
    }

    if (changed) {
      await db
        .from("user_story_library")
        .update({ image_paths: updatedPaths })
        .eq("id", story.id);
    }
  }

  return res.status(200).json({ processed, skipped, errors });
}
