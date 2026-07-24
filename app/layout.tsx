import type { Metadata, Viewport } from "next";
import dynamic from "next/dynamic";
import InquiryProvider from "@/components/InquiryProvider";
import CartProvider from "@/components/CartProvider";
import JsonLd from "@/components/JsonLd";
import Analytics from "@/components/Analytics";
import { SITE_URL, SITE_NAME, THEME_COLOR, BUSINESS } from "@/lib/seo";
import { localBusinessSchema, webSiteSchema } from "@/lib/schema";
import { getPublicSettings } from "@/lib/settings";
import "./globals.css";

const PageTransition = dynamic(() => import("@/components/PageTransition"));

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: THEME_COLOR,
};

/**
 * Site-wide metadata defaults. Every page overrides title/description/canonical
 * through lib/seo.ts buildMetadata(); anything not overridden inherits from here.
 */
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicSettings();
  const siteName = settings.salon_name || SITE_NAME;

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: `${siteName} | Premium Unisex Salon & Home Beauty Service — Wave City, Ghaziabad`,
      template: `%s | ${siteName}`,
    },
    description:
      settings.salon_tagline ||
      "Premium unisex salon in Wave City, Ghaziabad. Expert beauty & grooming for men & women. At-salon & home service available. Book now!",
    applicationName: siteName,
    authors: [{ name: siteName, url: SITE_URL }],
    creator: siteName,
    publisher: siteName,
    formatDetection: { telephone: true, email: true, address: true },
    icons: {
      icon: "/images/logo.png",
      shortcut: "/images/logo.png",
      apple: "/images/logo.png",
    },
    appleWebApp: {
      capable: true,
      title: "Bella & Guy",
      statusBarStyle: "black-translucent",
    },
    openGraph: {
      type: "website",
      siteName,
      locale: "en_IN",
      url: SITE_URL,
      images: [{ url: `${SITE_URL}/images/salon-front.jpg`, width: 1200, height: 630, alt: siteName }],
    },
    twitter: { card: "summary_large_image" },
    verification: settings.seo_google_verification
      ? { google: settings.seo_google_verification, other: settings.seo_bing_verification ? { "msvalidate.01": settings.seo_bing_verification } : undefined }
      : undefined,
    other: { "geo.region": "IN-UP", "geo.placename": BUSINESS.locality, "geo.position": `${BUSINESS.lat};${BUSINESS.lng}`, ICBM: `${BUSINESS.lat}, ${BUSINESS.lng}` },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const settings = await getPublicSettings();

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,600&family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        {/* Sitewide entity graph — Organization/BeautySalon + WebSite (SearchAction). Kept in sync with the admin Settings tab. */}
        <JsonLd data={[localBusinessSchema(settings), webSiteSchema(settings)]} />
      </head>
      <body style={{ overflowX: "hidden" }}>
        <a href="#main-content" className="skip-link">Skip to main content</a>
        <CartProvider>
          <InquiryProvider>
            <PageTransition />
            {children}
          </InquiryProvider>
        </CartProvider>
        <Analytics />
      </body>
    </html>
  );
}
