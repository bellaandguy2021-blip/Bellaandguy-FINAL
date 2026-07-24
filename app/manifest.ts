import type { MetadataRoute } from "next";
import { SITE_NAME, THEME_COLOR, BUSINESS } from "@/lib/seo";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: "Bella & Guy",
    description: BUSINESS.tagline,
    start_url: "/",
    display: "standalone",
    background_color: "#080808",
    theme_color: THEME_COLOR,
    categories: ["beauty", "lifestyle", "health"],
    icons: [
      { src: "/images/logo.png", sizes: "any", type: "image/png", purpose: "any" },
      { src: "/images/logo.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
