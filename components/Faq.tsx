"use client";
import { useState, useEffect, useRef } from "react";
import { getPublicSettings } from "../lib/settings";
import { getFaqs, DBFaq } from "../lib/homepageContent";

export const faqs = [
  {
    q: "Do you offer home service?",
    a: "Yes. We offer professional home service across Wave City and surrounding areas of Ghaziabad. Our certified experts arrive fully equipped. Simply select 'Home Service' when booking."
  },
  {
    q: "How do I book an appointment?",
    a: "Book directly on this website using the 'Book Appointment' form above, or WhatsApp us. We confirm bookings within 30 minutes."
  },
  {
    q: "What are your timings?",
    a: "We're open 7 days a week, 9:00 AM to 8:00 PM. Home service slots are available from 9:00 AM to 7:00 PM."
  },
  {
    q: "Is the salon hygienic and safe?",
    a: "Absolutely. We follow strict hygiene protocols — sterilized tools, disposable items for every client, and regular sanitization throughout the day. Your safety is non-negotiable."
  },
  {
    q: "Which products do you use?",
    a: "We use premium international brands including Streax, Loreal, Schwarzkopf, Lotus, O3+, Kanpeki, Casmara and Rica. All products are 100% authentic and dermatologically approved."
  },
  {
    q: "Can I get bridal makeup at home?",
    a: "Yes — our bridal home package is one of our most popular services. Our makeup artists arrive at your home or venue with a complete professional kit. We recommend booking at least 3–5 days in advance."
  },
];

export default function Faq() {
  const [open, setOpen] = useState<number | null>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const [ctaVisible, setCtaVisible] = useState(false);
  const [siteSettings, setSiteSettings] = useState<Record<string, string>>({});
  const [dbFaqs, setDbFaqs] = useState<DBFaq[]>([]);

  useEffect(() => { getFaqs().then(setDbFaqs); }, []);

  const items = dbFaqs.length > 0 ? dbFaqs.map(f => ({ q: f.question, a: f.answer })) : faqs;

  useEffect(() => {
    const el = ctaRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setCtaVisible(true); obs.disconnect(); } },
      { threshold: 0.2 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => { getPublicSettings().then(setSiteSettings); }, []);

  const salonPhone = siteSettings.salon_phone || "+91 96259 28495";
  const salonPhoneDigits = salonPhone.replace(/[^\d+]/g, "");
  const waNumber = (siteSettings.owner_whatsapp || "919999601212").replace(/\D/g, "");
  const waMessage = siteSettings.whatsapp_message || "Hello Bella & Guy Salon, I have a question.";

  return (
    <>
      <style>{`
        .faq-section {
          background: #FAF7F0;
          padding: 120px 32px;
          position: relative;
        }

        .faq-item {
          border-bottom: 1px solid rgba(0,0,0,0.07);
          transition: all 0.2s ease;
        }

        .faq-item:first-of-type { border-top: 1px solid rgba(0,0,0,0.07); }

        .faq-trigger {
          width: 100%;
          padding: 24px 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: none;
          border: none;
          cursor: pointer;
          text-align: left;
          gap: 24px;
        }

        .faq-q {
          font-family: 'Cormorant Garamond', serif;
          font-size: 19px;
          font-weight: 500;
          color: #080808;
          transition: color 0.2s ease;
          line-height: 1.3;
        }

        .faq-trigger:hover .faq-q { color: #C9A84C; }
        .faq-open .faq-q { color: #C9A84C; }

        .faq-icon {
          width: 28px; height: 28px;
          border: 1px solid rgba(0,0,0,0.12);
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
          color: rgba(0,0,0,0.35);
          font-size: 16px;
        }

        .faq-open .faq-icon {
          background: #C9A84C;
          border-color: #C9A84C;
          color: #080808;
          transform: rotate(45deg);
        }

        .faq-answer {
          overflow: hidden;
          transition: max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease;
        }

        .faq-answer-inner {
          padding-bottom: 24px;
          color: #6B6B6B;
          font-size: 15px;
          line-height: 1.75;
          max-width: 640px;
        }

        /* ── Keyframes ── */
        @keyframes faqBlobFloat1 {
          0%,100% { transform: translate(0,0) scale(1); }
          33%      { transform: translate(18px,-22px) scale(1.08); }
          66%      { transform: translate(-12px,14px) scale(0.94); }
        }
        @keyframes faqBlobFloat2 {
          0%,100% { transform: translate(0,0) scale(1); }
          40%      { transform: translate(-20px,16px) scale(1.1); }
          70%      { transform: translate(10px,-10px) scale(0.92); }
        }
        @keyframes faqBlobFloat3 {
          0%,100% { transform: translate(-50%,-50%) scale(1); opacity:0.7; }
          50%      { transform: translate(-50%,-50%) scale(1.18); opacity:1; }
        }
        @keyframes faqSheen {
          0%,100% { transform: scaleX(0.7); opacity:0.7; }
          50%      { transform: scaleX(0.9); opacity:1;   }
        }
        @keyframes faqBorderPulse {
          0%,100% { opacity:1; }
          50%      { opacity:0.6; }
        }
        @keyframes faqCardIn {
          from { opacity:0; transform:translateY(40px) scale(0.96); }
          to   { opacity:1; transform:translateY(0) scale(1); }
        }
        @keyframes faqFadeUp {
          from { opacity:0; transform:translateY(22px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes faqSweep {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }

        .faq-cta-wrap {
          margin-top: 60px;
          position: relative;
          border-radius: 20px;
          overflow: hidden;
          padding: 2px;
          background: linear-gradient(135deg, rgba(201,168,76,0.55) 0%, rgba(201,168,76,0.08) 40%, rgba(201,168,76,0.45) 100%);
          box-shadow: 0 32px 80px rgba(0,0,0,0.14), 0 0 60px rgba(201,168,76,0.08);
          animation: faqBorderPulse 4s ease-in-out infinite;
          /* scroll-triggered start state */
          opacity: 0;
          transform: translateY(40px) scale(0.96);
          transition: opacity 0.8s cubic-bezier(0.22,1,0.36,1), transform 0.8s cubic-bezier(0.22,1,0.36,1);
        }
        .faq-cta-wrap.in-view {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
        .faq-cta-label   { opacity:0; transform:translateY(16px); transition: opacity 0.6s ease 0.15s, transform 0.6s ease 0.15s; }
        .faq-cta-heading { opacity:0; transform:translateY(16px); transition: opacity 0.6s ease 0.28s, transform 0.6s ease 0.28s; }
        .faq-cta-sub     { opacity:0; transform:translateY(16px); transition: opacity 0.6s ease 0.40s, transform 0.6s ease 0.40s; }
        .faq-cta-btns    { opacity:0; transform:translateY(16px); transition: opacity 0.6s ease 0.54s, transform 0.6s ease 0.54s; }
        .faq-cta-wrap.in-view .faq-cta-label,
        .faq-cta-wrap.in-view .faq-cta-heading,
        .faq-cta-wrap.in-view .faq-cta-sub,
        .faq-cta-wrap.in-view .faq-cta-btns {
          opacity: 1; transform: translateY(0);
        }
        .faq-cta {
          position: relative;
          border-radius: 18px;
          overflow: hidden;
          padding: 64px 48px;
          text-align: center;
          background: rgba(250,247,240,0.5);
          backdrop-filter: blur(40px) saturate(180%) brightness(110%);
          -webkit-backdrop-filter: blur(40px) saturate(180%) brightness(110%);
        }

        /* Animated blobs */
        .faq-cta-blob1 {
          position: absolute; width: 340px; height: 340px; border-radius: 50%;
          background: radial-gradient(circle, rgba(201,168,76,0.28) 0%, transparent 68%);
          top: -90px; left: -70px; pointer-events: none; filter: blur(18px);
          animation: faqBlobFloat1 7s ease-in-out infinite;
          will-change: transform;
        }
        .faq-cta-blob2 {
          position: absolute; width: 300px; height: 300px; border-radius: 50%;
          background: radial-gradient(circle, rgba(201,168,76,0.2) 0%, transparent 68%);
          bottom: -70px; right: -50px; pointer-events: none; filter: blur(22px);
          animation: faqBlobFloat2 9s ease-in-out infinite;
          will-change: transform;
        }
        .faq-cta-blob3 {
          position: absolute; width: 200px; height: 200px; border-radius: 50%;
          background: radial-gradient(circle, rgba(255,224,130,0.16) 0%, transparent 70%);
          top: 40%; left: 50%; transform: translate(-50%,-50%);
          pointer-events: none; filter: blur(14px);
          animation: faqBlobFloat3 5s ease-in-out infinite;
          will-change: transform, opacity;
        }

        /* Animated sheen line */
        .faq-cta-sheen {
          position: absolute; top: 0; height: 1px;
          left: 5%; right: 5%;
          transform-origin: center;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.9), rgba(201,168,76,0.7), rgba(255,255,255,0.9), transparent);
          animation: faqSheen 5s ease-in-out infinite;
          will-change: transform, opacity;
        }

        /* Moving sweep shimmer over card */
        .faq-cta-sweep {
          position: absolute; inset: 0; pointer-events: none; overflow: hidden; border-radius: 18px;
        }
        .faq-cta-sweep::after {
          content: '';
          position: absolute; top: 0; bottom: 0; width: 25%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent);
          animation: faqSweep 6s ease-in-out infinite;
          animation-delay: 2s;
        }

        .faq-cta-btns {
          display: flex; gap: 14px;
          justify-content: center; flex-wrap: wrap;
        }
        .faq-cta-wa {
          display: inline-flex; align-items: center; gap: 9px;
          background: linear-gradient(135deg, #E8C96D 0%, #C9A84C 60%, #b8943e 100%);
          color: #1a1000;
          padding: 14px 30px; border-radius: 10px;
          font-size: 11.5px; font-weight: 700; text-decoration: none;
          letter-spacing: 0.12em; text-transform: uppercase;
          transition: transform 0.35s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.35s ease;
          box-shadow: 0 8px 28px rgba(201,168,76,0.38), inset 0 1px 0 rgba(255,255,255,0.4);
          position: relative; overflow: hidden;
        }
        .faq-cta-wa::after {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.25), transparent 60%);
          border-radius: 10px;
        }
        .faq-cta-wa:hover { transform: translateY(-4px) scale(1.03); box-shadow: 0 18px 44px rgba(201,168,76,0.5), inset 0 1px 0 rgba(255,255,255,0.4); }

        .faq-cta-call {
          display: inline-flex; align-items: center; gap: 9px;
          background: rgba(255,255,255,0.35);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          color: #3a2e10;
          padding: 14px 30px; border-radius: 10px;
          font-size: 11.5px; font-weight: 600; text-decoration: none;
          letter-spacing: 0.12em; text-transform: uppercase;
          border: 1px solid rgba(201,168,76,0.4);
          transition: transform 0.35s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.35s ease, background 0.3s ease;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.7), 0 4px 16px rgba(0,0,0,0.06);
        }
        .faq-cta-call:hover { background: rgba(201,168,76,0.18); border-color: rgba(201,168,76,0.7); transform: translateY(-4px) scale(1.03); box-shadow: 0 12px 28px rgba(201,168,76,0.2), inset 0 1px 0 rgba(255,255,255,0.7); }

        @media (max-width: 768px) {
          .faq-section { padding: 80px 20px; }
          .faq-cta { padding: 40px 24px; }
        }
        @media (max-width: 480px) {
          .faq-section { padding: 60px 16px; }
          .faq-cta { padding: 32px 16px; }
          .faq-cta-btns { flex-direction: column; align-items: stretch; }
          .faq-cta-wa, .faq-cta-call { justify-content: center; }
          .faq-q { font-size: 16px; }
          .faq-trigger { padding: 18px 0; gap: 16px; }
        }
      `}</style>

      <section id="faq" className="faq-section">
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>

          <div style={{ textAlign: "center", marginBottom: "64px" }}>
            <span style={{
              display: "block",
              fontSize: "10px", fontWeight: "600", letterSpacing: "0.22em",
              textTransform: "uppercase", color: "#C9A84C", marginBottom: "16px"
            }}>Common Questions</span>
            <h2 style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "clamp(36px, 5vw, 52px)", fontWeight: "400",
              color: "#080808", marginBottom: "12px"
            }}>
              Frequently Asked
            </h2>
            <div style={{ width: "40px", height: "1px", background: "linear-gradient(90deg, transparent, #C9A84C, transparent)", margin: "0 auto" }} />
          </div>

          <div>
            {items.map((faq, i) => (
              <div key={i} className={`faq-item ${open === i ? "faq-open" : ""}`}>
                <button className="faq-trigger" onClick={() => setOpen(open === i ? null : i)}>
                  <span className="faq-q">{faq.q}</span>
                  <span className="faq-icon">+</span>
                </button>
                <div className="faq-answer" style={{ maxHeight: open === i ? "300px" : "0", opacity: open === i ? 1 : 0 }}>
                  <div className="faq-answer-inner">{faq.a}</div>
                </div>
              </div>
            ))}
          </div>

          <div ref={ctaRef} className={`faq-cta-wrap${ctaVisible ? " in-view" : ""}`}>
            <div className="faq-cta">
              {/* Blobs, sheen & sweep */}
              <div className="faq-cta-blob1" />
              <div className="faq-cta-blob2" />
              <div className="faq-cta-blob3" />
              <div className="faq-cta-sheen" />
              <div className="faq-cta-sweep" />

              <div style={{ position: "relative", zIndex: 1 }}>
                <div className="faq-cta-label" style={{ display: "inline-flex", alignItems: "center", gap: "10px", fontSize: "9.5px", fontWeight: "700", letterSpacing: "0.28em", textTransform: "uppercase", color: "#8a6a1a", marginBottom: "20px" }}>
                  <span style={{ width: "24px", height: "1px", background: "linear-gradient(90deg,transparent,#C9A84C)", display: "inline-block" }} />
                  We&apos;re Here To Help
                  <span style={{ width: "24px", height: "1px", background: "linear-gradient(90deg,#C9A84C,transparent)", display: "inline-block" }} />
                </div>

                <h3 className="faq-cta-heading" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(30px, 4.5vw, 44px)", fontWeight: "400", color: "#080808", marginBottom: "12px", lineHeight: 1.15 }}>
                  Still have questions?
                </h3>

                <p className="faq-cta-sub" style={{ color: "rgba(0,0,0,0.42)", fontSize: "14.5px", marginBottom: "40px", maxWidth: "360px", margin: "0 auto 40px", lineHeight: 1.7 }}>
                  Our team typically responds within 30 minutes on WhatsApp.
                </p>

                <div className="faq-cta-btns">
                  <a href={`https://wa.me/${waNumber}?text=${encodeURIComponent(waMessage)}`} target="_blank" rel="noreferrer" className="faq-cta-wa">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    Chat on WhatsApp
                  </a>
                  <a href={`tel:${salonPhoneDigits}`} className="faq-cta-call">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.12 1.2 2 2 0 012.11 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.09a16 16 0 006 6l.45-.45a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z"/></svg>
                    {salonPhone}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}