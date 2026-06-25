import type { NextApiRequest, NextApiResponse } from "next";
import { getRequestUser, serviceDb } from "@/lib/api-auth";

export interface LibraryStory {
  id: string;
  title: string;
  author_name: string;
  pages: Record<string, string>;
  rhyme_scheme: string;
  word_count: number;
  illustrated_story: Record<string, string>;
  imageUrls: Record<string, string>;
  age_group: string;
  prompt: string;
  created_at: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  const user = await getRequestUser(req, res);
  if (!user) return;
  const supabase = serviceDb();

  const { data: rows, error } = await supabase
    .from("user_story_library")
    .select("id, title, author_name, pages, rhyme_scheme, word_count, illustrated_story, image_paths, age_group, prompt, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) return res.status(500).json({ error: error.message });

  // Resolve signed URLs (1 h TTL) for all images in parallel
  const stories: LibraryStory[] = await Promise.all(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rows.map(async (row: any) => {
      const imagePaths = (row.image_paths ?? {}) as Record<string, string>;
      const imageUrls: Record<string, string> = {};

      await Promise.all(
        Object.entries(imagePaths).map(async ([key, path]) => {
          const { data } = await supabase.storage
            .from("story-images")
            .createSignedUrl(path, 3600);
          if (data?.signedUrl) imageUrls[key] = data.signedUrl;
        })
      );

      const { image_paths, ...rest } = row;
      return { ...(rest as Omit<typeof row, "image_paths">), imageUrls } as LibraryStory;
    })
  );

  return res.status(200).json({ stories });
}
