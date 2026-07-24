"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import InquiryButton from "./InquiryButton";
import { getPublicSettings } from "@/lib/settings";

const DEFAULT_STATS = [
  { raw: 5000, suffix: "+", label: "Happy Clients" },
  { raw: 50,   suffix: "+", label: "Services" },
  { raw: 8,    suffix: "+", label: "Years Experience" },
  { raw: 4.9,  suffix: "★", label: "Google Rating" },
];

const DEFAULT_TRUST = ["Certified Professionals", "100% Original Products", "On-time Guarantee", "No Hidden Charges", "GST Included", "Trusted Brands Only", "No Convenience Charge", "Free Consultation"];

function useCounter(target: number, started: boolean, duration = 1600) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!started) return;
    let start: number | null = null;
    const isDecimal = target % 1 !== 0;
    const raf = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = eased * target;
      setValue(isDecimal ? parseFloat(current.toFixed(1)) : Math.floor(current));
      if (progress < 1) requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  }, [started, target, duration]);
  return value;
}

function StatCounter({ raw, suffix, label, started }: { raw: number; suffix: string; label: string; started: boolean }) {
  const val = useCounter(raw, started);
  return (
    <div className="stat-item">
      <div className="stat-num">{val}{suffix}</div>
      <div className="stat-lbl">{label}</div>
    </div>
  );
}

const PARTICLES = [
  { size: 3, x: 8,  y: 72, dur: 7,   delay: 0    },
  { size: 2, x: 15, y: 58, dur: 9,   delay: 1.2  },
  { size: 4, x: 24, y: 80, dur: 6.5, delay: 0.4  },
  { size: 2, x: 32, y: 65, dur: 11,  delay: 2    },
  { size: 3, x: 42, y: 78, dur: 8,   delay: 0.8  },
  { size: 2, x: 55, y: 60, dur: 10,  delay: 1.5  },
  { size: 4, x: 68, y: 75, dur: 7.5, delay: 0.2  },
  { size: 2, x: 78, y: 68, dur: 9.5, delay: 2.4  },
  { size: 3, x: 87, y: 82, dur: 6,   delay: 0.6  },
  { size: 2, x: 94, y: 55, dur: 8.5, delay: 1.8  },
];

export default function Hero() {
  const [textVisible, setTextVisible]   = useState(false);
  const [statsVisible, setStatsVisible] = useState(false);
  const [mounted, setMounted]           = useState(false);
  const [s, setS] = useState<Record<string, string>>({});
  const bgRef = useRef<HTMLDivElement>(null);

  useEffect(() => { getPublicSettings().then(setS); }, []);

  const badge = s.hero_badge || "Wave City's Premium Home Beauty Service";
  const heading1 = s.hero_heading_1 || "Premium";
  const heading2 = s.hero_heading_2 || "Salon";
  const headingGold = s.hero_heading_gold || "At Your Doorstep";
  const tagline = s.hero_tagline || "Professional beauty services, delivered to the comfort of your home.";
  const ctaLabel = s.hero_cta_label || "Book Home Service →";
  const ctaHref = s.hero_cta_href || "/book";
  const secondaryLabel = s.hero_secondary_label || "📞 Call Now";
  const secondaryHref = s.hero_secondary_href || "tel:+919999601212";
  const bgImages = (() => {
    try {
      const parsed = JSON.parse(s.hero_bg_images || "[]");
      if (Array.isArray(parsed) && parsed.length) return parsed as string[];
    } catch {}
    return [s.hero_bg_image || "/images/salon-front.jpg"];
  })();
  const [bgIdx, setBgIdx] = useState(0);
  useEffect(() => {
    if (bgImages.length < 2) return;
    const t = setInterval(() => setBgIdx(i => (i + 1) % bgImages.length), 5500);
    return () => clearInterval(t);
  }, [bgImages.length]);
  const trustList = [1, 2, 3, 4, 5, 6, 7, 8].map(n => s[`trust_${n}`]).filter(Boolean);
  const trust = trustList.length > 0 ? trustList : DEFAULT_TRUST;
  const stats = DEFAULT_STATS.map((d, i) => {
    const n = i + 1;
    return {
      raw: parseFloat(s[`stat${n}_value`] ?? "") || d.raw,
      suffix: s[`stat${n}_suffix`] || d.suffix,
      label: s[`stat${n}_label`] || d.label,
    };
  });

  useEffect(() => {
    setMounted(true);
    const t1 = setTimeout(() => setTextVisible(true), 120);
    const t2 = setTimeout(() => setStatsVisible(true), 800);

    // RAF-throttled parallax
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        if (bgRef.current) bgRef.current.style.transform = `translate3d(0,${window.scrollY * 0.28}px,0)`;
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { clearTimeout(t1); clearTimeout(t2); window.removeEventListener("scroll", onScroll); };
  }, []);

  return (
    <>
      <style>{`
        .hero-section {
          position: relative; min-height: 100vh;
          display: flex; align-items: center; overflow: hidden;
        }

        /* Background */
        .hero-bg-wrap { position: absolute; inset: 0; z-index: 0; will-change: transform; }
        .hero-overlay {
          position: absolute; inset: 0; z-index: 1;
          background: linear-gradient(110deg, rgba(4,4,8,0.97) 0%, rgba(6,6,10,0.88) 48%, rgba(6,6,10,0.5) 100%);
        }
        .hero-overlay2 {
          position: absolute; inset: 0; z-index: 1;
          background: radial-gradient(ellipse 80% 60% at 70% 50%, transparent 0%, rgba(4,4,8,0.5) 100%);
        }
        .hero-grain {
          position: absolute; inset: 0; z-index: 2; pointer-events: none;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.028'/%3E%3C/svg%3E");
        }

        /* Decorative lines */
        .hero-line-left {
          position: absolute; left: 0; top: 10%; bottom: 10%; width: 2px; z-index: 3;
          background: linear-gradient(180deg, transparent, #C9A84C 25%, #C9A84C 75%, transparent);
          opacity: 0; animation: lineReveal 1.2s cubic-bezier(0.22,1,0.36,1) 0.5s forwards;
        }
        .hero-line-right {
          position: absolute; right: 60px; top: 18%; bottom: 18%; width: 1px; z-index: 3;
          background: linear-gradient(180deg, transparent, rgba(201,168,76,0.22) 50%, transparent);
          opacity: 0; animation: lineReveal 1.2s cubic-bezier(0.22,1,0.36,1) 0.7s forwards;
        }
        @keyframes lineReveal {
          from { opacity: 0; transform: scaleY(0); transform-origin: top; }
          to   { opacity: 1; transform: scaleY(1); transform-origin: top; }
        }

        /* Floating particles */
        .hero-pt {
          position: absolute; border-radius: 50%; z-index: 2; pointer-events: none;
          background: radial-gradient(circle, rgba(201,168,76,0.7), rgba(201,168,76,0.1));
          animation: ptFloat linear infinite;
          opacity: 0;
        }
        @keyframes ptFloat {
          0%   { opacity: 0;   transform: translateY(0) scale(0.3); }
          10%  { opacity: 0.5; }
          70%  { opacity: 0.2; }
          100% { opacity: 0;   transform: translateY(-260px) scale(0.1); }
        }

        /* Ambient glow */
        .hero-glow {
          position: absolute; z-index: 1; pointer-events: none; border-radius: 50%; filter: blur(100px);
        }
        .hero-glow1 {
          width: 600px; height: 600px;
          background: radial-gradient(circle, rgba(201,168,76,0.09), transparent 70%);
          top: -200px; left: -200px;
          animation: glowPulse 8s ease-in-out infinite;
        }
        .hero-glow2 {
          width: 400px; height: 400px;
          background: radial-gradient(circle, rgba(100,80,200,0.07), transparent 70%);
          bottom: -100px; right: 15%;
          animation: glowPulse 11s ease-in-out 2s infinite reverse;
        }
        @keyframes glowPulse {
          0%,100% { opacity: 0.7; transform: scale(1); }
          50%      { opacity: 1;   transform: scale(1.15); }
        }

        /* Content */
        .hero-content {
          position: relative; z-index: 10;
          max-width: 1260px; margin: 0 auto;
          padding: 150px 32px 100px; width: 100%;
        }

        /* Badge */
        .hero-badge {
          display: inline-flex; align-items: center; gap: 10px;
          background: rgba(255,255,255,0.10);
          backdrop-filter: blur(32px) saturate(200%) brightness(110%);
          -webkit-backdrop-filter: blur(32px) saturate(200%) brightness(110%);
          border: 1px solid rgba(255,255,255,0.25);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.5),
            inset 0 -1px 0 rgba(0,0,0,0.08),
            0 4px 16px rgba(0,0,0,0.2);
          border-radius: 100px; padding: 8px 20px 8px 12px;
          margin-bottom: 32px; width: fit-content; position: relative; overflow: hidden;
          opacity: 0; transform: translateY(16px);
          transition: opacity 0.9s cubic-bezier(0.22,1,0.36,1), transform 0.9s cubic-bezier(0.22,1,0.36,1);
        }
        .hero-badge::after {
          content: ''; position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
          background: radial-gradient(ellipse 80% 50% at 20% 0%, rgba(255,255,255,0.25), transparent 60%);
        }
        .hero-badge.vis { opacity: 1; transform: translateY(0); }
        .hero-badge-live {
          width: 7px; height: 7px; border-radius: 50%; background: #C9A84C;
          animation: badgePulse 2s ease-in-out infinite;
        }
        @keyframes badgePulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(201,168,76,0.5); }
          50%      { box-shadow: 0 0 0 6px rgba(201,168,76,0); }
        }
        .hero-badge-text { font-size: 11px; font-weight: 600; color: rgba(201,168,76,0.9); letter-spacing: 0.18em; text-transform: uppercase; }

        /* Heading word-by-word */
        .hero-h1 {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(56px, 9vw, 100px); font-weight: 300;
          color: #fff; line-height: 0.95; letter-spacing: -0.02em; margin-bottom: 24px;
        }
        .hw {
          display: inline-block;
          opacity: 0; transform: translateY(36px) skewY(2deg);
          transition: opacity 0.8s cubic-bezier(0.22,1,0.36,1), transform 0.8s cubic-bezier(0.22,1,0.36,1);
        }
        .hw.vis { opacity: 1; transform: translateY(0) skewY(0deg); }
        .hw0.vis { transition-delay: 0.12s; }
        .hw1.vis { transition-delay: 0.22s; }
        .hw2.vis { transition-delay: 0.32s; }

        .hero-gold-word {
          background: linear-gradient(125deg, #F2D96E 0%, #C9A84C 45%, #9E7A2E 100%);
          background-size: 200% auto;
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
          font-weight: 600; font-style: italic; display: block;
          animation: shimmerGoldHero 4s linear infinite;
        }
        @keyframes shimmerGoldHero {
          0%   { background-position: 0% center; }
          100% { background-position: 200% center; }
        }

        /* Tagline */
        .hero-tag {
          color: rgba(255,255,255,0.48); font-size: clamp(15px,1.8vw,18px);
          font-weight: 300; line-height: 1.75; max-width: 500px; margin-bottom: 44px;
          opacity: 0; transform: translateY(24px);
          transition: opacity 0.9s cubic-bezier(0.22,1,0.36,1) 0.38s, transform 0.9s cubic-bezier(0.22,1,0.36,1) 0.38s;
        }
        .hero-tag.vis { opacity: 1; transform: translateY(0); }

        /* CTAs */
        .hero-ctas {
          display: flex; gap: 14px; flex-wrap: wrap;
          opacity: 0; transform: translateY(20px);
          transition: opacity 0.8s cubic-bezier(0.22,1,0.36,1) 0.5s, transform 0.8s cubic-bezier(0.22,1,0.36,1) 0.5s;
        }
        .hero-ctas.vis { opacity: 1; transform: translateY(0); }

        .cta-gold {
          display: inline-flex; align-items: center; gap: 10px;
          background: linear-gradient(135deg, #F2D96E, #C9A84C); color: #080808;
          padding: 16px 40px; border-radius: 4px; font-size: 11.5px; font-weight: 700;
          letter-spacing: 0.14em; text-transform: uppercase; text-decoration: none;
          transition: all 0.35s cubic-bezier(0.22,1,0.36,1);
          box-shadow: 0 6px 28px rgba(201,168,76,0.32);
          position: relative; overflow: hidden;
        }
        .cta-gold::before {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.25), transparent);
          opacity: 0; transition: opacity 0.3s;
        }
        .cta-gold::after {
          content: ''; position: absolute; bottom: 0; left: -100%; width: 50%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
          transition: left 0.6s ease;
        }
        .cta-gold:hover { transform: translateY(-2px); box-shadow: 0 12px 44px rgba(201,168,76,0.5); }
        .cta-gold:hover::before { opacity: 1; }
        .cta-gold:hover::after { left: 150%; }

        .cta-outline {
          display: inline-flex; align-items: center; gap: 8px;
          background: transparent; color: rgba(255,255,255,0.8);
          padding: 16px 32px; border-radius: 4px;
          border: 1px solid rgba(255,255,255,0.15); font-size: 11.5px; font-weight: 500;
          letter-spacing: 0.12em; text-transform: uppercase; text-decoration: none;
          transition: all 0.3s ease; position: relative; overflow: hidden;
        }
        .cta-outline:hover { border-color: rgba(201,168,76,0.5); color: #C9A84C; background: rgba(201,168,76,0.06); transform: translateY(-1px); }

        /* Trust row */
        .trust-row {
          display: flex; align-items: center; gap: 22px; margin-top: 36px; flex-wrap: wrap;
          opacity: 0; transform: translateY(14px);
          transition: opacity 0.8s cubic-bezier(0.22,1,0.36,1) 0.62s, transform 0.8s cubic-bezier(0.22,1,0.36,1) 0.62s;
        }
        .trust-row.vis { opacity: 1; transform: translateY(0); }
        .trust-item { display: flex; align-items: center; gap: 8px; font-size: 12px; color: rgba(255,255,255,0.38); font-weight: 500; }
        .trust-dot { width: 4px; height: 4px; border-radius: 50%; background: #C9A84C; opacity: 0.7; }

        /* Stats */
        .stats-bar {
          display: grid; grid-template-columns: repeat(4,1fr);
          margin-top: 80px;
          border-radius: 16px; overflow: hidden;
          position: relative;
          background: rgba(255,255,255,0.10);
          backdrop-filter: blur(40px) saturate(200%) brightness(110%);
          -webkit-backdrop-filter: blur(40px) saturate(200%) brightness(110%);
          border: 1px solid rgba(255,255,255,0.18);
          box-shadow:
            inset 0 1.5px 0 rgba(255,255,255,0.45),
            inset 0 -1px 0 rgba(0,0,0,0.12),
            0 16px 48px rgba(0,0,0,0.3),
            0 2px 8px rgba(0,0,0,0.15);
          opacity: 0; transform: translateY(24px);
          transition: opacity 1s cubic-bezier(0.22,1,0.36,1) 0.7s, transform 1s cubic-bezier(0.22,1,0.36,1) 0.7s;
        }
        .stats-bar::before {
          content: ''; position: absolute; inset: 0; pointer-events: none; z-index: 1;
          background:
            radial-gradient(ellipse 60% 50% at 15% 0%, rgba(255,255,255,0.2), transparent 60%),
            radial-gradient(ellipse 30% 60% at 85% 100%, rgba(255,255,255,0.07), transparent 60%);
          border-radius: inherit;
        }
        .stats-bar.vis { opacity: 1; transform: translateY(0); }
        .stat-item {
          padding: 28px 20px; text-align: center; position: relative; z-index: 2;
          border-right: 1px solid rgba(255,255,255,0.08);
          transition: background 0.5s cubic-bezier(0.4,0,0.2,1);
          cursor: default;
        }
        .stat-item:hover { background: rgba(255,255,255,0.07); }
        .stat-item:last-child { border-right: none; }
        .stat-item::before {
          content: ''; position: absolute; bottom: 0; left: 20%; right: 20%; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(201,168,76,0.3), transparent);
          opacity: 0; transition: opacity 0.3s;
        }
        .stat-item:hover::before { opacity: 1; }
        .stat-item:not(:last-child)::after {
          content: ''; position: absolute; right: 0; top: 22%; bottom: 22%;
          width: 1px; background: rgba(201,168,76,0.08);
        }
        .stat-num {
          font-family: 'Cormorant Garamond', serif; font-size: 34px; font-weight: 500;
          color: #C9A84C; margin-bottom: 5px; letter-spacing: -0.01em;
          text-shadow: 0 0 40px rgba(201,168,76,0.25);
        }
        .stat-lbl { color: rgba(255,255,255,0.28); font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; font-weight: 500; }

        /* Scroll indicator */
        .scroll-ind {
          position: absolute; bottom: 36px; left: 50%; transform: translateX(-50%);
          z-index: 10; display: flex; flex-direction: column; align-items: center; gap: 8px;
          opacity: 0; transition: opacity 1s ease 1.6s;
        }
        .scroll-ind.vis { opacity: 1; }
        .scroll-mouse { width: 20px; height: 33px; border: 1px solid rgba(201,168,76,0.35); border-radius: 10px; display: flex; justify-content: center; padding-top: 7px; }
        .scroll-dot { width: 2px; height: 6px; background: #C9A84C; border-radius: 1px; animation: scrollBob 2.2s ease-in-out infinite; }
        @keyframes scrollBob { 0%,100%{transform:translateY(0);opacity:0.8;}50%{transform:translateY(7px);opacity:0.3;} }
        .scroll-txt { font-size: 9px; letter-spacing: 0.22em; text-transform: uppercase; color: rgba(255,255,255,0.22); }

        @media (max-width: 640px) {
          .stats-bar { grid-template-columns: repeat(2,1fr); }
          .stat-item:nth-child(2)::after { display: none; }
          .hero-content { padding: 120px 20px 80px; }
          .hero-line-right { display: none; }
        }
        @media (max-width: 480px) {
          .hero-content { padding: 100px 16px 60px; }
          .hero-ctas { flex-direction: column; gap: 10px; }
          .cta-gold, .cta-outline { width: 100%; justify-content: center; padding: 14px 20px; }
          .stat-num { font-size: 22px; }
          .stat-lbl { font-size: 10px; }
          .stat-item { padding: 16px 10px; }
          .stats-bar { margin-top: 32px; }
        }
      `}</style>

      <section id="home" className="hero-section">
        {/* Background with parallax */}
        <div ref={bgRef} className="hero-bg-wrap">
          {bgImages.map((src, i) => (
            <Image key={src} src={src} alt="Bella & Guy Salon" fill
              style={{ objectFit: "cover", objectPosition: "center 30%", opacity: i === bgIdx ? 1 : 0, transition: "opacity 1.2s ease" }}
              priority={i === 0} />
          ))}
        </div>

        <div className="hero-overlay" />
        <div className="hero-overlay2" />
        <div className="hero-grain" />

        {/* Ambient glows */}
        <div className="hero-glow hero-glow1" />
        <div className="hero-glow hero-glow2" />

        {/* Decorative lines */}
        <div className="hero-line-left" />
        <div className="hero-line-right" />

        {/* Floating particles */}
        {mounted && PARTICLES.map((p, i) => (
          <div key={i} className="hero-pt" style={{
            width: p.size, height: p.size,
            left: `${p.x}%`, bottom: `${p.y - 40}%`,
            animationDuration: `${p.dur}s`,
            animationDelay: `${p.delay}s`,
          }} />
        ))}

        <div className="hero-content">
          <div style={{ maxWidth: "760px" }}>

            <div className={`hero-badge ${textVisible ? "vis" : ""}`}>
              <span className="hero-badge-live" />
              <span className="hero-badge-text">{badge}</span>
            </div>

            <h1 className="hero-h1">
              <span className={`hw hw0 ${textVisible ? "vis" : ""}`}>{heading1}&nbsp;</span>
              <span className={`hw hw1 ${textVisible ? "vis" : ""}`}>{heading2}</span>
              <br />
              <span className={`hw hw2 ${textVisible ? "vis" : ""}`}>
                <span className="hero-gold-word">{headingGold}</span>
              </span>
            </h1>

            <p className={`hero-tag ${textVisible ? "vis" : ""}`}>
              {tagline}
            </p>

            <div className={`hero-ctas ${textVisible ? "vis" : ""}`}>
              <a href={ctaHref} className="cta-gold" onClick={() => sessionStorage.setItem("bookingType", "home")}>{ctaLabel}</a>
              <a href={secondaryHref} className="cta-outline">{secondaryLabel}</a>
              <InquiryButton label="Ask a Question" />
            </div>

            <div className={`trust-row ${textVisible ? "vis" : ""}`}>
              {trust.map((t, i) => (
                <span key={i} className="trust-item"><span className="trust-dot" />{t}</span>
              ))}
            </div>
          </div>

          <div className={`stats-bar ${statsVisible ? "vis" : ""}`}>
            {stats.map((st, i) => (
              <StatCounter key={i} raw={st.raw} suffix={st.suffix} label={st.label} started={statsVisible} />
            ))}
          </div>
        </div>

        <div className={`scroll-ind ${statsVisible ? "vis" : ""}`}>
          <div className="scroll-mouse"><div className="scroll-dot" /></div>
          <span className="scroll-txt">Scroll</span>
        </div>
      </section>
    </>
  );
}
