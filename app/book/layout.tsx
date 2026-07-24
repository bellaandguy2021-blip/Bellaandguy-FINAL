import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import { buildMetadata } from "@/lib/seo";
import { webPageSchema, breadcrumbSchema } from "@/lib/schema";

const BOOK_TITLE = "Book an Appointment — Salon & Home Beauty Services";
const BOOK_DESCRIPTION =
  "Book your salon or home beauty appointment in Wave City, Ghaziabad. Facials, waxing, hair spa, hair color, manicure, men's grooming & more — choose your service, date and time in minutes.";

export function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    path: "/book",
    title: BOOK_TITLE,
    description: BOOK_DESCRIPTION,
    keywords: ["book salon appointment Ghaziabad", "home salon booking Wave City", "salon appointment online"],
  });
}

export default function BookLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={[
        webPageSchema({ path: "/book", title: BOOK_TITLE, description: BOOK_DESCRIPTION }),
        breadcrumbSchema([{ name: "Home", path: "/" }, { name: "Book Appointment", path: "/book" }]),
      ]} />
      <main id="main-content">{children}</main>
    </>
  );
}
