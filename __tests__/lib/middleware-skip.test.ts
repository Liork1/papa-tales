import { NextRequest } from "next/server";
import { middleware } from "@/middleware";

// Build a NextRequest for a given path, with optional cookie and Accept-Language header.
function req(
  path: string,
  opts: { cookie?: string; acceptLang?: string } = {}
): NextRequest {
  const url = new URL(`http://localhost${path}`);
  const init: RequestInit = opts.acceptLang
    ? { headers: { "accept-language": opts.acceptLang } }
    : {};
  const r = new NextRequest(url, init);
  if (opts.cookie) r.cookies.set("NEXT_LOCALE", opts.cookie);
  return r;
}

// ── Auth and admin pages must NEVER be redirected ─────────────────────────────
// Regression guard: removing these entries from SKIP_PREFIXES re-creates the
// document-level 307 loop that froze the app on real mobile devices.

describe("middleware — auth and admin paths are always skipped", () => {
  const skippedPaths = [
    "/auth?mode=signin",
    "/auth?mode=register",
    "/auth/callback?code=xxx",
    "/en/auth?mode=signin",
    "/en/auth?mode=register",
    "/en/auth/callback?code=xxx",
    "/admin",
    "/admin/users",
    "/en/admin",
    "/en/admin/users",
  ];

  test.each(skippedPaths)(
    "returns undefined (no redirect) for %s regardless of cookie",
    (path) => {
      // With a mismatched cookie — this used to cause the 307 loop
      expect(middleware(req(path, { cookie: "he" }))).toBeUndefined();
      expect(middleware(req(path, { cookie: "en" }))).toBeUndefined();
      // With no cookie at all
      expect(middleware(req(path))).toBeUndefined();
    }
  );
});

// ── Normal locale routing still works for non-auth pages ─────────────────────

describe("middleware — locale routing for regular pages", () => {
  it("redirects / to /en when NEXT_LOCALE cookie is 'en'", () => {
    const res = middleware(req("/", { cookie: "en" }));
    expect(res?.status).toBe(307);
    expect(res?.headers.get("location")).toMatch(/\/en$/);
  });

  it("redirects /en to / when NEXT_LOCALE cookie is 'he'", () => {
    const res = middleware(req("/en", { cookie: "he" }));
    expect(res?.status).toBe(307);
    expect(res?.headers.get("location")).toMatch(/\/$/);
  });

  it("redirects / to /en when Accept-Language is English and no cookie", () => {
    const res = middleware(req("/", { acceptLang: "en-US,en;q=0.9" }));
    expect(res?.status).toBe(307);
    expect(res?.headers.get("location")).toMatch(/\/en$/);
  });

  it("does not redirect / when Accept-Language is Hebrew and no cookie", () => {
    // Should stamp the cookie and pass through (NextResponse.next), not redirect
    const res = middleware(req("/", { acceptLang: "he-IL,he;q=0.9" }));
    // next() returns a response but NOT a 307
    expect(res?.status).not.toBe(307);
  });

  it("passes through /_next/ asset paths", () => {
    expect(middleware(req("/_next/static/chunks/main.js"))).toBeUndefined();
    // /_next/data/ is excluded via the matcher config so the function is never
    // invoked for data-fetch paths in production — no need to assert here.
  });

  it("passes through /api/ routes", () => {
    expect(middleware(req("/api/generate"))).toBeUndefined();
  });
});
