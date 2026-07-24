import type { Metadata } from "next";
import { supabase } from "./supabase";
import { getPublicSettings } from "./settings";
import { SALON_LAT, SALON_LNG } from "./geo";

/* ────────────────────────────────────────────────────────────────────────────
 * Centralized SEO engine.
 *
 * Single source of truth for every page's <head>: titles, descriptions,
 * canonicals, robots, Open Graph, Twitter cards. Values resolve in priority:
 *
 *   1. Admin "SEO" tab override for the exact path  (page_seo table)
 *   2. Page-supplied defaults                        (buildMetadata() args)
 *   3. Site-wide business settings                   (settings table)
 *   4. Hardcoded fallbacks below
 *
 * Nothing here throws — SEO must never take a page down. All Supabase reads
 * are cached + de-duped exactly like lib/settings.ts.
 * ──────────────────────────────────────────────────────────────────────────── */

/** Canonical production origin. Overridable per-deploy without a code change. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://bellaandguy.in").replace(/\/+$/, "");

export const SITE_NAME = "Bella & Guy Salon";
export const THEME_COLOR = "#C9A84C"; // brand gold — used for theme-color + manifest

/** Hardcoded business facts used as final fallbacks (admin settings override these at runtime). */
export const BUSINESS = {
  name: "Bella & Guy Salon",
  legalName: "Bella & Guy Unisex Salon",
  tagline: "Premium Unisex Salon & Home Beauty Service",
  phone: "+91 96259 28495",
  whatsapp: "+919999601212",
  email: "hello@bellaguysalon.com",
  streetAddress: "Wave Galleria Shopping Complex, Wave City",
  locality: "Ghaziabad",
  region: "Uttar Pradesh",
  postalCode: "201003",
  country: "IN",
  lat: SALON_LAT,
  lng: SALON_LNG,
  serviceRadiusKm: 15,
  /** Mon–Sun 9:00–20:00 in schema.org OpeningHoursSpecification form. */
  openingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
  opens: "09:00",
  closes: "20:00",
  foundingYear: "2020",
  priceRange: "₹₹",
  instagram: "https://www.instagram.com/bellaandguy_",
  mapUrl: "https://www.google.com/maps?q=Wave+Galleria+Shopping+Complex+Wave+City+Ghaziabad",
} as const;

export interface PageSeoRow {
  path: string;
  title: string | null;
  description: string | null;
  focus_keyword: string | null;
  canonical_url: string | null;
  robots_index: boolean;
  robots_follow: boolean;
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
  twitter_card: string;
  twitter_title: string | null;
  twitter_description: string | null;
  updated_at?: string;
}

/* ── page_seo cache (same pattern as lib/settings.ts) ─────────────────────── */

const CACHE_TTL_MS = 60_000;
let cache: { data: Map<string, PageSeoRow>; fetchedAt: number } | null = null;
let inFlight: Promise<Map<string, PageSeoRow>> | null = null;

/** All admin SEO overrides, keyed by path. {} on any failure — pages always render. */
export async function getPageSeoMap(): Promise<Map<string, PageSeoRow>> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) return cache.data;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const { data, error } = await supabase.from("page_seo").select("*");
      const map = new Map<string, PageSeoRow>();
      if (!error && data) (data as PageSeoRow[]).forEach(r => map.set(normalizePath(r.path), r));
      cache = { data: map, fetchedAt: Date.now() };
      return map;
    } catch {
      cache = { data: new Map(), fetchedAt: Date.now() };
      return new Map<string, PageSeoRow>();
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

export function normalizePath(path: string): string {
  let p = (path || "/").trim();
  if (!p.startsWith("/")) p = "/" + p;
  if (p.length > 1) p = p.replace(/\/+$/, "");
  return p.toLowerCase();
}

/** Absolute canonical URL for a site-relative path. */
export function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return SITE_URL + (path.startsWith("/") ? path : `/${path}`);
}

/* ── metadata generator ───────────────────────────────────────────────────── */

export interface BuildMetadataInput {
  /** Site-relative path this page canonicalizes to, e.g. "/about". */
  path: string;
  /** Page-level default title (already unique per page). Suffix added automatically unless `absoluteTitle`. */
  title: string;
  description: string;
  /** Skip the "| Bella & Guy Salon" suffix (used by the home page, which embeds the brand itself). */
  absoluteTitle?: boolean;
  ogImage?: string;
  /** Force noindex regardless of admin override (auth/private pages). */
  noindex?: boolean;
  keywords?: string[];
}

/**
 * The one metadata generator every page goes through.
 * Merges admin overrides → page defaults → site fallbacks into a Next Metadata object.
 */
export async function buildMetadata(input: BuildMetadataInput): Promise<Metadata> {
  const path = normalizePath(input.path);

  // Admin override + site settings in parallel; both fail-soft to defaults.
  const [seoMap, settings] = await Promise.all([getPageSeoMap(), getPublicSettings()]);
  const row = seoMap.get(path);

  const siteName = settings.salon_name || SITE_NAME;
  const suffix = ` | ${siteName}`;

  const baseTitle = row?.title || input.title;
  const title = input.absoluteTitle && !row?.title ? baseTitle : baseTitle.endsWith(siteName) ? baseTitle : baseTitle + suffix;
  const description = row?.description || input.description;

  // `absolute` bypasses the root layout's `%s | siteName` template — the suffix
  // is already applied here (admin overrides may carry their own branding).
  const titleMeta = { absolute: title };
  const canonical = row?.canonical_url?.trim() ? absoluteUrl(row.canonical_url.trim()) : absoluteUrl(path);

  const ogTitle = row?.og_title || title;
  const ogDescription = row?.og_description || description;
  const ogImage = row?.og_image || input.ogImage || absoluteUrl("/images/salon-front.jpg");

  const index = input.noindex ? false : row ? row.robots_index : true;
  const follow = input.noindex ? false : row ? row.robots_follow : true;

  return {
    title: titleMeta,
    description,
    keywords: input.keywords,
    alternates: { canonical },
    robots: {
      index,
      follow,
      googleBot: { index, follow, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
    },
    openGraph: {
      type: "website",
      siteName,
      title: ogTitle,
      description: ogDescription,
      url: canonical,
      locale: "en_IN",
      images: [{ url: absoluteUrl(ogImage), width: 1200, height: 630, alt: ogTitle }],
    },
    twitter: {
      card: (row?.twitter_card as "summary" | "summary_large_image") || "summary_large_image",
      title: row?.twitter_title || ogTitle,
      description: row?.twitter_description || ogDescription,
      images: [absoluteUrl(ogImage)],
    },
  };
}
