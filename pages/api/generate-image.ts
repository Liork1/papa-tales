import type { NextApiRequest, NextApiResponse } from "next";

export interface GenerateImageRequest {
  prompt: string;
}

export interface GenerateImageResponse {
  success: boolean;
  imageData?: string;
  mimeType?: string;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GenerateImageResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const hfToken = process.env.HF_KEY;
  if (!hfToken) {
    return res.status(500).json({ success: false, error: "Missing HF_KEY" });
  }

  const { prompt } = req.body as GenerateImageRequest;
  if (!prompt) {
    return res.status(400).json({ success: false, error: "Missing prompt" });
  }

  console.log(`[generate-image] → ${prompt.slice(0, 120)}...`);

  try {
    const response = await fetch(
      "https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${hfToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inputs: prompt }),
      }
    );

    if (!response.ok) {
      const text = await response.text().catch(() => "(unreadable)");
      throw new Error(`HF API ${response.status}: ${text.slice(0, 300)}`);
    }

    const buffer = await response.arrayBuffer();
    const data = Buffer.from(buffer).toString("base64");
    const mimeType = response.headers.get("content-type") ?? "image/jpeg";

    return res.status(200).json({ success: true, imageData: data, mimeType });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Image generation failed";
    console.error("[generate-image] error:", message);
    return res.status(500).json({ success: false, error: message });
  }
}
