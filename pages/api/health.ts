import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const envCheck = {
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    OPENROUTER_API_KEY: !!process.env.OPENROUTER_API_KEY,
  };
  const allSet = Object.values(envCheck).every(Boolean);
  res.status(allSet ? 200 : 500).json({
    status: allSet ? "ok" : "missing_env",
    service: "papa-tales",
    env: envCheck,
  });
}
