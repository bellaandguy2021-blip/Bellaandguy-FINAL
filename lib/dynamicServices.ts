import { supabase } from "./supabase";
import { uploadImage } from "./uploadImage";
import { Category, ServiceItem, allCategories as staticCategories } from "./servicesData";

export interface DBCategory {
  id: string;
  label: string;
  description: string;
  icon: string;
  color: string;
  gender: "female" | "male" | "both";
  home_service: boolean;
  images: string[];
  /** Photos shown in the Men section; falls back to `images` when empty. Missing (undefined) until supabase/services-v4.sql has been run. */
  images_male?: string[];
  sort_order: number;
}

export interface DBService {
  id: number;
  category_id: string;
  name: string;
  price: number;
  duration: string | null;
  group_name: string | null;
  description: string | null;
  popular: boolean;
  images: string[];
  sort_order: number;
  discount_percent: number | null;
  long_description: string | null;
  included_steps: string[];
  benefits: string[];
  before_images: string[];
  after_images: string[];
  faqs: { q: string; a: string }[];
  trending: boolean;
  section: string | null;
}

const CACHE_TTL_MS = 30_000;
let cache: { data: Category[]; fetchedAt: number } | null = null;
let inFlight: Promise<Category[]> | null = null;

/** Admin-created categories/services, shaped to match the static `Category[]` from servicesData.ts so they can be concatenated directly into the same list everywhere on the site. */
export async function getDynamicCategories(): Promise<Category[]> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) return cache.data;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const [{ data: cats, error: catErr }, { data: services, error: svcErr }] = await Promise.all([
        supabase.from("service_categories").select("*").order("sort_order"),
        supabase.from("services").select("*").order("sort_order"),
      ]);
      if (catErr || svcErr || !cats) { cache = { data: [], fetchedAt: Date.now() }; return []; }

      const result: Category[] = (cats as DBCategory[]).map(cat => {
        const catServices: ServiceItem[] = (services as DBService[] ?? [])
          .filter(s => s.category_id === cat.id)
          .map(s => ({
            name: s.name,
            price: s.price,
            popular: s.popular,
            trending: s.trending,
            duration: s.duration ?? undefined,
            group: s.group_name ?? undefined,
            desc: s.description ?? undefined,
            gallery: s.images?.length ? s.images : undefined,
            discountPercent: s.discount_percent ?? undefined,
            longDesc: s.long_description ?? undefined,
            includedSteps: s.included_steps?.length ? s.included_steps : undefined,
            benefits: s.benefits?.length ? s.benefits : undefined,
            beforeImages: s.before_images?.length ? s.before_images : undefined,
            afterImages: s.after_images?.length ? s.after_images : undefined,
            faqs: s.faqs?.length ? s.faqs : undefined,
            section: s.section ?? undefined,
          }));
        return {
          id: cat.id,
          label: cat.label,
          desc: cat.description,
          icon: cat.icon,
          color: cat.color,
          imgs: cat.images?.length ? cat.images : ["/images/interior1.jpg"],
          // DB male photos when set; otherwise keep the static catalog's male
          // set for imported categories (the DB row predates images_male, so
          // an empty column must not wipe the site's Men-section photos).
          imgsMale: cat.images_male?.length
            ? cat.images_male
            : staticCategories.find(sc => sc.id === cat.id)?.imgsMale,
          homeService: cat.home_service,
          gender: cat.gender,
          services: catServices,
          adminOrdered: true,
        };
      }).filter(cat => cat.services.length > 0);

      cache = { data: result, fetchedAt: Date.now() };
      return result;
    } catch {
      cache = { data: [], fetchedAt: Date.now() };
      return [];
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

export function invalidateDynamicCategoriesCache() {
  cache = null;
}

/**
 * Combines the static catalog (lib/servicesData.ts) with the admin-managed one
 * (Supabase). Where a category id exists in both, the Supabase version wins —
 * once the admin panel "imports" a category and edits it, that edit is what
 * the live site shows instead of the original hardcoded version.
 */
export function mergeCategories(staticCats: Category[], dynamicCats: Category[]): Category[] {
  const dynamicIds = new Set(dynamicCats.map(c => c.id));
  return [...staticCats.filter(c => !dynamicIds.has(c.id)), ...dynamicCats];
}

/** Compresses and uploads a single image to the `service-images` Storage bucket, returning its public URL. */
export function uploadServiceImage(file: File): Promise<string> {
  return uploadImage(file, "service-images");
}
