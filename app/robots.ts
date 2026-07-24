import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

/**
 * Dynamic robots.txt — allows public pages, blocks admin/private/auth surfaces,
 * and references every sitemap.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/bg-secure-4x9k",   // admin panel
          "/admin",            // admin decoy redirect
          "/staff",            // staff dashboard
          "/login",            // staff/admin auth
          "/customer-login",   // customer auth
          "/reset-password",   // auth flow
          "/my-bookings",      // private customer data
          "/api/",             // private APIs
          "/_next/",           // build internals
        ],
      },
    ],
    sitemap: [
      `${SITE_URL}/sitemap.xml`,
      `${SITE_URL}/services-sitemap.xml`,
      `${SITE_URL}/image-sitemap.xml`,
    ],
    host: SITE_URL,
  };
}
