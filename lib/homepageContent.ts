import { supabase } from "./supabase";
import { uploadImage } from "./uploadImage";

export interface DBFeature {
  id: number;
  icon: string;
  title: string;
  description: string;
  badge: string | null;
  visible: boolean;
  sort_order: number;
}

export interface DBTestimonial {
  id: number;
  name: string;
  location: string | null;
  service: string | null;
  review: string;
  rating: number;
  initials: string | null;
  photo: string | null;
  visible: boolean;
  sort_order: number;
}

export interface DBGalleryImage {
  id: number;
  src: string;
  label: string | null;
  sub: string | null;
  /** SEO alt text, editable in the admin panel (supabase/seo.sql adds the column). Falls back to `label` when empty. */
  alt_text?: string | null;
  visible: boolean;
  sort_order: number;
}

export interface DBFaq {
  id: number;
  question: string;
  answer: string;
  visible: boolean;
  sort_order: number;
}

const CACHE_TTL_MS = 30_000;

function makeCachedFetcher<T>(table: string) {
  let cache: { data: T[]; fetchedAt: number } | null = null;
  let inFlight: Promise<T[]> | null = null;

  return async function fetchVisible(): Promise<T[]> {
    if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) return cache.data;
    if (inFlight) return inFlight;

    inFlight = (async () => {
      try {
        const { data, error } = await supabase.from(table).select("*").eq("visible", true).order("sort_order");
        const result = (!error && data) ? (data as T[]) : [];
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
  };
}

/** Public-facing (visible-only) homepage content. Empty array means "table has no rows / not set up yet / fetch failed" — callers should fall back to the site's hardcoded defaults in every case. */
export const getHomepageFeatures = makeCachedFetcher<DBFeature>("homepage_features");
export const getTestimonials = makeCachedFetcher<DBTestimonial>("testimonials");
export const getGalleryImages = makeCachedFetcher<DBGalleryImage>("gallery_images");
export const getFaqs = makeCachedFetcher<DBFaq>("faqs");

/** Compresses and uploads a single image to the `site-images` Storage bucket, returning its public URL. */
export function uploadSiteImage(file: File): Promise<string> {
  return uploadImage(file, "site-images");
}
