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

const HOME_TITLE = "Bella & Guy | Premium Unisex Salon in Wave City, Ghaziabad";
const HOME_DESCRIPTION =
  "Bella & Guy is Wave City, Ghaziabad's trusted unisex salon — facials, waxing, hair color, manicure & grooming, at the salon or at your doorstep.";

export function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    path: "/",
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    absoluteTitle: true,
    keywords: [
      "salon Wave City", "unisex salon Ghaziabad", "home salon service Ghaziabad",
      "beauty salon Wave City", "bridal makeup Ghaziabad", "hair color", "facial at home",
      "premium salon Ghaziabad", "budget friendly salon Wave City", "affordable home salon service",
      "best home salon Ghaziabad", "premium yet affordable salon",
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
      <section style={{ background: "#080808", padding: "56px 24px", textAlign: "center" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <h2 style={{
            fontFamily: "'Cormorant Garamond', serif", fontWeight: 400,
            fontSize: "clamp(24px, 3.4vw, 32px)", color: "#fff", marginBottom: 14, lineHeight: 1.2,
          }}>
            Welcome to <em style={{ color: "#C9A84C", fontStyle: "italic" }}>Bella &amp; Guy</em> Unisex Salon
          </h2>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14.5, lineHeight: 1.75 }}>
            Bella &amp; Guy is Wave City, Ghaziabad&apos;s trusted unisex salon — a premium yet budget-friendly
            choice for hair, skin and grooming services for men and women. Visit our salon in Wave City, or book
            a certified expert for home service — the same premium products and 5-star experience, wherever you are.
          </p>
        </div>
      </section>
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
