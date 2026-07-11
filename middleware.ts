import { NextRequest, NextResponse } from "next/server";

const VALID_LOCALES = new Set(["he", "en"]);

const SKIP_PREFIXES = [
  "/api/",
  "/_next/",
  "/auth",      // covers /auth, /auth?mode=*, /auth/callback — navTo() already sets the right locale prefix
  "/en/auth",   // English locale version of all auth paths
  "/admin",     // no locale redirect on admin pages
  "/en/admin",
  "/favicon",
  "/sitemap",
  "/robots",
  "/og-image",
  "/apple-touch-icon",
  "/demo/",
  "/.well-known",
  "/sw.js",
  "/workbox-",
  "/manifest",      // covers /manifest.webmanifest and /manifest.xml
  "/icons/",
  "/screenshots/",
];

// When Next's i18n routing resolves a locale for the request, req.nextUrl.pathname
// has the locale prefix already stripped (e.g. "/en/privacy" -> pathname "/privacy",
// nextUrl.locale "en") — so the locale must be read from nextUrl.locale, not
// re-derived from the prefix. In test environments (bare NextRequest, no Next
// server context) nextUrl.locale is unresolved and pathname keeps its prefix,
// so fall back to the prefix check there.
function deriveUrlLocale(req: NextRequest): "he" | "en" {
  const resolved = req.nextUrl.locale;
  if (resolved === "en" || resolved === "he") return resolved;
  const { pathname } = req.nextUrl;
  return pathname === "/en" || pathname.startsWith("/en/") ? "en" : "he";
}

function redirectTo(req: NextRequest, locale: "he" | "en"): NextResponse {
  const url = req.nextUrl.clone();
  const { pathname } = url;
  const stripped = pathname.replace(/^\/en/, "") || "/";

  if (locale === "en") {
    url.pathname = stripped === "/" ? "/en" : `/en${stripped}`;
  } else {
    url.pathname = stripped;
  }

  const res = NextResponse.redirect(url);
  res.cookies.set("NEXT_LOCALE", locale, { path: "/", maxAge: 365 * 24 * 60 * 60, sameSite: "lax" });
  return res;
}

export function middleware(req: NextRequest): NextResponse | undefined {
  const { pathname } = req.nextUrl;

  if (SKIP_PREFIXES.some((p) => pathname.startsWith(p))) return undefined;

  const urlLocale = deriveUrlLocale(req);

  // 1. Honour explicit user choice stored in cookie
  const cookieVal = req.cookies.get("NEXT_LOCALE")?.value;
  if (cookieVal && VALID_LOCALES.has(cookieVal)) {
    const cookieLocale = cookieVal as "he" | "en";
    if (cookieLocale !== urlLocale) return redirectTo(req, cookieLocale);
    return undefined;
  }

  // 2. Detect from Accept-Language header
  const acceptLang = req.headers.get("accept-language") ?? "";
  const detected: "he" | "en" = /(?:^|,|\s)he\b/i.test(acceptLang) ? "he" : "en";

  if (detected !== urlLocale) return redirectTo(req, detected);

  // Same locale — stamp the cookie so future requests skip detection
  const res = NextResponse.next();
  res.cookies.set("NEXT_LOCALE", detected, { path: "/", maxAge: 365 * 24 * 60 * 60, sameSite: "lax" });
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|_next/data|favicon.ico|.well-known|sw.js|workbox-|manifest|icons/|screenshots/).*)"],
};
