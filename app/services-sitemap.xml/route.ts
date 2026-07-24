import { SITE_URL } from "@/lib/seo";
import { allCategories, slugifyService } from "@/lib/servicesData";
import { getDynamicCategories, mergeCategories } from "@/lib/dynamicServices";

// Dedicated services sitemap — one <url> per service detail page, kept in sync
// with the merged static+admin catalog automatically.
export const dynamic = "force-dynamic";

export async function GET() {
  const dynamicCats = await getDynamicCategories();
  const categories = mergeCategories(allCategories, dynamicCats);
  const now = new Date().toISOString();

  const seen = new Set<string>();
  const urls = categories.flatMap(cat =>
    cat.services.map(svc => `${SITE_URL}/services/${cat.id}/${slugifyService(svc.name)}`)
  ).filter(u => !seen.has(u) && seen.add(u));

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${escapeXml(u)}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`).join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
