import type { Metadata } from "next";

// Staff dashboard — never indexed.
export const metadata: Metadata = {
  title: "Staff Dashboard",
  robots: { index: false, follow: false },
};

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return children;
}
