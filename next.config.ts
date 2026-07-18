import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  turbopack: { root: __dirname },
  compress: true,
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    minimumCacheTTL: 86400,
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "images.pexels.com" },
      // Next's built-in image optimizer proxy rejects fetching Supabase Storage
      // URLs in some network environments (DNS resolves to an address its SSRF
      // guard treats as private, so /_next/image 400s even though the URL loads
      // fine directly). unoptimized:true skips that proxy for ALL images — the
      // browser fetches originals directly instead, trading automatic
      // resize/format-conversion for guaranteed loading.
      { protocol: "https", hostname: "*.supabase.co" },
    ],
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: "/images/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" },
        ],
      },
    ];
  },
};

export default nextConfig;
