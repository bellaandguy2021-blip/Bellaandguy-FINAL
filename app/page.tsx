import dynamic from "next/dynamic";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import InquiryButton from "@/components/InquiryButton";

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

export default function Home() {
  return (
    <main>
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
