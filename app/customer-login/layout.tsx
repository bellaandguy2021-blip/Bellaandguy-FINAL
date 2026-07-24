import type { Metadata } from "next";

// Auth page — never indexed.
export const metadata: Metadata = {
  title: "Customer Login",
  robots: { index: false, follow: false },
};

export default function CustomerLoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
