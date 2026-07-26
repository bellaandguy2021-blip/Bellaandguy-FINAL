"use client";
import { useState, useEffect } from "react";
import { getPublicSettings } from "../lib/settings";

export default function Footer() {
  const [siteSettings, setSiteSettings] = useState<Record<string, string>>({});
  useEffect(() => { getPublicSettings().then(setSiteSettings); }, []);

  const salonPhone = siteSettings.salon_phone || "+91 96259 28495";
  const salonPhoneHref = `tel:${salonPhone.replace(/[^\d+]/g, "")}`;
  const waNumber = (siteSettings.owner_whatsapp || "919999601212").replace(/\D/g, "");
  const waMessage = siteSettings.whatsapp_message || "Hi! I'd like to book an appointment at Bella & Guy Salon.";
  const waHref = `https://wa.me/${waNumber}?text=${encodeURIComponent(waMessage)}`;
  const instagramUrl = siteSettings.instagram_url || "https://www.instagram.com/bellaandguy_";

  const services = ["Waxing", "D-Tan & Bleach", "Cleanups", "Facials", "Japanese Rituals", "Manicure & Pedicure", "Body Services", "Hair Spa", "Hair Color", "Men's Grooming", "Men's Color"];
  const links = [
    { label: "Home", href: "#home" },
    { label: "Services", href: "#services" },
    { label: "Home Service", href: "#services" },
    { label: "Gallery", href: "#gallery" },
    { label: "Book Appointment", href: "/#services" },
    { label: "Contact", href: "#contact" },
    { label: "About Us", href: "/about" },
  ];

  return (
    <>
      <style>{`
        .footer {
          background: #080808;
          border-top: 1px solid rgba(201,168,76,0.1);
        }

        .footer-main {
          max-width: 1260px;
          margin: 0 auto;
          padding: 80px 32px 56px;
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1.5fr;
          gap: 60px;
        }

        .footer-brand-name {
          font-family: 'Cormorant Garamond', serif;
          font-size: 28px;
          font-weight: 500;
          color: #FFFFFF;
          letter-spacing: 0.02em;
          margin-bottom: 4px;
        }

        .footer-brand-sub {
          font-size: 9px;
          color: rgba(201,168,76,0.6);
          letter-spacing: 0.28em;
          text-transform: uppercase;
          margin-bottom: 24px;
        }

        .footer-desc {
          color: rgba(255,255,255,0.3);
          font-size: 14px;
          line-height: 1.75;
          max-width: 240px;
          margin-bottom: 28px;
        }

        .footer-col-title {
          color: rgba(255,255,255,0.5);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          margin-bottom: 24px;
        }

        .footer-link {
          display: block;
          color: rgba(255,255,255,0.3);
          font-size: 14px;
          text-decoration: none;
          margin-bottom: 12px;
          transition: color 0.2s ease;
        }
        .footer-link:hover { color: #C9A84C; }

        .footer-contact-item {
          display: block;
          color: rgba(255,255,255,0.3);
          font-size: 14px;
          margin-bottom: 12px;
          line-height: 1.5;
          text-decoration: none;
          transition: color 0.2s ease;
        }
        a.footer-contact-item:hover { color: #C9A84C; }

        .footer-bottom {
          border-top: 1px solid rgba(255,255,255,0.05);
          max-width: 1260px;
          margin: 0 auto;
          padding: 24px 32px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
        }

        .footer-copyright {
          color: rgba(255,255,255,0.18);
          font-size: 12.5px;
        }

        .footer-location {
          display: flex;
          align-items: center;
          gap: 8px;
          color: rgba(255,255,255,0.15);
          font-size: 12px;
        }

        .footer-social-row {
          display: flex;
          gap: 10px;
          margin-top: 4px;
        }

        .footer-social-btn {
          width: 34px; height: 34px;
          border-radius: 3px;
          border: 1px solid rgba(255,255,255,0.08);
          display: flex; align-items: center; justify-content: center;
          font-size: 14px;
          transition: all 0.25s ease;
          cursor: pointer;
          text-decoration: none;
        }
        .footer-social-btn:hover {
          border-color: rgba(201,168,76,0.3);
          background: rgba(201,168,76,0.08);
        }

        .footer-book-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-top: 16px;
          background: linear-gradient(135deg, #E8C96D, #C9A84C);
          color: #080808;
          padding: 11px 24px;
          border-radius: 3px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          text-decoration: none;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .footer-book-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(201,168,76,0.35);
        }

        @media (max-width: 900px) {
          .footer-main {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (max-width: 560px) {
          .footer-main {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 480px) {
          .footer-main { padding: 48px 16px 32px; gap: 32px; }
          .footer-bottom { padding: 20px 16px; }
          .footer-social-btn { width: 40px; height: 40px; font-size: 16px; }
          .footer-book-btn { width: 100%; justify-content: center; }
        }
      `}</style>

      <footer className="footer">
        <div className="footer-main">
          <div>
            <div className="footer-brand-name">
              Bella <span style={{ color: "#C9A84C" }}>&</span> Guy
            </div>
            <div className="footer-brand-sub">Home Beauty Service · Wave City</div>
            <p className="footer-desc">
              Premium beauty & grooming delivered to your doorstep. Certified professionals, 50+ services, zero travel needed.
            </p>
            <div className="footer-social-row">
              {/* Instagram */}
              <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="footer-social-btn" title="Follow us on Instagram" style={{ color: "rgba(255,255,255,0.35)" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                </svg>
              </a>
              {/* WhatsApp */}
              <a href={waHref} target="_blank" rel="noopener noreferrer" className="footer-social-btn" title="Chat on WhatsApp" style={{ color: "rgba(255,255,255,0.35)" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
                </svg>
              </a>
            </div>
          </div>

          <div>
            <div className="footer-col-title">Services</div>
            {services.map((s, i) => (
              <a key={i} href="#services" className="footer-link">{s}</a>
            ))}
          </div>

          <div>
            <div className="footer-col-title">Quick Links</div>
            {links.filter(l => l.label !== "Home Service").map((l, i) => (
              <a key={i} href={l.href} className="footer-link">
                {l.label === "Book Appointment" ? "Book Home Service" : l.label}
              </a>
            ))}
          </div>

          <div>
            <div className="footer-col-title">Contact</div>
            <span className="footer-contact-item">{siteSettings.salon_address || "Wave City, Ghaziabad, UP 201003"}</span>
            <a href={salonPhoneHref} className="footer-contact-item">{salonPhone}</a>
            <span className="footer-contact-item">{siteSettings.salon_hours || "Mon – Sun, 9:00 AM – 8:00 PM"}</span>
            <a href="/#services" className="footer-book-btn">
              Book Home Service →
            </a>
          </div>
        </div>

        <div className="footer-bottom">
          <span className="footer-copyright">© 2026 Bella & Guy. All Rights Reserved.</span>
          <a href="/about#terms" style={{
            display: "inline-flex", alignItems: "center", gap: "6px",
            fontSize: "11px", fontWeight: 600, letterSpacing: "0.1em",
            color: "rgba(201,168,76,0.6)", textDecoration: "none",
            textTransform: "uppercase", border: "1px solid rgba(201,168,76,0.2)",
            padding: "6px 14px", borderRadius: "4px", transition: "all 0.25s ease",
          }}
            onMouseEnter={e => { e.currentTarget.style.color = "#C9A84C"; e.currentTarget.style.borderColor = "rgba(201,168,76,0.5)"; e.currentTarget.style.background = "rgba(201,168,76,0.07)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "rgba(201,168,76,0.6)"; e.currentTarget.style.borderColor = "rgba(201,168,76,0.2)"; e.currentTarget.style.background = "transparent"; }}>
            📋 Terms &amp; Conditions
          </a>
          <a href="/login" style={{ fontSize: "11px", color: "rgba(255,255,255,0.08)", textDecoration: "none", letterSpacing: "0.06em", transition: "color 0.3s ease" }}
            onMouseEnter={e => (e.currentTarget.style.color = "rgba(201,168,76,0.5)") as any}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.08)") as any}>
            Staff Portal
          </a>
        </div>
      </footer>
    </>
  );
}