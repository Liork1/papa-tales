import type { NextApiRequest, NextApiResponse } from "next";

// Forward to the client-side callback page so the exchange is done
// by createBrowserClient (which owns the PKCE code verifier).
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code } = req.query;
  if (typeof code === "string") {
    return res.redirect(307, `/auth/callback?code=${encodeURIComponent(code)}`);
  }
  res.redirect(307, "/");
}
