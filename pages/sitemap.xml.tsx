import type { GetServerSideProps } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://papa-tales.vercel.app";

// Each entry defines a page with its Hebrew (default) and English paths.
// hreflang alternates are emitted for every URL so Google understands the
// language relationship between the two locale variants.
const PAGES = [
  { he: "/",     en: "/en",      priority: "1.0", changefreq: "weekly"  },
  { he: "/auth", en: "/en/auth", priority: "0.5", changefreq: "monthly" },
];

function generateSitemap(): string {
  const now = new Date().toISOString().split("T")[0];

  const entries = PAGES.flatMap(({ he, en, priority, changefreq }) => [
    // Hebrew (default locale) URL
    `  <url>
    <loc>${SITE_URL}${he}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE_URL}${he}"/>
    <xhtml:link rel="alternate" hreflang="he"        href="${SITE_URL}${he}"/>
    <xhtml:link rel="alternate" hreflang="en"        href="${SITE_URL}${en}"/>
  </url>`,
    // English URL
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

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  res.setHeader("Content-Type", "text/xml");
  res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate");
  res.write(generateSitemap());
  res.end();
  return { props: {} };
};

export default function Sitemap() {
  return null;
}
