import type { NextApiRequest, NextApiResponse } from "next";
import { getRequestUser, serviceDb } from "@/lib/api-auth";
import { randomUUID } from "crypto";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "30mb",
    },
  },
};

interface SaveRequest {
  story: {
    title: string;
    pages: Record<string, string>;
    rhymeScheme: string;
    wordCount: number;
    illustratedStory: Record<string, string>;
  };
  authorName: string;
  ageGroup: string;
  prompt: string;
  images: Record<string, string>; // key -> "data:image/png;base64,..."
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const user = await getRequestUser(req, res);
  if (!user) return;
  const supabase = serviceDb();

  const { story, authorName, ageGroup, prompt, images } = req.body as SaveRequest;

  if (!story?.title || !story?.pages) {
    return res.status(400).json({ error: "Missing story data" });
  }

  const storyId = randomUUID();
  const imagePaths: Record<string, string> = {};

  // Upload each image to Supabase Storage under {user_id}/{story_id}/{key}.png
  const uploadPromises = Object.entries(images ?? {}).map(async ([key, dataUrl]) => {
    if (!dataUrl || typeof dataUrl !== "string") return;
    try {
      const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, "");
      const buf = Buffer.from(base64, "base64");
      const path = `${user.id}/${storyId}/${key}.png`;
      const { error } = await supabase.storage
        .from("story-images")
        .upload(path, buf, { contentType: "image/png", upsert: false });
      if (!error) imagePaths[key] = path;
    } catch {}
  });

  await Promise.all(uploadPromises);

  const { data, error } = await supabase
    .from("user_story_library")
    .insert({
      id: storyId,
      user_id: user.id,
      title: story.title,
      author_name: authorName ?? "",
      pages: story.pages,
      rhyme_scheme: story.rhymeScheme,
      word_count: story.wordCount,
      illustrated_story: story.illustratedStory,
      image_paths: imagePaths,
      age_group: ageGroup ?? "4-6",
      prompt: prompt ?? "",
      used_credit: true,
    })
    .select("id")
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ id: data.id });
}
