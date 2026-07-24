import type { Metadata } from "next";

// Auth page — never indexed.
export const metadata: Metadata = {
  title: "Staff Login",
  robots: { index: false, follow: false },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
