import type { NextApiRequest, NextApiResponse } from "next";
import { getRequestUser, serviceDb } from "@/lib/api-auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "DELETE") return res.status(405).json({ error: "Method not allowed" });

  const user = await getRequestUser(req, res);
  if (!user) return;

  const { id } = req.query;
  if (!id || typeof id !== "string") return res.status(400).json({ error: "Missing story id" });

  const db = serviceDb();

  // Fetch to verify ownership and get image paths
  const { data: row, error: fetchError } = await db
    .from("user_story_library")
    .select("id, user_id, image_paths")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !row) return res.status(404).json({ error: "Story not found" });

  // Delete images from storage
  const imagePaths = (row.image_paths ?? {}) as Record<string, string>;
  const paths = Object.values(imagePaths).filter(Boolean);
  if (paths.length > 0) {
    await db.storage.from("story-images").remove(paths);
  }

  // Delete the row
  const { error: deleteError } = await db
    .from("user_story_library")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (deleteError) return res.status(500).json({ error: deleteError.message });

  return res.status(200).json({ success: true });
}
