import { SITE_URL, absoluteUrl } from "@/lib/seo";
import { allCategories, slugifyService } from "@/lib/servicesData";
import { getDynamicCategories, mergeCategories } from "@/lib/dynamicServices";
import { getGalleryImages } from "@/lib/homepageContent";

// Google Image sitemap — homepage gallery images + every service's gallery,
// attached to the page each image actually appears on. Regenerates from live
// content (admin gallery/services edits show up automatically).
export const dynamic = "force-dynamic";

export async function GET() {
  const [dynamicCats, galleryImages] = await Promise.all([
    getDynamicCategories(),
    getGalleryImages(),
  ]);
  const categories = mergeCategories(allCategories, dynamicCats);

  // page URL → its images (title kept for image:title tags)
  const pages = new Map<string, { src: string; title: string }[]>();

  const home = galleryImages.map(g => ({ src: g.src, title: g.alt_text || g.label || "Bella & Guy Salon gallery" }));
  if (home.length) pages.set(`${SITE_URL}/`, home);

  for (const cat of categories) {
    for (const svc of cat.services) {
      const imgs = (svc.gallery?.length ? svc.gallery : cat.imgs).map(src => ({ src, title: `${svc.name} — ${cat.label}` }));
      if (imgs.length) pages.set(`${SITE_URL}/services/${cat.id}/${slugifyService(svc.name)}`, imgs);
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${[...pages.entries()].map(([loc, imgs]) => `  <url>
    <loc>${escapeXml(loc)}</loc>
${imgs.slice(0, 20).map(img => `    <image:image>
      <image:loc>${escapeXml(absoluteUrl(img.src))}</image:loc>
      <image:title>${escapeXml(img.title)}</image:title>
    </image:image>`).join("\n")}
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
