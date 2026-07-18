import type { Metadata } from "next";
import dynamic from "next/dynamic";
import InquiryProvider from "@/components/InquiryProvider";
import CartProvider from "@/components/CartProvider";
import "./globals.css";

const PageTransition = dynamic(() => import("@/components/PageTransition"));

export const metadata: Metadata = {
  title: "Bella & Guy | Premium Unisex Salon — Wave City, Ghaziabad",
  description: "Premium unisex salon in Wave City, Ghaziabad. Expert beauty & grooming for men & women. At-salon & home service available. Book now!",
  keywords: "salon Wave City, unisex salon Ghaziabad, beauty salon, home service salon, bridal makeup, hair color, facial",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,600&family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ overflowX: "hidden" }}>
        <CartProvider>
          <InquiryProvider>
            <PageTransition />
            {children}
          </InquiryProvider>
        </CartProvider>
      </body>
    </html>
  );
}