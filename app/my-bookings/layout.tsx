import type { Metadata } from "next";

// Private customer data — never indexed.
export const metadata: Metadata = {
  title: "My Bookings",
  robots: { index: false, follow: false },
};

export default function MyBookingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
