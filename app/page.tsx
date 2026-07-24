import type { Metadata } from "next";
import dynamic from "next/dynamic";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import InquiryButton from "@/components/InquiryButton";
import JsonLd from "@/components/JsonLd";
import { buildMetadata } from "@/lib/seo";
import { webPageSchema, faqSchema, reviewsSchema, breadcrumbSchema } from "@/lib/schema";
import { getFaqs, getTestimonials } from "@/lib/homepageContent";

const MarqueeTicker  = dynamic(() => import("@/components/MarqueeTicker"));
const Services       = dynamic(() => import("@/components/Services"));
const WhyChooseUs    = dynamic(() => import("@/components/WhyChooseUs"));
const Gallery        = dynamic(() => import("@/components/Gallery"));
const Reviews        = dynamic(() => import("@/components/Reviews"));
const Faq            = dynamic(() => import("@/components/Faq"));
const Contact        = dynamic(() => import("@/components/Contact"));
const GoogleMap      = dynamic(() => import("@/components/GoogleMap"));
const Footer         = dynamic(() => import("@/components/Footer"));
const WhatsAppButton = dynamic(() => import("@/components/WhatsAppButton"));
const Divider        = dynamic(() => import("@/components/Divider"));

const HOME_TITLE = "Bella & Guy Salon | Premium Unisex Salon & Home Beauty Service — Wave City, Ghaziabad";
const HOME_DESCRIPTION =
  "Premium unisex salon in Wave City, Ghaziabad. Expert facials, waxing, hair spa, hair color, manicure & men's grooming — at the salon or at your doorstep. Book your home service today!";

export function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    path: "/",
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    absoluteTitle: true,
    keywords: [
      "salon Wave City", "unisex salon Ghaziabad", "home salon service Ghaziabad",
      "beauty salon Wave City", "bridal makeup Ghaziabad", "hair color", "facial at home",
    ],
  });
}

export default async function Home() {
  // Live content for structured data — the same Supabase rows the visible
  // sections render, so schema and page never drift apart.
  const [faqs, testimonials] = await Promise.all([getFaqs(), getTestimonials()]);

  return (
    <main id="main-content">
      <JsonLd data={[
        webPageSchema({ path: "/", title: HOME_TITLE, description: HOME_DESCRIPTION }),
        breadcrumbSchema([{ name: "Home", path: "/" }]),
        faqSchema(faqs.map(f => ({ q: f.question, a: f.answer }))),
        reviewsSchema(testimonials.map(t => ({ name: t.name, review: t.review, rating: t.rating }))),
      ]} />
      <Navbar />
      <Hero />
      <MarqueeTicker />
      <Services />
      <Divider />
      <WhyChooseUs />
      <Divider />
      <Gallery />
      <Divider dark />
      <Reviews />
      <Divider />
      <Faq />
      <Contact />
      <GoogleMap />
      <Footer />
      <WhatsAppButton />
      <InquiryButton variant="floating" type="franchise" />
    </main>
  );
}
