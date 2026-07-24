"use client";
import Link from "next/link";

export default function BookingCTA() {
  return (
    <>
      <style>{`
        .bcta-wrap {
          background: linear-gradient(135deg, #080808 0%, #1a1200 45%, #0d0d00 100%);
          position: relative; overflow: hidden;
          padding: 80px 24px;
        }
        .bcta-wrap::before {
          content: '';
          position: absolute; inset: 0;
          background: radial-gradient(ellipse 60% 90% at 50% 110%, rgba(201,168,76,0.16), transparent);
          pointer-events: none;
        }
        .bcta-wrap::after {
          content: '';
          position: absolute; top: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(201,168,76,0.35), transparent);
        }
        .bcta-inner {
          max-width: 900px; margin: 0 auto;
          display: flex; flex-direction: column; align-items: center;
          text-align: center; position: relative; z-index: 1;
        }
        .bcta-badge {
          display: inline-flex; align-items: center; gap: 8px;
          border: 1px solid rgba(201,168,76,0.3); border-radius: 999px;
          padding: 5px 16px; font-size: 10px; font-weight: 700;
          letter-spacing: 0.22em; text-transform: uppercase; color: #C9A84C;
          background: rgba(201,168,76,0.07); margin-bottom: 22px;
        }
        .bcta-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(36px, 5.5vw, 60px);
          font-weight: 400; color: #fff; line-height: 1.1; margin-bottom: 16px;
        }
        .bcta-title span { color: #C9A84C; font-style: italic; }
        .bcta-sub {
          font-size: 15px; color: rgba(255,255,255,0.42);
          max-width: 480px; line-height: 1.7; margin-bottom: 40px;
        }
        .bcta-pills {
          display: flex; flex-wrap: wrap; gap: 10px;
          justify-content: center; margin-bottom: 44px;
        }
        .bcta-pill {
          display: flex; align-items: center; gap: 7px;
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.09);
          border-radius: 999px; padding: 7px 16px; font-size: 12px;
          color: rgba(255,255,255,0.55);
        }
        .bcta-pill-dot { width: 6px; height: 6px; border-radius: 50%; background: #C9A84C; flex-shrink: 0; }
        .bcta-btns { display: flex; gap: 14px; flex-wrap: wrap; justify-content: center; }
        .bcta-main-btn {
          display: inline-flex; align-items: center; gap: 10px;
          background: linear-gradient(135deg, #E8C96D, #C9A84C);
          color: #080808; padding: 17px 38px; border-radius: 10px;
          font-size: 13px; font-weight: 700; letter-spacing: 0.1em;
          text-transform: uppercase; text-decoration: none;
          transition: all 0.3s ease; font-family: 'Inter', sans-serif;
        }
        .bcta-main-btn:hover {
          transform: translateY(-3px);
          box-shadow: 0 16px 40px rgba(201,168,76,0.4);
        }
        .bcta-wa-btn {
          display: inline-flex; align-items: center; gap: 10px;
          background: transparent; border: 1.5px solid rgba(37,211,102,0.45);
          color: #25d366; padding: 17px 28px; border-radius: 10px;
          font-size: 13px; font-weight: 600; text-decoration: none;
          transition: all 0.3s ease; font-family: 'Inter', sans-serif;
        }
        .bcta-wa-btn:hover {
          background: rgba(37,211,102,0.08);
          border-color: rgba(37,211,102,0.7);
          transform: translateY(-3px);
        }
        .bcta-hours {
          margin-top: 36px;
          font-size: 12px; color: rgba(255,255,255,0.25);
          display: flex; align-items: center; gap: 8px;
        }
        .bcta-hours-dot { width: 5px; height: 5px; border-radius: 50%; background: rgba(201,168,76,0.5); }

        @media (max-width: 600px) {
          .bcta-wrap { padding: 60px 20px; }
          .bcta-btns { flex-direction: column; align-items: stretch; }
          .bcta-main-btn, .bcta-wa-btn { justify-content: center; }
          .bcta-pills { gap: 8px; }
        }
      `}</style>

      <section className="bcta-wrap">
        <div className="bcta-inner">
          <div className="bcta-badge">
            <span className="bcta-pill-dot" />
            Book Your Home Service
          </div>

          <h2 className="bcta-title">
            Premium Salon, At Your <span>Doorstep</span>
          </h2>

          <p className="bcta-sub">
            Book your at-home beauty service in under 2 minutes. Our certified experts arrive fully equipped — salon-quality results, zero travel needed.
          </p>

          <div className="bcta-pills">
            {[
              "15+ Certified Professionals",
              "Home Service Only",
              "Confirmed in 30 Minutes",
              "Starting from ₹50",
              "9 AM – 8 PM, Every Day",
            ].map(p => (
              <div key={p} className="bcta-pill">
                <span className="bcta-pill-dot" />
                {p}
              </div>
            ))}
          </div>

          <div className="bcta-btns">
            <Link href="/book" className="bcta-main-btn" onClick={() => sessionStorage.setItem("bookingType", "home")}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              Book Home Service
            </Link>
            <a href="https://wa.me/919999601212" target="_blank" rel="noopener noreferrer" className="bcta-wa-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Chat on WhatsApp
            </a>
          </div>

          <div className="bcta-hours">
            <span className="bcta-hours-dot" />
            Open Monday – Sunday &nbsp;·&nbsp; 9:00 AM – 8:00 PM &nbsp;·&nbsp; Wave City, Ghaziabad
          </div>
        </div>
      </section>
    </>
  );
}
