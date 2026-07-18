"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check, Clock, Sparkles, ShieldCheck, Sun, Droplets,
  ChevronDown, ChevronLeft, ChevronRight, ArrowRight, TrendingUp, ListChecks, ArrowLeft,
} from "lucide-react";
import type { Category, ServiceItem } from "@/lib/servicesData";
import { productBrands } from "@/lib/servicesData";
import InquiryButton from "./InquiryButton";

interface ServiceDetailProps {
  category: Category;
  service: ServiceItem;
  gender: "female" | "male";
}

export default function ServiceDetail({ category, service, gender }: ServiceDetailProps) {
  const router = useRouter();
  function handleBack() {
    if (typeof window !== "undefined" && window.history.length > 1) router.back();
    else router.push("/#services");
  }
  const hasProductGallery = !!service.gallery?.length;
  const gallery = hasProductGallery
    ? service.gallery!
    : gender === "male" && category.imgsMale?.length ? category.imgsMale : category.imgs;
  const [[activeImg, direction], setSlide] = useState<[number, number]>([0, 0]);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  function goToSlide(next: number) {
    setSlide(([current]) => [(next + gallery.length) % gallery.length, next > current ? 1 : -1]);
  }

  const descParts = (service.desc ?? "").split("·").map(p => p.trim()).filter(Boolean);
  const suitableFor = descParts.length > 0 ? descParts[descParts.length - 1] : "";
  const derivedBenefits = descParts.slice(0, descParts.length > 1 ? -1 : undefined);
  const benefits = service.benefits?.length ? service.benefits : derivedBenefits;
  const brand = service.brandKey ? productBrands[service.brandKey] : undefined;

  const hasDiscount = !!service.discountPercent && service.discountPercent > 0;
  const discountedPrice = hasDiscount ? Math.round(service.price * (1 - service.discountPercent! / 100)) : service.price;
  const hasBeforeAfter = !!(service.beforeImages?.length && service.afterImages?.length);
  const allFaqs = [...(service.faqs ?? []), ...(category.faqs ?? [])];

  function handleBookNow() {
    const key = service.group ? `${service.group} – ${service.name}` : service.name;
    localStorage.setItem("preselectService", `${key} — ${category.label}`);
    localStorage.setItem("preselectGender", gender);
    sessionStorage.setItem("bookingType", "home");
    window.location.href = "/book";
  }

  return (
    <>
      <style>{`
        .sd-wrap { background: #FAF7F0; min-height: 100vh; }
        .sd-hero {
          background: linear-gradient(135deg, #080808 0%, #1a1200 50%, #080808 100%);
          padding: 48px 20px 32px; position: relative; overflow: hidden;
        }
        .sd-hero::before {
          content: ""; position: absolute; inset: 0;
          background: radial-gradient(ellipse 60% 70% at 50% 110%, rgba(201,168,76,0.18), transparent);
        }
        .sd-hero-inner { max-width: 960px; margin: 0 auto; position: relative; z-index: 1; }
        .sd-crumb { font-size: 10px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; color: #C9A84C; margin-bottom: 12px; }
        .sd-back {
          display: inline-flex; align-items: center; gap: 6px;
          background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12);
          color: rgba(255,255,255,0.75); border-radius: 20px; padding: 6px 14px 6px 12px;
          font-size: 11.5px; font-weight: 600; cursor: pointer; margin-bottom: 16px;
          transition: all 0.2s ease;
        }
        .sd-back:hover { background: rgba(201,168,76,0.15); border-color: rgba(201,168,76,0.4); color: #E8C96D; }
        .sd-title { font-family: 'Cormorant Garamond', serif; font-size: clamp(28px,4.5vw,44px); font-weight: 400; color: #fff; line-height: 1.15; margin: 0 0 10px; }
        .sd-meta-row { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 4px; }
        .sd-pill { display: inline-flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.08); border: 1px solid rgba(201,168,76,0.3); color: #E8C96D; border-radius: 20px; padding: 6px 14px; font-size: 12px; font-weight: 600; }
        .sd-price { font-family: 'Cormorant Garamond', serif; font-size: 28px; color: #fff; font-weight: 600; }

        .sd-body { max-width: 960px; margin: 0 auto; padding: 32px 20px 100px; }
        .sd-section { margin-bottom: 40px; }
        .sd-section-title { font-family: 'Cormorant Garamond', serif; font-size: 24px; font-weight: 500; color: #080808; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
        .sd-section-title svg { color: #C9A84C; }

        .sd-gallery { position: relative; border-radius: 18px; overflow: hidden; background: #eee; aspect-ratio: 16/9; }
        .sd-gallery img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
        .sd-gallery.sd-gallery-product { background: #FFFDF8; }
        .sd-gallery.sd-gallery-product img { object-fit: contain; padding: 28px; box-sizing: border-box; }
        .sd-gallery-nav { position: absolute; top: 50%; transform: translateY(-50%); width: 34px; height: 34px; border-radius: 50%; background: rgba(8,8,8,0.55); color: #fff; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; backdrop-filter: blur(4px); }
        .sd-gallery-nav.prev { left: 12px; } .sd-gallery-nav.next { right: 12px; }
        .sd-gallery-dots { position: absolute; bottom: 12px; left: 0; right: 0; display: flex; justify-content: center; gap: 6px; }
        .sd-gallery-dot { width: 7px; height: 7px; border-radius: 50%; background: rgba(255,255,255,0.5); cursor: pointer; }
        .sd-gallery-dot.on { background: #C9A84C; width: 20px; border-radius: 4px; }

        .sd-benefits-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px,1fr)); gap: 12px; }
        .sd-benefit-card { display: flex; align-items: flex-start; gap: 10px; background: #fff; border: 1px solid rgba(0,0,0,0.06); border-radius: 12px; padding: 14px 16px; }
        .sd-benefit-card svg { color: #2d8f5e; flex-shrink: 0; margin-top: 2px; }
        .sd-benefit-card span { font-size: 13.5px; color: #333; font-weight: 500; }

        .sd-brand-card { display: flex; align-items: center; gap: 16px; background: #fff; border: 1px solid rgba(201,168,76,0.25); border-radius: 14px; padding: 18px 20px; }
        .sd-brand-badge { flex-shrink: 0; width: 56px; height: 56px; border-radius: 12px; background: linear-gradient(135deg,#1a1200,#080808); display: flex; align-items: center; justify-content: center; color: #C9A84C; font-family: 'Cormorant Garamond', serif; font-size: 20px; font-weight: 700; }
        .sd-brand-name { font-weight: 700; color: #080808; font-size: 15px; margin-bottom: 4px; }
        .sd-brand-desc { font-size: 12.5px; color: #777; line-height: 1.5; }

        .sd-process { display: flex; flex-direction: column; gap: 0; }
        .sd-process-step { display: flex; gap: 16px; position: relative; padding-bottom: 24px; }
        .sd-process-step:last-child { padding-bottom: 0; }
        .sd-process-line { position: absolute; left: 15px; top: 32px; bottom: 0; width: 1.5px; background: rgba(201,168,76,0.25); }
        .sd-process-num { flex-shrink: 0; width: 32px; height: 32px; border-radius: 50%; background: #fff; border: 2px solid #C9A84C; color: #8a6a1a; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; z-index: 1; }
        .sd-process-title { font-weight: 700; color: #080808; font-size: 14px; margin-bottom: 3px; }
        .sd-process-desc { font-size: 12.5px; color: #777; line-height: 1.5; }

        .sd-tags-row { display: flex; flex-wrap: wrap; gap: 8px; }
        .sd-tag { background: rgba(201,168,76,0.08); border: 1px solid rgba(201,168,76,0.25); color: #8a6a1a; border-radius: 20px; padding: 7px 14px; font-size: 12.5px; font-weight: 600; }

        .sd-aftercare-list { display: flex; flex-direction: column; gap: 10px; }
        .sd-aftercare-item { display: flex; align-items: flex-start; gap: 10px; font-size: 13.5px; color: #333; }
        .sd-aftercare-item svg { color: #C9A84C; flex-shrink: 0; margin-top: 2px; }

        .sd-faq-item { border-bottom: 1px solid rgba(0,0,0,0.08); }
        .sd-faq-q { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 16px 4px; background: none; border: none; text-align: left; font-size: 14px; font-weight: 600; color: #080808; cursor: pointer; }
        .sd-faq-q svg { color: #C9A84C; flex-shrink: 0; transition: transform 0.25s ease; }
        .sd-faq-a { font-size: 13px; color: #666; line-height: 1.6; padding: 0 4px 16px; }

        .sd-book-bar { position: sticky; bottom: 0; background: rgba(255,255,255,0.95); backdrop-filter: blur(12px); border-top: 1px solid rgba(0,0,0,0.08); padding: 14px 20px; display: flex; align-items: center; justify-content: space-between; gap: 16px; max-width: 960px; margin: 0 auto; }
        .sd-book-price { font-family: 'Cormorant Garamond', serif; font-size: 22px; font-weight: 700; color: #080808; }
        .sd-book-price small { display: block; font-size: 10px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #999; }
        .sd-book-btn { display: inline-flex; align-items: center; gap: 8px; background: linear-gradient(135deg,#E8C96D,#C9A84C); color: #080808; border: none; border-radius: 10px; padding: 14px 26px; font-size: 13px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; cursor: pointer; transition: all 0.25s ease; }
        .sd-book-btn:hover { transform: translateY(-1px); box-shadow: 0 10px 28px rgba(201,168,76,0.4); }

        .sd-disclaimer { font-size: 11px; color: #999; text-align: center; margin-top: 8px; }

        @media (max-width: 480px) {
          .sd-book-bar { flex-wrap: wrap; justify-content: center; gap: 10px; }
          .sd-book-price { flex: 1 1 100%; text-align: center; }
        }
      `}</style>

      <div className="sd-wrap">
        <div className="sd-hero">
          <div className="sd-hero-inner">
            <button className="sd-back" onClick={handleBack}><ArrowLeft size={13} /> Back</button>
            <div className="sd-crumb">{category.label}</div>
            <h1 className="sd-title">{service.name}</h1>
            <div className="sd-meta-row">
              {service.duration && (
                <span className="sd-pill"><Clock size={12} /> {service.duration}</span>
              )}
              {service.popular && (
                <span className="sd-pill"><Sparkles size={12} /> Popular</span>
              )}
              {service.trending && (
                <span className="sd-pill"><TrendingUp size={12} /> Trending</span>
              )}
              {category.homeService && (
                <span className="sd-pill"><ShieldCheck size={12} /> Home Service Available</span>
              )}
              {hasDiscount && (
                <span className="sd-pill" style={{ background: "rgba(76,201,120,0.15)", borderColor: "rgba(76,201,120,0.4)", color: "#6fe0a0" }}>{service.discountPercent}% OFF</span>
              )}
            </div>
            <div className="sd-price">
              {hasDiscount && <span style={{ fontSize: 18, color: "rgba(255,255,255,0.35)", textDecoration: "line-through", fontWeight: 400, marginRight: 8 }}>₹{service.price.toLocaleString()}</span>}
              ₹{discountedPrice.toLocaleString()} <span style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", fontFamily: "'Inter',sans-serif" }}>starting · incl. GST</span>
            </div>
          </div>
        </div>

        <div className="sd-body">
          {/* Gallery */}
          <div className="sd-section">
            <div className={`sd-gallery ${hasProductGallery ? "sd-gallery-product" : ""}`}>
              <AnimatePresence initial={false} custom={direction} mode="popLayout">
                <motion.img
                  key={activeImg}
                  src={gallery[activeImg]}
                  alt={`${service.name} — ${category.label}`}
                  custom={direction}
                  initial={{ x: direction >= 0 ? "100%" : "-100%", opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: direction >= 0 ? "-100%" : "100%", opacity: 0 }}
                  transition={{ type: "tween", duration: 0.35, ease: "easeInOut" }}
                />
              </AnimatePresence>
              {gallery.length > 1 && (
                <>
                  <button className="sd-gallery-nav prev" onClick={() => goToSlide(activeImg - 1)}><ChevronLeft size={18} /></button>
                  <button className="sd-gallery-nav next" onClick={() => goToSlide(activeImg + 1)}><ChevronRight size={18} /></button>
                  <div className="sd-gallery-dots">
                    {gallery.map((_, i) => (
                      <span key={i} className={`sd-gallery-dot ${i === activeImg ? "on" : ""}`} onClick={() => goToSlide(i)} />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Long Description */}
          {service.longDesc && (
            <div className="sd-section">
              <div className="sd-section-title"><Sparkles size={18} /> About This Service</div>
              <p style={{ fontSize: 14, color: "#555", lineHeight: 1.75 }}>{service.longDesc}</p>
            </div>
          )}

          {/* Included Steps (service-specific) */}
          {service.includedSteps && service.includedSteps.length > 0 && (
            <div className="sd-section">
              <div className="sd-section-title"><ListChecks size={18} /> What's Included</div>
              <div className="sd-aftercare-list">
                {service.includedSteps.map((step, i) => (
                  <div key={i} className="sd-aftercare-item"><Check size={14} /><span>{step}</span></div>
                ))}
              </div>
            </div>
          )}

          {/* Benefits */}
          {benefits.length > 0 && (
            <div className="sd-section">
              <div className="sd-section-title"><Sparkles size={18} /> Benefits</div>
              <div className="sd-benefits-grid">
                {benefits.map((b, i) => (
                  <div key={i} className="sd-benefit-card"><Check size={16} /><span>{b}</span></div>
                ))}
              </div>
            </div>
          )}

          {/* Product Used */}
          {brand && (
            <div className="sd-section">
              <div className="sd-section-title"><Droplets size={18} /> Product Used</div>
              <div className="sd-brand-card">
                <div className="sd-brand-badge">{brand.name.slice(0, 2).toUpperCase()}</div>
                <div>
                  <div className="sd-brand-name">{brand.name}</div>
                  <div className="sd-brand-desc">{brand.description}</div>
                </div>
              </div>
            </div>
          )}

          {/* Process (category-level) — skipped when this service has its own Included Steps above, to avoid showing two overlapping checklists */}
          {!service.includedSteps?.length && category.processSteps && category.processSteps.length > 0 && (
            <div className="sd-section">
              <div className="sd-section-title"><ArrowRight size={18} /> Treatment Process</div>
              <div className="sd-process">
                {category.processSteps.map((step, i) => (
                  <div key={i} className="sd-process-step">
                    {i < category.processSteps!.length - 1 && <div className="sd-process-line" />}
                    <div className="sd-process-num">{i + 1}</div>
                    <div>
                      <div className="sd-process-title">{step.title}</div>
                      <div className="sd-process-desc">{step.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suitable For */}
          {suitableFor && (
            <div className="sd-section">
              <div className="sd-section-title"><ShieldCheck size={18} /> Who Should Choose This</div>
              <div className="sd-tags-row">
                {suitableFor.split("/").map((t, i) => (
                  <span key={i} className="sd-tag">{t.trim()}</span>
                ))}
              </div>
            </div>
          )}

          {/* Before & After */}
          {hasBeforeAfter && (
            <div className="sd-section">
              <div className="sd-section-title"><Sparkles size={18} /> Before &amp; After</div>
              <div className="sd-benefits-grid">
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#999", marginBottom: 8 }}>Before</div>
                  <div style={{ borderRadius: 14, overflow: "hidden", aspectRatio: "4/3" }}>
                    <img src={service.beforeImages![0]} alt={`${service.name} before`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#C9A84C", marginBottom: 8 }}>After</div>
                  <div style={{ borderRadius: 14, overflow: "hidden", aspectRatio: "4/3" }}>
                    <img src={service.afterImages![0]} alt={`${service.name} after`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Aftercare */}
          {category.aftercare && category.aftercare.length > 0 && (
            <div className="sd-section">
              <div className="sd-section-title"><Sun size={18} /> Aftercare</div>
              <div className="sd-aftercare-list">
                {category.aftercare.map((tip, i) => (
                  <div key={i} className="sd-aftercare-item"><Check size={14} /><span>{tip}</span></div>
                ))}
              </div>
            </div>
          )}

          {/* FAQs (service-specific first, then category-shared) */}
          {allFaqs.length > 0 && (
            <div className="sd-section">
              <div className="sd-section-title">FAQs</div>
              <div>
                {allFaqs.map((faq, i) => (
                  <div key={i} className="sd-faq-item">
                    <button className="sd-faq-q" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                      {faq.q}
                      <motion.span animate={{ rotate: openFaq === i ? 180 : 0 }}><ChevronDown size={16} /></motion.span>
                    </button>
                    {openFaq === i && <div className="sd-faq-a">{faq.a}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="sd-book-bar">
          <div className="sd-book-price">
            <small>Starting at</small>
            {hasDiscount && <span style={{ fontSize: 13, color: "#999", textDecoration: "line-through", fontWeight: 400, marginRight: 6 }}>₹{service.price.toLocaleString()}</span>}
            ₹{discountedPrice.toLocaleString()}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <InquiryButton service={`${service.group ? `${service.group} – ${service.name}` : service.name} — ${category.label}`} gender={gender} />
            <button className="sd-book-btn" onClick={handleBookNow}>
              Book Home Service <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
