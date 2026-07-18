"use client";
import { useEffect, useRef, useState } from "react";
import { getHomepageFeatures, DBFeature } from "@/lib/homepageContent";

const features = [
  {
    title: "Certified Experts",
    desc: "15+ professionals trained and certified in the latest international beauty & grooming techniques.",
    badge: "15+ on staff",
    svg: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4"/><path d="M8 14l-4 6h16l-4-6"/><path d="M12 14v8"/>
      </svg>
    ),
  },
  {
    title: "Premium Products",
    desc: "We exclusively use Streax, Loreal, Schwarzkopf, Lotus, O3+, Kanpeki, Casmara & Rica — 100% authentic, globally recognized brands.",
    badge: "Top brands only",
    svg: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"/>
      </svg>
    ),
  },
  {
    title: "Hygienic & Safe",
    desc: "Sterilized tools, single-use items for every client & hospital-grade sanitization between every appointment.",
    badge: "Zero compromise",
    svg: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/>
      </svg>
    ),
  },
  {
    title: "Doorstep Service",
    desc: "Our certified experts come fully equipped to your home. Full salon quality — zero travel needed.",
    badge: "Wave City & nearby",
    svg: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/>
      </svg>
    ),
  },
  {
    title: "Transparent Pricing",
    desc: "No hidden charges, ever. What you see is what you pay — services starting from just ₹50.",
    badge: "Starts at ₹50",
    svg: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
      </svg>
    ),
  },
  {
    title: "4.9★ Google Rated",
    desc: "Consistently rated 4.9 stars across 2,000+ verified Google reviews. Our reputation speaks for itself.",
    badge: "2000+ reviews",
    svg: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
      </svg>
    ),
  },
];

export default function WhyChooseUs() {
  const sectionRef = useRef<HTMLElement>(null);
  const [dbFeatures, setDbFeatures] = useState<DBFeature[]>([]);

  useEffect(() => {
    getHomepageFeatures().then(setDbFeatures);
  }, []);

  // Admin-managed cards (from the "Homepage" tab) take over entirely once any
  // exist — same rule as the Services catalog: once managed, the admin's list
  // is the source of truth. Until then, the hardcoded list above is shown.
  const cards = dbFeatures.length > 0 ? dbFeatures : features;

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add("visible"); }),
      { threshold: 0.07 }
    );
    sectionRef.current?.querySelectorAll(".reveal, .reveal-scale, .reveal-left, .reveal-right").forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [cards.length]);

  return (
    <>
      <style>{`
        .wcu-section { background: #FAF7F0; padding: 100px 32px; }

        .wcu-top {
          display: flex; align-items: flex-end; justify-content: space-between;
          margin-bottom: 64px; flex-wrap: wrap; gap: 28px;
        }

        .wcu-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }

        .wcu-card {
          padding: 32px 28px;
          background: rgba(255,255,255,0.28);
          backdrop-filter: blur(32px) saturate(180%);
          -webkit-backdrop-filter: blur(32px) saturate(180%);
          border: 1px solid rgba(255,255,255,0.72);
          border-radius: 16px;
          box-shadow:
            inset 0 1.5px 0 rgba(255,255,255,0.88),
            0 6px 24px rgba(180,150,80,0.09),
            0 2px 6px rgba(0,0,0,0.05);
          transition:
            transform 0.5s cubic-bezier(0.4,0,0.2,1),
            box-shadow 0.5s cubic-bezier(0.4,0,0.2,1),
            background 0.5s cubic-bezier(0.4,0,0.2,1),
            border-color 0.5s cubic-bezier(0.4,0,0.2,1);
          position: relative; overflow: hidden;
        }
        .wcu-card::before {
          content:''; position:absolute; top:0; left:0; right:0; height:42%;
          background: linear-gradient(180deg, rgba(255,255,255,0.55), rgba(255,255,255,0));
          border-radius: 16px 16px 0 0; pointer-events:none; z-index:0;
        }
        .wcu-card > * { position: relative; z-index: 1; }
        .wcu-card::after {
          content: ''; position: absolute;
          width: 180px; height: 180px; border-radius: 50%;
          background: radial-gradient(circle, rgba(201,168,76,0.08), transparent 70%);
          top: -60px; right: -60px; pointer-events: none;
          opacity: 0;
          transition: opacity 0.5s cubic-bezier(0.4,0,0.2,1);
        }
        .wcu-card:hover {
          transform: translateY(-5px);
          background: rgba(255,255,255,0.38);
          border-color: rgba(255,255,255,0.88);
          box-shadow:
            inset 0 1.5px 0 rgba(255,255,255,0.95),
            0 18px 48px rgba(180,150,80,0.14),
            0 4px 12px rgba(0,0,0,0.06);
        }
        .wcu-card:hover::after { opacity: 1; }

        .wcu-icon-wrap {
          width: 52px; height: 52px; border-radius: 12px;
          background: rgba(201,168,76,0.08); border: 1px solid rgba(201,168,76,0.15);
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 20px;
          transition: background 0.3s ease, border-color 0.3s ease, transform 0.3s cubic-bezier(0.22,1,0.36,1);
        }
        .wcu-card:hover .wcu-icon-wrap { background: rgba(201,168,76,0.14); border-color: rgba(201,168,76,0.3); transform: scale(1.08) rotate(-4deg); }

        .wcu-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 21px; font-weight: 600; color: #080808;
          margin-bottom: 10px; line-height: 1.2;
        }

        .wcu-desc {
          color: #6B6B6B; font-size: 13.5px; line-height: 1.7; margin-bottom: 20px;
        }

        .wcu-badge {
          display: inline-flex; align-items: center; gap: 7px;
          font-size: 10.5px; font-weight: 700; color: #080808;
          letter-spacing: 0.1em; text-transform: uppercase;
        }
        .wcu-badge::before { content: ''; width: 14px; height: 1.5px; background: #C9A84C; display: block; }

        @media (max-width: 900px) { .wcu-grid { grid-template-columns: repeat(2,1fr); } }
        @media (max-width: 560px) {
          .wcu-grid { grid-template-columns: 1fr; }
          .wcu-section { padding: 72px 16px; }
          .wcu-top { flex-direction: column; gap: 16px; margin-bottom: 40px; align-items: center; text-align: center; }
          .wcu-top h2 { text-align: center; }
          .wcu-top p { text-align: center; max-width: 100%; }
          .wcu-card { padding: 24px 20px; }
        }
      `}</style>

      <section id="why-us" className="wcu-section" ref={sectionRef}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>

          <div className="wcu-top" style={{ flexDirection: "column", alignItems: "center", textAlign: "center" }}>
            <div>
              <div className="reveal" style={{ marginBottom: "14px" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "10px", fontWeight: "600", letterSpacing: "0.22em", textTransform: "uppercase", color: "#C9A84C" }}>
                  <span style={{ width: "20px", height: "1px", background: "#C9A84C", display: "inline-block" }} />
                  Our Promise
                </span>
              </div>
              <h2 className="reveal" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(34px, 5vw, 52px)", fontWeight: "400", color: "#080808", lineHeight: "1.1", textAlign: "center" }}>
                Why Choose<br /><em style={{ fontStyle: "italic", color: "#C9A84C" }}>Bella & Guy?</em>
              </h2>
            </div>
            <p className="reveal" style={{ color: "#6B6B6B", fontSize: "15px", maxWidth: "520px", lineHeight: "1.7", textAlign: "center" }}>
              We hold ourselves to a higher standard — because your time, trust and appearance matter.
            </p>
          </div>

          <div className="wcu-grid">
            {cards.map((f: any, i) => (
              <div key={f.id ?? i} className={`wcu-card reveal-scale reveal-d${i + 1}`}>
                <div className="wcu-icon-wrap">{f.svg ?? <span style={{ fontSize: 22 }}>{f.icon}</span>}</div>
                <h3 className="wcu-title">{f.title}</h3>
                <p className="wcu-desc">{f.desc ?? f.description}</p>
                {f.badge && <span className="wcu-badge">{f.badge}</span>}
              </div>
            ))}
          </div>

        </div>
      </section>
    </>
  );
}
