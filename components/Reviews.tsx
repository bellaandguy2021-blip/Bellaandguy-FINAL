"use client";
import { useEffect, useRef, useState } from "react";
import { getTestimonials, DBTestimonial } from "@/lib/homepageContent";

export const reviews = [
  {
    name: "Priya Sharma", rating: 5, date: "2 weeks ago", service: "Bridal Makeup", initials: "PS",
    text: "Absolutely flawless experience. The bridal makeup was exactly what I'd dreamed of — the team is incredibly professional and caring.",
  },
  {
    name: "Rahul Verma", rating: 5, date: "1 month ago", service: "Haircut & Beard", initials: "RV",
    text: "Best salon in Wave City for men, full stop. The haircut and beard styling was top-notch. Clean, professional environment.",
  },
  {
    name: "Sneha Gupta", rating: 5, date: "3 weeks ago", service: "Home Facial", initials: "SG",
    text: "Booked the home facial and was blown away. Expert arrived on time, fully equipped. Felt like a 5-star spa in my own living room.",
  },
  {
    name: "Ankur Saxena", rating: 5, date: "1 week ago", service: "Hair Color", initials: "AS",
    text: "The stylist suggested the perfect shade for my skin tone and the result was exactly what I wanted. Great pricing, zero pressure.",
  },
  {
    name: "Meena Agarwal", rating: 5, date: "5 days ago", service: "Pedicure", initials: "MA",
    text: "I've been coming here for two years. The pedicure is consistently wonderful — great products and they take real care.",
  },
  {
    name: "Vikas Khanna", rating: 5, date: "2 months ago", service: "Clean Shave", initials: "VK",
    text: "Best hot towel shave I've ever had. The barber is a true professional. Incredibly relaxing. The salon is spotlessly clean.",
  },
];

export default function Reviews() {
  const sectionRef = useRef<HTMLElement>(null);
  const [dbReviews, setDbReviews] = useState<DBTestimonial[]>([]);

  useEffect(() => {
    getTestimonials().then(setDbReviews);
  }, []);

  const cards = dbReviews.length > 0
    ? dbReviews.map(r => ({
        name: r.name, rating: r.rating, date: r.location ?? "", service: r.service ?? "",
        initials: r.initials || r.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase(),
        text: r.review, photo: r.photo,
      }))
    : reviews;

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add("visible"); }),
      { threshold: 0.06 }
    );
    sectionRef.current?.querySelectorAll(".reveal, .reveal-scale").forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [cards.length]);

  return (
    <>
      <style>{`
        .rv-section { background: #FAF7F0; padding: 100px 32px; }

        .rv-header { text-align: center; margin-bottom: 60px; }

        .rv-rating-row {
          display: inline-flex; align-items: center; gap: 16px;
          background: #fff; border: 1px solid rgba(0,0,0,0.08); border-radius: 100px;
          padding: 10px 24px; margin-top: 24px;
        }
        .rv-big-num { font-family: 'Cormorant Garamond', serif; font-size: 32px; font-weight: 500; color: #080808; }
        .rv-stars { color: #C9A84C; font-size: 14px; letter-spacing: 2px; }
        .rv-count { font-size: 12px; color: #888; border-left: 1px solid rgba(0,0,0,0.1); padding-left: 16px; }

        .rv-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 18px; }

        .rv-card {
          background: rgba(255,255,255,0.28);
          backdrop-filter: blur(32px) saturate(180%);
          -webkit-backdrop-filter: blur(32px) saturate(180%);
          border: 1px solid rgba(255,255,255,0.72);
          border-radius: 16px;
          padding: 28px; display: flex; flex-direction: column;
          transition:
            transform 0.5s cubic-bezier(0.4,0,0.2,1),
            box-shadow 0.5s cubic-bezier(0.4,0,0.2,1),
            background 0.5s cubic-bezier(0.4,0,0.2,1),
            border-color 0.5s cubic-bezier(0.4,0,0.2,1);
          position: relative; overflow: hidden;
          box-shadow:
            inset 0 1.5px 0 rgba(255,255,255,0.88),
            0 6px 24px rgba(180,150,80,0.09),
            0 2px 6px rgba(0,0,0,0.05);
        }
        .rv-card::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 38%;
          background: linear-gradient(180deg, rgba(255,255,255,0.55), rgba(255,255,255,0));
          border-radius: 16px 16px 0 0; pointer-events: none; z-index: 0;
        }
        .rv-card > * { position: relative; z-index: 1; }
        .rv-card::after {
          content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 1.5px;
          background: linear-gradient(90deg, transparent, rgba(201,168,76,0.5), transparent);
          transform: scaleX(0); transform-origin: left;
          transition: transform 0.5s cubic-bezier(0.4,0,0.2,1);
        }
        .rv-card:hover {
          transform: translateY(-5px);
          background: rgba(255,255,255,0.38);
          border-color: rgba(255,255,255,0.88);
          box-shadow:
            inset 0 1.5px 0 rgba(255,255,255,0.95),
            0 18px 48px rgba(180,150,80,0.14),
            0 4px 12px rgba(0,0,0,0.06);
        }
        .rv-card:hover::after { transform: scaleX(1); }

        .rv-quote {
          position: absolute; top: 20px; right: 24px;
          font-family: 'Cormorant Garamond', serif; font-size: 64px;
          color: rgba(201,168,76,0.08); line-height: 1; font-weight: 700;
          user-select: none;
        }

        .rv-service-tag {
          display: inline-block; background: rgba(201,168,76,0.1);
          border: 1px solid rgba(201,168,76,0.2); border-radius: 100px;
          padding: 3px 12px; font-size: 10px; font-weight: 600;
          color: #C9A84C; letter-spacing: 0.08em; text-transform: uppercase;
          margin-bottom: 14px; width: fit-content;
        }

        .rv-text { color: #555; font-size: 14px; line-height: 1.75; flex: 1; margin-bottom: 20px; }

        .rv-author { display: flex; align-items: center; gap: 12px; padding-top: 16px; border-top: 1px solid rgba(0,0,0,0.06); margin-top: auto; }
        .rv-avatar {
          width: 40px; height: 40px; border-radius: 50%;
          background: linear-gradient(135deg, rgba(201,168,76,0.25), rgba(201,168,76,0.1));
          border: 1px solid rgba(201,168,76,0.2);
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 700; color: #C9A84C; flex-shrink: 0;
        }
        .rv-name { font-size: 14px; font-weight: 600; color: #1a1a1a; }
        .rv-date { font-size: 11.5px; color: #aaa; }
        .rv-google { margin-left: auto; opacity: 0.4; }

        @media (max-width: 900px) { .rv-grid { grid-template-columns: repeat(2,1fr); } }
        @media (max-width: 560px) { .rv-grid { grid-template-columns: 1fr; } .rv-section { padding: 72px 16px; } }
        @media (max-width: 480px) {
          .rv-rating-row { flex-wrap: wrap; gap: 10px; padding: 10px 16px; }
          .rv-count { border-left: none; padding-left: 0; font-size: 11px; }
          .rv-card { padding: 20px; }
        }
      `}</style>

      <section id="reviews" className="rv-section" ref={sectionRef}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>

          <div className="rv-header">
            <div className="reveal">
              <span style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "10px", fontWeight: "600", letterSpacing: "0.22em", textTransform: "uppercase", color: "#C9A84C" }}>
                <span style={{ width: "20px", height: "1px", background: "#C9A84C", display: "inline-block" }} />
                Client Love
              </span>
            </div>
            <h2 className="reveal" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(34px,5vw,52px)", fontWeight: "400", color: "#080808", marginTop: "12px", marginBottom: "8px" }}>
              What Our Clients Say
            </h2>
            <div style={{ width: "40px", height: "1px", background: "linear-gradient(90deg,transparent,#C9A84C,transparent)", margin: "0 auto 20px" }} />
            <div className="rv-rating-row reveal">
              <span className="rv-big-num">4.6</span>
              <div>
                <div className="rv-stars">★★★★★</div>
              </div>
            </div>
          </div>

          <div className="rv-grid">
            {cards.map((r: any, i) => (
              <div key={i} className={`rv-card reveal-scale reveal-d${i + 1}`}>
                <span className="rv-quote">"</span>
                {r.service && <span className="rv-service-tag">{r.service}</span>}
                <div style={{ display: "flex", gap: "2px", marginBottom: "12px" }}>
                  {[...Array(r.rating)].map((_, j) => <span key={j} style={{ color: "#C9A84C", fontSize: "12px" }}>★</span>)}
                </div>
                <p className="rv-text">{r.text}</p>
                <div className="rv-author">
                  <div className="rv-avatar">
                    {r.photo ? <img src={r.photo} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} /> : r.initials}
                  </div>
                  <div>
                    <div className="rv-name">{r.name}</div>
                    <div className="rv-date">{r.date}</div>
                  </div>
                  <div className="rv-google">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#5F6368">
                      <path d="M12 0C5.372 0 0 5.372 0 12s5.372 12 12 12 12-5.372 12-12S18.628 0 12 0zm.14 19.018c-3.868 0-7-3.14-7-7.018 0-3.878 3.132-7.018 7-7.018 1.89 0 3.47.697 4.682 1.829l-1.974 1.978v-.004c-.735-.702-1.667-1.062-2.708-1.062-2.31 0-4.187 1.956-4.187 4.273 0 2.315 1.877 4.277 4.187 4.277 2.096 0 3.522-1.202 3.816-2.852H12.14v-2.737h6.585c.088.47.135.96.135 1.474 0 4.01-2.677 6.86-6.72 6.86z"/>
                    </svg>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>
    </>
  );
}
