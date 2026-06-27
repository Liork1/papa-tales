import { NextRequest, NextResponse } from "next/server";

const VALID_LOCALES = new Set(["he", "en"]);

const SKIP_PREFIXES = ["/api/", "/_next/", "/favicon", "/sitemap", "/robots", "/og-image", "/apple-touch-icon"];

function deriveUrlLocale(pathname: string): "he" | "en" {
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

  const urlLocale = deriveUrlLocale(pathname);

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
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
