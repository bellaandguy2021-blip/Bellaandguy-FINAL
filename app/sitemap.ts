import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";
import { allCategories, slugifyService } from "@/lib/servicesData";
import { getDynamicCategories, mergeCategories } from "@/lib/dynamicServices";

// Regenerates automatically: service URLs come from the merged static+admin
// catalog, so adding a service in the admin panel updates the sitemap on the
// next crawl without a deploy.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const core: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`,       lastModified: now, changeFrequency: "weekly",  priority: 1 },
    { url: `${SITE_URL}/about`,  lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/book`,   lastModified: now, changeFrequency: "weekly",  priority: 0.9 },
  ];

  const dynamicCats = await getDynamicCategories();
  const categories = mergeCategories(allCategories, dynamicCats);

  const services: MetadataRoute.Sitemap = categories.flatMap(cat =>
    cat.services.map(svc => ({
      url: `${SITE_URL}/services/${cat.id}/${slugifyService(svc.name)}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: svc.popular ? 0.8 : 0.6,
    }))
  );

  // De-dupe (identical service names inside a category share a slug).
  const seen = new Set<string>();
  return [...core, ...services].filter(e => !seen.has(e.url) && seen.add(e.url));
}
