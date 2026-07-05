import type { NextApiRequest, NextApiResponse } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://papa-tales.com";

const PAGES = [
  { he: "/",     en: "/en",      priority: "1.0", changefreq: "weekly"  },
  { he: "/auth", en: "/en/auth", priority: "0.5", changefreq: "monthly" },
];

function generateSitemap(): string {
  const now = new Date().toISOString().split("T")[0];

  const entries = PAGES.flatMap(({ he, en, priority, changefreq }) => [
    `  <url>
    <loc>${SITE_URL}${he}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE_URL}${he}"/>
    <xhtml:link rel="alternate" hreflang="he"        href="${SITE_URL}${he}"/>
    <xhtml:link rel="alternate" hreflang="en"        href="${SITE_URL}${en}"/>
  </url>`,
    `  <url>
    <loc>${SITE_URL}${en}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE_URL}${he}"/>
    <xhtml:link rel="alternate" hreflang="he"        href="${SITE_URL}${he}"/>
    <xhtml:link rel="alternate" hreflang="en"        href="${SITE_URL}${en}"/>
  </url>`,
  ]);

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.join("\n")}
</urlset>`;
}

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Content-Type", "text/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate");
  res.send(generateSitemap());
}
