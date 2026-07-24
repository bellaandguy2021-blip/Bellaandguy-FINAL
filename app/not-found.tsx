import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page Not Found | Bella & Guy Salon",
  robots: { index: false, follow: true },
};

/** Premium branded 404 — guides lost visitors (and crawlers) back to the money pages. */
export default function NotFound() {
  const links = [
    { href: "/", label: "Home" },
    { href: "/#services", label: "Our Services" },
    { href: "/book", label: "Book Appointment" },
    { href: "/about", label: "About Us" },
    { href: "/#contact", label: "Contact" },
  ];

  return (
    <main
      id="main-content"
      style={{
        minHeight: "100vh",
        background: "#080808",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 24px",
        fontFamily: "'Inter', sans-serif",
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: 560 }}>
        <div
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 15,
            color: "rgba(201,168,76,0.7)",
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            marginBottom: 20,
          }}
        >
          Bella &amp; Guy Salon
        </div>

        <div
          aria-hidden="true"
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "clamp(88px, 18vw, 150px)",
            fontWeight: 300,
            lineHeight: 1,
            color: "#C9A84C",
            marginBottom: 8,
          }}
        >
          404
        </div>

        <h1
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "clamp(24px, 4.5vw, 36px)",
            fontWeight: 300,
            color: "#fff",
            marginBottom: 14,
          }}
        >
          This page has left the <span style={{ color: "#C9A84C", fontStyle: "italic" }}>salon</span>
        </h1>

        <p style={{ fontSize: 14.5, color: "rgba(255,255,255,0.45)", lineHeight: 1.7, marginBottom: 32 }}>
          The page you&apos;re looking for doesn&apos;t exist or may have moved.
          Let&apos;s get you back to something beautiful.
        </p>

        <nav aria-label="Helpful links" style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", marginBottom: 36 }}>
          {links.map(l => (
            <Link
              key={l.href}
              href={l.href}
              style={{
                padding: "10px 20px",
                border: "1px solid rgba(201,168,76,0.35)",
                borderRadius: 30,
                color: "#E8C96D",
                fontSize: 12.5,
                fontWeight: 600,
                letterSpacing: "0.04em",
                textDecoration: "none",
                background: "rgba(201,168,76,0.06)",
              }}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <Link
          href="/book"
          style={{
            display: "inline-block",
            padding: "14px 34px",
            background: "linear-gradient(135deg, #C9A84C, #E8C96D)",
            color: "#080808",
            borderRadius: 12,
            fontSize: 13.5,
            fontWeight: 700,
            letterSpacing: "0.05em",
            textDecoration: "none",
          }}
        >
          Book a Home Service →
        </Link>
      </div>
    </main>
  );
}
