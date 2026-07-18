import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findServiceBySlug, slugifyService } from "@/lib/servicesData";
import { getDynamicCategories } from "@/lib/dynamicServices";
import ServiceDetail from "@/components/ServiceDetail";

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
  if (!found) return { title: "Service Not Found | Bella & Guy" };
  return {
    title: `${found.service.name} | Bella & Guy Salon`,
    description: found.service.desc ?? found.category.desc,
  };
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

  return <ServiceDetail category={found.category} service={found.service} gender={gender} />;
}
