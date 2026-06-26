import type { GetServerSideProps } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://papa-tales.vercel.app";

function generateSitemap(): string {
  const pages = [
    { url: "/", priority: "1.0", changefreq: "weekly" },
    { url: "/auth", priority: "0.5", changefreq: "monthly" },
  ];

  const now = new Date().toISOString().split("T")[0];

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
  .map(
    (p) => `  <url>
    <loc>${SITE_URL}${p.url}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`
  )
  .join("\n")}
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
