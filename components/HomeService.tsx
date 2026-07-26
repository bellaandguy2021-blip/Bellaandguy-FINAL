"use client";
import { useEffect, useRef } from "react";

const steps = [
  { num: "01", title: "Choose Your Service", desc: "Browse our full menu of 50+ beauty & grooming services" },
  { num: "02", title: "Pick a Slot", desc: "Select date, time & your address at your convenience" },
  { num: "03", title: "We Come to You", desc: "Certified expert arrives with all professional equipment" },
  { num: "04", title: "Look Flawless", desc: "Enjoy a 5-star salon experience at your own home" },
];

const homeServices = [
  { icon: "◎", name: "Waxing",           popular: true  },
  { icon: "◈", name: "D-Tan & Bleach",   popular: false },
  { icon: "◉", name: "Cleanups",         popular: true  },
  { icon: "✦", name: "Facials",          popular: true  },
  { icon: "✿", name: "Japanese Rituals", popular: false },
];

const badges = [
  { icon: "✓", text: "Verified Professionals" },
  { icon: "✓", text: "100% Original Products" },
  { icon: "✓", text: "On-time Guarantee" },
  { icon: "✓", text: "No Hidden Charges" },
];

export default function HomeService() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach(e => {
        if (e.isIntersecting) e.target.classList.add("visible");
      }),
      { threshold: 0.07 }
    );
    sectionRef.current?.querySelectorAll(".reveal, .reveal-left, .reveal-right, .reveal-scale").forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <style>{`
        .hs-section {
          background: #0C0C0C;
          padding: 120px 32px;
          position: relative;
          overflow: hidden;
        }

        /* Subtle geometric pattern */
        .hs-pattern {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(201,168,76,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(201,168,76,0.03) 1px, transparent 1px);
          background-size: 80px 80px;
          pointer-events: none;
        }

        .hs-pattern-fade {
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse at center, transparent 30%, #0C0C0C 80%);
          pointer-events: none;
        }

        .hs-badge {
          background: rgba(201,168,76,0.08);
          border: 1px solid rgba(201,168,76,0.2);
          color: #C9A84C;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          padding: 7px 20px;
          border-radius: 100px;
          display: inline-block;
          margin-bottom: 24px;
        }

        .hs-service-card {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 4px;
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 14px;
          position: relative;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
        }

        .hs-service-card:hover {
          border-color: rgba(201,168,76,0.3);
          background: rgba(201,168,76,0.06);
          transform: translateX(4px);
        }

        .hs-service-icon {
          font-size: 20px;
          width: 44px;
          height: 44px;
          background: rgba(201,168,76,0.08);
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .hs-popular {
          position: absolute;
          top: -1px; right: 12px;
          background: #C9A84C;
          color: #080808;
          font-size: 8px;
          font-weight: 800;
          padding: 3px 8px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          border-radius: 0 0 4px 4px;
        }

        .step-row {
          display: flex;
          gap: 20px;
          align-items: flex-start;
          margin-bottom: 4px;
        }

        .step-num-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex-shrink: 0;
        }

        .step-num {
          width: 40px; height: 40px;
          border: 1px solid rgba(201,168,76,0.35);
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-family: 'Cormorant Garamond', serif;
          font-size: 14px; font-weight: 600;
          color: #C9A84C;
        }

        .step-line {
          width: 1px; height: 36px; margin: 6px 0;
          background: linear-gradient(180deg, rgba(201,168,76,0.3), rgba(201,168,76,0.05));
        }

        .trust-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-top: 32px;
          padding: 24px;
          background: rgba(201,168,76,0.04);
          border: 1px solid rgba(201,168,76,0.12);
          border-radius: 4px;
        }

        .trust-item {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13px;
          color: rgba(255,255,255,0.65);
        }

        .trust-check {
          width: 20px; height: 20px;
          background: rgba(201,168,76,0.15);
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          color: #C9A84C;
          font-size: 11px;
          font-weight: 700;
          flex-shrink: 0;
        }

        .hs-book-btn {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          margin-top: 32px;
          background: linear-gradient(135deg, #E8C96D, #C9A84C);
          color: #080808;
          padding: 15px 36px;
          border-radius: 3px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          text-decoration: none;
          transition: all 0.3s ease;
        }
        .hs-book-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 32px rgba(201,168,76,0.35);
        }

        @media (max-width: 768px) {
          .hs-main-grid { grid-template-columns: 1fr !important; gap: 56px !important; }
          .hs-section { padding: 80px 20px; }
        }
        @media (max-width: 480px) {
          .hs-section { padding: 60px 16px; }
          .trust-grid { grid-template-columns: 1fr; }
          .hs-book-btn { width: 100%; justify-content: center; padding: 14px 24px; }
          .hs-service-card { padding: 14px; gap: 10px; }
        }
      `}</style>

      <section id="home-service" className="hs-section" ref={sectionRef}>
        <div className="hs-pattern" />
        <div className="hs-pattern-fade" />

        <div style={{ maxWidth: "1260px", margin: "0 auto", position: "relative" }}>

          <div style={{ textAlign: "center", marginBottom: "72px" }}>
            <div className="reveal">
              <span className="hs-badge">We Come To You</span>
            </div>
            <h2 className="reveal reveal-delay-1" style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "clamp(36px, 5vw, 58px)", fontWeight: "400",
              color: "#FFFFFF", lineHeight: "1.05", marginBottom: "16px"
            }}>
              Salon at Your <em style={{ color: "#C9A84C", fontStyle: "italic" }}>Doorstep</em>
            </h2>
            <div className="reveal reveal-delay-2" style={{
              width: "40px", height: "1px",
              background: "linear-gradient(90deg, transparent, #C9A84C, transparent)",
              margin: "0 auto 20px"
            }} />
            <p className="reveal reveal-delay-3" style={{ color: "rgba(255,255,255,0.45)", fontSize: "16px", maxWidth: "480px", margin: "0 auto" }}>
              Premium beauty services delivered to your doorstep — certified experts arrive fully equipped, no travel needed.
            </p>
          </div>

          <div className="hs-main-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "72px", alignItems: "start" }}>

            {/* Left: Services */}
            <div className="reveal-left">
              <h3 style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "20px", fontWeight: "500",
                color: "#FFFFFF", marginBottom: "24px",
                letterSpacing: "0.02em"
              }}>
                All Services at Home
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                {homeServices.map((s, i) => (
                  <div key={i} className="hs-service-card">
                    {s.popular && <span className="hs-popular">Popular</span>}
                    <div className="hs-service-icon">{s.icon}</div>
                    <span style={{ color: "rgba(255,255,255,0.8)", fontSize: "13px", fontWeight: "500" }}>{s.name}</span>
                  </div>
                ))}
              </div>
              <a href="#services" className="hs-book-btn">
                Book Home Service →
              </a>
            </div>

            {/* Right: How it works */}
            <div className="reveal-right reveal-d2">
              <h3 style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "20px", fontWeight: "500",
                color: "#FFFFFF", marginBottom: "32px",
                letterSpacing: "0.02em"
              }}>
                How It Works
              </h3>
              <div>
                {steps.map((step, i) => (
                  <div key={i} className="step-row">
                    <div className="step-num-wrap">
                      <div className="step-num">{step.num}</div>
                      {i < steps.length - 1 && <div className="step-line" />}
                    </div>
                    <div style={{ paddingTop: "8px", paddingBottom: i < steps.length - 1 ? "28px" : "0" }}>
                      <h4 style={{ color: "#FFFFFF", fontSize: "15px", fontWeight: "600", marginBottom: "5px" }}>
                        {step.title}
                      </h4>
                      <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "13.5px", lineHeight: "1.6" }}>
                        {step.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="trust-grid">
                {badges.map((b, i) => (
                  <div key={i} className="trust-item">
                    <span className="trust-check">{b.icon}</span>
                    {b.text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}