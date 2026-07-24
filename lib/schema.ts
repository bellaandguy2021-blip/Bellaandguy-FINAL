import { BUSINESS, SITE_URL, SITE_NAME, absoluteUrl } from "./seo";
import type { Category, ServiceItem, Faq } from "./servicesData";
import { slugifyService } from "./servicesData";

/* ────────────────────────────────────────────────────────────────────────────
 * Dynamic JSON-LD builders (schema.org).
 *
 * Pure functions: content in → schema objects out, so structured data always
 * mirrors what the page actually renders. Serialized via <JsonLd/> which
 * escapes `<` to prevent script-tag injection from user-managed content.
 *
 * Admin-managed settings (phone, address, hours) are passed in where relevant
 * so schema stays synchronized with the Settings tab without extra fetches.
 * ──────────────────────────────────────────────────────────────────────────── */

type Jsonable = Record<string, unknown>;

const ORG_ID = `${SITE_URL}/#organization`;
const SITE_ID = `${SITE_URL}/#website`;

/** Shared LocalBusiness/BeautySalon node. Settings override hardcoded facts. */
export function localBusinessSchema(settings: Record<string, string> = {}): Jsonable {
  const name = settings.salon_name || BUSINESS.name;
  return {
    "@context": "https://schema.org",
    "@type": ["BeautySalon", "HealthAndBeautyBusiness", "LocalBusiness"],
    "@id": ORG_ID,
    name,
    legalName: BUSINESS.legalName,
    description: settings.salon_tagline || BUSINESS.tagline,
    url: SITE_URL,
    telephone: settings.salon_phone || BUSINESS.phone,
    email: settings.salon_email || BUSINESS.email,
    priceRange: BUSINESS.priceRange,
    foundingDate: BUSINESS.foundingYear,
    currenciesAccepted: "INR",
    paymentAccepted: "Cash, UPI, Credit Card, Debit Card",
    image: [absoluteUrl("/images/salon-front.jpg"), absoluteUrl("/images/interior1.jpg"), absoluteUrl("/images/reception.jpg")],
    logo: { "@type": "ImageObject", url: absoluteUrl("/images/logo.png") },
    address: {
      "@type": "PostalAddress",
      streetAddress: settings.salon_address || BUSINESS.streetAddress,
      addressLocality: BUSINESS.locality,
      addressRegion: BUSINESS.region,
      postalCode: BUSINESS.postalCode,
      addressCountry: BUSINESS.country,
    },
    geo: { "@type": "GeoCoordinates", latitude: BUSINESS.lat, longitude: BUSINESS.lng },
    hasMap: BUSINESS.mapUrl,
    areaServed: {
      "@type": "GeoCircle",
      geoMidpoint: { "@type": "GeoCoordinates", latitude: BUSINESS.lat, longitude: BUSINESS.lng },
      geoRadius: `${BUSINESS.serviceRadiusKm * 1000}`,
    },
    openingHoursSpecification: [{
      "@type": "OpeningHoursSpecification",
      dayOfWeek: [...BUSINESS.openingDays],
      opens: BUSINESS.opens,
      closes: BUSINESS.closes,
    }],
    contactPoint: [{
      "@type": "ContactPoint",
      telephone: settings.salon_phone || BUSINESS.phone,
      contactType: "customer service",
      areaServed: "IN",
      availableLanguage: ["en", "hi"],
    }],
    sameAs: [settings.instagram_url || BUSINESS.instagram],
  };
}

/** WebSite node with SearchAction (services search deep-links into /book). */
export function webSiteSchema(settings: Record<string, string> = {}): Jsonable {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": SITE_ID,
    url: SITE_URL,
    name: settings.salon_name || SITE_NAME,
    publisher: { "@id": ORG_ID },
    inLanguage: "en-IN",
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/book?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

/** Per-page WebPage node, linked to the site + org graph. */
export function webPageSchema(opts: { path: string; title: string; description: string }): Jsonable {
  const url = absoluteUrl(opts.path);
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${url}#webpage`,
    url,
    name: opts.title,
    description: opts.description,
    isPartOf: { "@id": SITE_ID },
    about: { "@id": ORG_ID },
    inLanguage: "en-IN",
  };
}

export interface Crumb { name: string; path: string }

export function breadcrumbSchema(crumbs: Crumb[]): Jsonable {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: absoluteUrl(c.path),
    })),
  };
}

export function faqSchema(faqs: Faq[]): Jsonable | null {
  if (!faqs.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(f => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

/** Service schema for a detail page — price, duration, provider, images all from live content. */
export function serviceSchema(category: Category, service: ServiceItem): Jsonable {
  const path = `/services/${category.id}/${slugifyService(service.name)}`;
  const price = service.discountPercent
    ? Math.round(service.price * (1 - service.discountPercent / 100))
    : service.price;
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${absoluteUrl(path)}#service`,
    name: service.name,
    serviceType: category.label,
    description: service.longDesc || service.desc || category.desc,
    url: absoluteUrl(path),
    provider: { "@id": ORG_ID },
    areaServed: { "@type": "City", name: BUSINESS.locality },
    ...(service.gallery?.length
      ? { image: service.gallery.map(g => absoluteUrl(g)) }
      : category.imgs.length ? { image: category.imgs.map(g => absoluteUrl(g)) } : {}),
    offers: {
      "@type": "Offer",
      price,
      priceCurrency: "INR",
      availability: "https://schema.org/InStock",
      url: absoluteUrl(path),
    },
  };
}

export interface ReviewInput { name: string; review: string; rating: number }

/** Org-level reviews + aggregate rating from the live testimonials table. */
export function reviewsSchema(reviews: ReviewInput[]): Jsonable | null {
  if (!reviews.length) return null;
  const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
  return {
    "@context": "https://schema.org",
    "@type": "BeautySalon",
    "@id": ORG_ID,
    name: BUSINESS.name,
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: Number(avg.toFixed(1)),
      reviewCount: reviews.length,
      bestRating: 5,
      worstRating: 1,
    },
    review: reviews.slice(0, 10).map(r => ({
      "@type": "Review",
      author: { "@type": "Person", name: r.name },
      reviewBody: r.review,
      reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5, worstRating: 1 },
    })),
  };
}

export function imageObjectSchema(url: string, caption?: string): Jsonable {
  return {
    "@context": "https://schema.org",
    "@type": "ImageObject",
    contentUrl: absoluteUrl(url),
    ...(caption ? { caption } : {}),
  };
}
