import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findServiceBySlug, slugifyService } from "@/lib/servicesData";
import { getDynamicCategories } from "@/lib/dynamicServices";
import ServiceDetail from "@/components/ServiceDetail";
import JsonLd from "@/components/JsonLd";
import { buildMetadata } from "@/lib/seo";
import { serviceSchema, breadcrumbSchema, faqSchema, webPageSchema } from "@/lib/schema";

interface PageParams {
  categoryId: string;
  slug: string;
}

// Services managed via the admin panel's Services tab live in Supabase and take
// priority — once a category is imported/edited there, that version (not the
// original hardcoded one) is what the site shows. Only fall back to the static
// catalog for categories the admin hasn't touched.
async function findService(categoryId: string, slug: string) {
  const dynamicCats = await getDynamicCategories();
  const dynamicCategory = dynamicCats.find(c => c.id === categoryId);
  if (dynamicCategory) {
    const service = dynamicCategory.services.find(s => slugifyService(s.name) === slug);
    if (service) return { category: dynamicCategory, service };
    return null; // category is admin-managed but this slug isn't in it
  }

  return findServiceBySlug(categoryId, slug);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { categoryId, slug } = await params;
  const found = await findService(categoryId, slug);
  if (!found) {
    return { title: "Service Not Found | Bella & Guy Salon", robots: { index: false, follow: false } };
  }

  const { category, service } = found;
  const price = service.discountPercent
    ? Math.round(service.price * (1 - service.discountPercent / 100))
    : service.price;
  const description = (
    service.desc
      ? `${service.name} in Wave City, Ghaziabad — ${service.desc.replace(/\s*·\s*/g, ", ")}. ₹${price}${service.duration ? `, ${service.duration}` : ""}. Book at the salon or at home.`
      : `${service.name} (${category.label}) in Wave City, Ghaziabad from ₹${price}${service.duration ? `, ${service.duration}` : ""}. ${category.desc}. Book at the salon or at home.`
  ).slice(0, 300);

  return buildMetadata({
    path: `/services/${categoryId}/${slug}`,
    title: `${service.name} — ${category.label}`,
    description,
    ogImage: service.gallery?.[0] ?? category.imgs[0],
    keywords: [service.name, category.label, `${category.label} Ghaziabad`, `${service.name} Wave City`],
  });
}

export default async function ServicePage({
  params,
  searchParams,
}: {
  params: Promise<PageParams>;
  searchParams: Promise<{ gender?: string }>;
}) {
  const { categoryId, slug } = await params;
  const { gender: genderParam } = await searchParams;
  const found = await findService(categoryId, slug);
  if (!found) notFound();

  const gender: "female" | "male" = genderParam === "male" ? "male" : "female";
  const { category, service } = found;
  const path = `/services/${categoryId}/${slug}`;

  // Service + category FAQs render on the page — mirror them in FAQ schema.
  const faqs = [...(service.faqs ?? []), ...(category.faqs ?? [])];

  return (
    <>
      <JsonLd data={[
        webPageSchema({ path, title: `${service.name} — ${category.label}`, description: service.desc ?? category.desc }),
        serviceSchema(category, service),
        breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Services", path: "/#services" },
          { name: category.label, path: `/#services` },
          { name: service.name, path },
        ]),
        faqSchema(faqs),
      ]} />
      <ServiceDetail category={category} service={service} gender={gender} />
    </>
  );
}
