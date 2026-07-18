"use client";
import { useState, useEffect, useRef, Fragment } from "react";
import Link from "next/link";
import { allCategories as staticCategories, ServiceItem, Category, slugifyService } from "../lib/servicesData";
import { getDynamicCategories, mergeCategories } from "../lib/dynamicServices";
import InquiryButton from "./InquiryButton";
import { Search, X, Check, ShoppingBag } from "lucide-react";
import { useCart } from "./CartProvider";
import { cartItemKey } from "../lib/cart";

interface ServicesProps {
  onServiceSelect?: (service: string, catId: string) => void;
  title?: string;
  subtitle?: string;
}

const CAT_GRADIENTS: Record<string, [string, string]> = {
  wax:           ["#fdf8e8", "#f0e0a0"],
  "dtan-bleach": ["#eaf4ff", "#b8d8f4"],
  cleanup:       ["#eafaf2", "#a8e0c4"],
  facial:        ["#fff5e6", "#f5d498"],
  japanese:      ["#f0ecff", "#c8b4f0"],
  "mani-pedi":   ["#fef0f8", "#f4c0e0"],
  body:          ["#edf8f2", "#a0d8b8"],
  "hair-spa":    ["#fff4ec", "#f4c8a0"],
  "hair-color":    ["#f5ecff", "#d0a8f0"],
  "threading-wax": ["#fff0f5", "#f4b8d0"],
  "men-grooming":  ["#edf2fc", "#b8c8e8"],
  "men-color":     ["#fdf5e8", "#f0d4a4"],
};

/** Card thumbnail that auto-cycles through a service's photos when it has more than one. */
function ServiceCardImage({ images, alt }: { images: string[]; alt: string }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (images.length < 2) return;
    setIdx(0);
    const t = setInterval(() => setIdx(i => (i + 1) % images.length), 2600);
    return () => clearInterval(t);
  }, [images.length, images[0]]);
  return (
    <>
      <div className="sv-sc-slider" style={{ transform: `translateX(-${idx * 100}%)` }}>
        {images.map((src, i) => (
          <img key={src + i} src={src} alt={alt} className="sv-sc-img-photo" loading="lazy" decoding="async" />
        ))}
      </div>
      {images.length > 1 && (
        <div className="sv-sc-dots">
          {images.map((_, i) => <span key={i} className={`sv-sc-dot ${i === idx ? "on" : ""}`} />)}
        </div>
      )}
    </>
  );
}

export default function Services({ onServiceSelect, title, subtitle }: ServicesProps = {}) {
  const [selectedId, setSelectedId]       = useState<string>(staticCategories[0].id);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [gender, setGender]               = useState<"female" | "male">("female");
  const [showAll, setShowAll]             = useState(false);
  const [search, setSearch]               = useState("");
  const [allCategories, setAllCategories] = useState<Category[]>(staticCategories);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    getDynamicCategories().then(dynamic => {
      if (dynamic.length) setAllCategories(mergeCategories(staticCategories, dynamic));
    });
  }, []);
  const VISIBLE_COUNT = 4;
  const { addItem, justAddedKey } = useCart();
  const [addingKey, setAddingKey] = useState<string | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add("visible"); }),
      { threshold: 0.06 }
    );
    sectionRef.current?.querySelectorAll(".reveal").forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  useEffect(() => { setSelectedGroup(null); setShowAll(false); }, [selectedId]);
  useEffect(() => { setShowAll(false); }, [selectedGroup]);

  const displayCats = allCategories.filter(c => c.gender === gender || c.gender === "both");

  useEffect(() => {
    const dCats = allCategories.filter(c => c.gender === gender || c.gender === "both");
    if (!dCats.find(c => c.id === selectedId)) {
      setSelectedId(dCats[0]?.id ?? allCategories[0].id);
    }
    setSelectedGroup(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gender]);

  const selectedCat = displayCats.find(c => c.id === selectedId) ?? displayCats[0] ?? allCategories[0];
  const groups        = [...new Set(selectedCat.services.filter(s => s.group).map(s => s.group!))];
  const unsortedVisible = selectedGroup
    ? selectedCat.services.filter(s => s.group === selectedGroup)
    : selectedCat.services;
  // Admin-managed categories arrive already ordered by the admin panel's
  // drag-and-drop (sort_order), so what the admin arranged is exactly what
  // renders — no re-sorting.
  //
  // Static-catalog categories (never imported into the admin DB) keep the
  // legacy display sort: un-grouped un-sectioned services first,
  // price-ascending; then grouped services clustered by brand/product line
  // (each cluster gets its own divider heading below, like sections do);
  // sectioned services last, clustered by brand within each section. Wax
  // keeps a fixed brand order; every other category clusters its groups in
  // order of first appearance.
  const FIXED_GROUP_ORDER: Record<string, string[]> = {
    wax: ["Honey Wax", "White Chocolate Wax", "Rica Wax"],
  };
  // Per-brand divider headings are a wax-only treatment (Honey Wax / White
  // Chocolate Wax / Rica Wax). Every other category keeps its original look:
  // price-sorted services, headings only for umbrella `section`s like
  // "Japanese Rituals".
  const useGroupHeadings = selectedCat.id === "wax";
  const unsectionedGroupOrder = !useGroupHeadings ? [] : FIXED_GROUP_ORDER[selectedCat.id] ?? (() => {
    const order: string[] = [];
    unsortedVisible.forEach(s => { if (!s.section && s.group && !order.includes(s.group)) order.push(s.group); });
    return order;
  })();
  const sectionOrder: string[] = [];
  unsortedVisible.forEach(s => { if (s.section && !sectionOrder.includes(s.section)) sectionOrder.push(s.section); });
  const groupOrderBySection: Record<string, string[]> = {};
  unsortedVisible.forEach(s => {
    if (!s.section) return;
    const order = (groupOrderBySection[s.section] ??= []);
    const g = s.group ?? "";
    if (!order.includes(g)) order.push(g);
  });
  // Admin-ordered categories keep the admin's drag order, with one layout
  // rule on top: un-sectioned services always render first (e.g. plain
  // facials above the "Japanese Rituals" block), and each section's services
  // stay together below them — admin order preserved within each part.
  const adminOrderedServices = selectedCat.adminOrdered
    ? [
        ...unsortedVisible.filter(s => !s.section),
        ...sectionOrder.flatMap(sec => unsortedVisible.filter(s => s.section === sec)),
      ]
    : null;
  const visibleServices = adminOrderedServices ?? [...unsortedVisible].sort((a, b) => {
    const aKey = a.section ? sectionOrder.indexOf(a.section) : -1;
    const bKey = b.section ? sectionOrder.indexOf(b.section) : -1;
    if (aKey !== bKey) return aKey - bKey;
    if (!a.section) {
      const aGroupIdx = unsectionedGroupOrder.indexOf(a.group ?? "");
      const bGroupIdx = unsectionedGroupOrder.indexOf(b.group ?? "");
      return aGroupIdx !== bGroupIdx ? aGroupIdx - bGroupIdx : a.price - b.price;
    }
    const order = groupOrderBySection[a.section];
    const aGroupIdx = order.indexOf(a.group ?? "");
    const bGroupIdx = order.indexOf(b.group ?? "");
    return aGroupIdx !== bGroupIdx ? aGroupIdx - bGroupIdx : a.price - b.price;
  });

  // Strips spaces/hyphens/punctuation so "detan" matches "D-Tan", "hairspa" matches "Hair Spa", etc.
  // without ever touching the displayed labels themselves.
  const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, "");

  const searchQuery = normalize(search.trim());
  const searchResults = searchQuery
    ? displayCats.flatMap(cat =>
        cat.services
          .filter(s =>
            normalize(s.name).includes(searchQuery) ||
            normalize(cat.label).includes(searchQuery) ||
            normalize(s.group ?? "").includes(searchQuery)
          )
          .map(s => ({ service: s, cat }))
      )
    : [];
  const isSearching = searchQuery.length > 0;

  function handleAddToCart(service: ServiceItem, cat: Category = selectedCat, image?: string) {
    if (!cat.homeService) {
      window.location.href = "tel:+919625928495";
      return;
    }
    const key = cartItemKey(cat.id, service.name, service.group);
    setAddingKey(key);
    setTimeout(() => {
      addItem({
        key,
        name: service.name,
        categoryId: cat.id,
        categoryLabel: cat.label,
        group: service.group,
        price: service.discountPercent ? Math.round(service.price * (1 - service.discountPercent / 100)) : service.price,
        duration: service.duration,
        image,
      });
      setAddingKey(k => (k === key ? null : k));
    }, 260);
  }

  function handleBookService(service: ServiceItem, cat: Category = selectedCat) {
    if (!cat.homeService) {
      window.location.href = "tel:+919625928495";
      return;
    }
    const key   = service.group ? `${service.group} – ${service.name}` : service.name;
    const value = `${key} — ${cat.label}`;
    if (onServiceSelect) {
      onServiceSelect(value, cat.id);
    } else {
      localStorage.setItem("preselectService", value);
      localStorage.setItem("preselectGender", gender);
      window.location.href = "/book";
    }
  }

  function getCardSubtitle(svc: ServiceItem, catId: string): string {
    if (catId === "wax") {
      const m: Record<string, string> = {
        "Honey Wax":           "Natural honey formula | Gentle on all skin",
        "White Chocolate Wax": "Moisturizing formula | Nourishes as it removes",
        "Rica Wax":            "Rica formula | Best for sensitive skin",
      };
      return svc.group ? (m[svc.group] ?? "") : "";
    }
    if (catId === "dtan-bleach") {
      const m: Record<string, string> = {
        "D-Tan":       "Removes sun tan & dark spots | 20 min treatment",
        "Face Bleach": "Brightens complexion | Visible in 1 session",
        "Body Bleach": "Full coverage | Evens skin tone",
      };
      return svc.group ? (m[svc.group] ?? "") : "";
    }
    if (svc.desc) return svc.desc.split("·")[0].trim();
    return "";
  }

  function getCardDesc(svc: ServiceItem): string {
    if (!svc.desc) return "";
    const parts = svc.desc.split("·").map(p => p.trim()).filter(Boolean);
    return parts.slice(1).join(" · ");
  }

  return (
    <>
      <style>{`
        /* ── Section ─────────────────────────────────────────────── */
        .sv-section { background: #FAF7F0; padding: 100px 0 120px; }
        .sv-container { max-width: 1200px; margin: 0 auto; padding: 0 32px; }

        /* ── Header ──────────────────────────────────────────────── */
        .sv-header { text-align: center; margin-bottom: 40px; }
        .sv-eyebrow {
          display: inline-flex; align-items: center; gap: 8px;
          font-size: 10px; font-weight: 600; letter-spacing: 0.22em;
          text-transform: uppercase; color: #C9A84C; margin-bottom: 16px;
        }
        .sv-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(34px, 5vw, 54px); font-weight: 400;
          color: #080808; line-height: 1.1; margin-bottom: 12px;
        }
        .sv-divider {
          width: 40px; height: 1px;
          background: linear-gradient(90deg, transparent, #C9A84C, transparent);
          margin: 0 auto 16px;
        }
        .sv-subtitle { color: #6B6B6B; font-size: 15px; }

        /* ── Gender Toggle ───────────────────────────────────────── */
        .sv-gender-outer {
          display: flex; justify-content: center;
          padding: 0 32px 28px;
        }
        .sv-gender-pill {
          display: inline-flex;
          background: rgba(0,0,0,0.06);
          border-radius: 100px;
          padding: 4px;
          gap: 2px;
        }
        .sv-gen-btn {
          display: flex; align-items: center; gap: 8px;
          padding: 10px 32px; border-radius: 100px;
          border: none; background: transparent;
          font-size: 13.5px; font-weight: 600; cursor: pointer;
          transition: all 0.25s ease; color: #666;
          letter-spacing: 0.02em;
        }
        .sv-gen-btn .sv-gen-symbol { font-size: 18px; }
        .sv-gen-btn.sv-gen-on {
          background: #C9A84C;
          color: #080808;
          box-shadow: 0 3px 14px rgba(201,168,76,0.35);
        }
        .sv-gen-btn:not(.sv-gen-on):hover { background: rgba(0,0,0,0.05); color: #333; }

        /* ── Search ───────────────────────────────────────────────── */
        .sv-search-outer { display: flex; justify-content: center; padding: 0 32px 28px; }
        .sv-search-box {
          position: relative; width: 100%; max-width: 460px;
          display: flex; align-items: center;
        }
        .sv-search-icon { position: absolute; left: 16px; color: rgba(0,0,0,0.32); pointer-events: none; }
        .sv-search-input {
          width: 100%; padding: 13px 40px 13px 42px;
          border: 1.5px solid rgba(0,0,0,0.1); border-radius: 100px;
          font-size: 13.5px; font-family: 'Inter', sans-serif; color: #080808;
          background: #fff; outline: none; transition: all 0.22s;
        }
        .sv-search-input:focus { border-color: rgba(201,168,76,0.5); box-shadow: 0 0 0 3px rgba(201,168,76,0.1); }
        .sv-search-input::placeholder { color: rgba(0,0,0,0.32); }
        .sv-search-clear {
          position: absolute; right: 12px; background: rgba(0,0,0,0.06); border: none;
          border-radius: 50%; width: 22px; height: 22px; display: flex; align-items: center;
          justify-content: center; cursor: pointer; color: rgba(0,0,0,0.5);
        }
        .sv-search-clear:hover { background: rgba(0,0,0,0.12); }
        .sv-search-empty { padding: 48px 24px; text-align: center; color: #999; font-size: 14px; }

        /* ── Category Tabs ───────────────────────────────────────── */
        .sv-tabs-bar {
          background: #fff;
          border-bottom: 1px solid rgba(0,0,0,0.08);
          box-shadow: 0 2px 12px rgba(0,0,0,0.05);
        }
        .sv-tabs-scroll {
          display: flex; overflow-x: auto;
          scrollbar-width: none;
          max-width: 1200px; margin: 0 auto;
          padding: 0 24px; gap: 4px;
        }
        .sv-tabs-scroll::-webkit-scrollbar { display: none; }

        .sv-tab {
          display: flex; flex-direction: column; align-items: center; gap: 6px;
          padding: 14px 18px 10px; border: none; background: transparent;
          cursor: pointer; position: relative; white-space: nowrap;
          transition: all 0.2s ease; min-width: 76px; flex-shrink: 0;
        }
        .sv-tab::after {
          content: ''; position: absolute;
          bottom: 0; left: 10px; right: 10px; height: 2.5px;
          background: #C9A84C; border-radius: 2px;
          transform: scaleX(0); transition: transform 0.2s ease;
        }
        .sv-tab.sv-tab-on::after { transform: scaleX(1); }
        .sv-tab.sv-tab-on .sv-tab-label { color: #C9A84C; font-weight: 700; }

        .sv-tab-icon-ring {
          width: 50px; height: 50px; border-radius: 50%;
          border: 2px solid rgba(0,0,0,0.1);
          background: #f9f6f0;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.2s ease; overflow: hidden;
        }
        .sv-tab-icon-img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .sv-tab.sv-tab-on .sv-tab-icon-ring { border-color: #C9A84C; box-shadow: 0 0 0 3px rgba(201,168,76,0.18); }
        .sv-tab:hover .sv-tab-icon-ring { border-color: rgba(201,168,76,0.4); }
        .sv-tab-label { font-size: 11px; color: #555; font-weight: 500; transition: color 0.2s; }

        /* ── Group Chips ─────────────────────────────────────────── */
        .sv-chips-row {
          display: flex; gap: 8px; overflow-x: auto;
          scrollbar-width: none; padding: 14px 32px;
          max-width: 1200px; margin: 0 auto;
        }
        .sv-chips-row::-webkit-scrollbar { display: none; }
        .sv-chip {
          border: 1.5px solid rgba(0,0,0,0.13); background: #fff;
          color: #555; font-size: 12px; font-weight: 500;
          padding: 6px 18px; border-radius: 100px;
          cursor: pointer; white-space: nowrap; flex-shrink: 0;
          transition: all 0.2s ease;
        }
        .sv-chip:hover { border-color: rgba(201,168,76,0.45); color: #C9A84C; }
        .sv-chip.sv-chip-on {
          background: #080808; color: #fff;
          border-color: #080808; font-weight: 600;
        }

        /* ── Category Info Bar ───────────────────────────────────── */
        .sv-cat-bar {
          display: flex; align-items: center; justify-content: space-between;
          padding: 20px 0 18px;
          border-bottom: 1px solid rgba(0,0,0,0.07);
          margin-bottom: 20px;
        }
        .sv-cat-bar-name {
          font-family: 'Cormorant Garamond', serif;
          font-size: 22px; font-weight: 500; color: #080808; margin-bottom: 2px;
        }
        .sv-cat-bar-desc { font-size: 12.5px; color: #888; }
        .sv-cat-count {
          background: rgba(201,168,76,0.1); border: 1px solid rgba(201,168,76,0.25);
          color: #9a7520; font-size: 11px; font-weight: 700;
          padding: 5px 14px; border-radius: 100px; letter-spacing: 0.04em; flex-shrink: 0;
        }

        /* ── Cards Grid ──────────────────────────────────────────── */
        .sv-cards-body { max-width: 1200px; margin: 0 auto; padding: 0 32px 40px; }
        .sv-cards-grid {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;
        }
        .sv-section-heading {
          grid-column: 1 / -1;
          display: flex; align-items: center; gap: 14px;
          margin: 12px 0 2px;
        }
        .sv-section-line { flex: 1; height: 1px; background: linear-gradient(90deg, transparent, rgba(201,168,76,0.35)); }
        .sv-section-line:last-child { background: linear-gradient(90deg, rgba(201,168,76,0.35), transparent); }
        .sv-section-label {
          font-family: 'Cormorant Garamond', serif; font-size: 20px; font-weight: 600;
          color: #8a6a1a; white-space: nowrap; letter-spacing: 0.01em;
        }

        /* ── Service Card ────────────────────────────────────────── */
        .sv-sc {
          background: #fff; border-radius: 16px; overflow: hidden;
          border: 1px solid rgba(0,0,0,0.07);
          box-shadow: 0 2px 12px rgba(0,0,0,0.05);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          display: flex; flex-direction: column;
        }
        .sv-sc:hover {
          transform: translateY(-5px);
          box-shadow: 0 16px 40px rgba(0,0,0,0.12);
        }

        /* Image */
        .sv-sc-media-link { display: block; }
        .sv-sc-img {
          position: relative; height: 185px;
          display: flex; align-items: center; justify-content: center;
          overflow: hidden; flex-shrink: 0;
        }
        .sv-sc-img-photo {
          position: absolute; inset: 0; width: 100%; height: 100%;
          object-fit: cover; object-position: center;
        }
        .sv-sc-img.sv-sc-img-product { background: #FFFDF8; }
        .sv-sc-img.sv-sc-img-product .sv-sc-img-photo { object-fit: contain; padding: 14px; box-sizing: border-box; }
        .sv-sc-slider {
          position: absolute; inset: 0; display: flex; width: 100%; height: 100%;
          transition: transform 0.65s cubic-bezier(0.4,0,0.2,1);
        }
        .sv-sc-slider .sv-sc-img-photo {
          position: static; flex: 0 0 100%; width: 100%; height: 100%;
        }
        .sv-sc-dots {
          position: absolute; bottom: 8px; left: 0; right: 0; z-index: 2;
          display: flex; justify-content: center; gap: 5px;
        }
        .sv-sc-dot { width: 5px; height: 5px; border-radius: 50%; background: rgba(255,255,255,0.55); transition: all 0.25s ease; }
        .sv-sc-dot.on { background: #C9A84C; width: 14px; border-radius: 4px; }
        .sv-sc-name-link { text-decoration: none; }
        .sv-sc-name-link:hover .sv-sc-name { color: #8a6a1a; }

        /* Badges over image */
        .sv-sc-badges { position: absolute; top: 10px; right: 10px; z-index: 2; display: flex; flex-direction: column; align-items: flex-end; gap: 5px; }
        .sv-sc-pop {
          background: #C9A84C; color: #080808;
          font-size: 8px; font-weight: 800; letter-spacing: 0.12em;
          text-transform: uppercase; padding: 3px 10px; border-radius: 100px;
        }
        .sv-sc-trend {
          background: rgba(8,8,8,0.7); backdrop-filter: blur(6px);
          color: #C9A84C; border: 1px solid rgba(201,168,76,0.5);
          font-size: 8px; font-weight: 800; letter-spacing: 0.12em;
          text-transform: uppercase; padding: 3px 10px; border-radius: 100px;
        }
        .sv-sc-group {
          position: absolute; top: 10px; left: 10px; z-index: 2;
          background: rgba(8,8,8,0.6); backdrop-filter: blur(6px);
          color: rgba(255,255,255,0.9);
          font-size: 9px; font-weight: 600; letter-spacing: 0.06em;
          padding: 3px 10px; border-radius: 100px;
          max-width: 60%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .sv-sc-dur {
          position: absolute; bottom: 10px; left: 12px; z-index: 2;
          background: rgba(8,8,8,0.65); backdrop-filter: blur(4px);
          color: #fff; font-size: 10.5px; font-weight: 500;
          padding: 4px 11px; border-radius: 100px;
          display: flex; align-items: center; gap: 5px;
        }

        /* Card body */
        .sv-sc-body {
          padding: 16px 18px 18px;
          display: flex; flex-direction: column; gap: 8px; flex: 1;
        }
        .sv-sc-name {
          font-size: 14.5px; font-weight: 700; color: #111; line-height: 1.3;
        }
        .sv-sc-subtitle {
          font-size: 12px; color: #666; line-height: 1.5;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .sv-sc-desc {
          font-size: 11.5px; color: #999; line-height: 1.55;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .sv-sc-price-row {
          display: flex; align-items: baseline; gap: 6px; margin-top: 2px;
        }
        .sv-sc-price { font-size: 18px; font-weight: 800; color: #C9A84C; }
        .sv-sc-gst { font-size: 10px; color: #bbb; }

        .sv-sc-btn { margin-top: auto; padding-top: 4px; }
        .sv-sc-btn button {
          width: 100%; padding: 10px 0;
          display: flex; align-items: center; justify-content: center; gap: 6px;
          background: linear-gradient(135deg, #E8C96D, #C9A84C);
          color: #080808; border: none; border-radius: 8px;
          font-size: 11.5px; font-weight: 700; letter-spacing: 0.1em;
          text-transform: uppercase; cursor: pointer;
          transition: all 0.25s ease;
        }
        .sv-sc-btn button:hover {
          background: linear-gradient(135deg, #d4a830, #9E7A2E);
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(201,168,76,0.4);
        }
        .sv-sc-btn button.sv-sc-added {
          background: rgba(45,143,94,0.12); color: #2d8f5e; cursor: default;
        }
        .sv-sc-btn button.sv-sc-added:hover { transform: none; box-shadow: none; background: rgba(45,143,94,0.12); }
        .sv-sc-btn button.call-btn { background: #f0f0f0; color: #333; }

        .sv-see-more-row { display: flex; justify-content: center; margin-top: 28px; }
        .sv-see-more-btn {
          padding: 12px 28px; border-radius: 30px;
          border: 1.5px solid rgba(201,168,76,0.4);
          background: transparent; color: #8a6a1a;
          font-size: 12px; font-weight: 700; letter-spacing: 0.08em;
          text-transform: uppercase; cursor: pointer;
          font-family: 'Inter', sans-serif; transition: all 0.25s ease;
        }
        .sv-see-more-btn:hover {
          background: rgba(201,168,76,0.08); border-color: #C9A84C;
          transform: translateY(-1px);
        }
        .sv-sc-btn button.call-btn:hover { background: #e5e5e5; box-shadow: none; }

        /* ── Responsive ──────────────────────────────────────────── */
        @media (max-width: 1024px) {
          .sv-cards-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 700px) {
          .sv-section { padding: 72px 0 100px; }
          .sv-container { padding: 0 16px; }
          .sv-cards-body { padding: 0 16px 32px; }
          .sv-chips-row { padding: 12px 16px; }
          .sv-cards-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; }
          .sv-sc-img { height: 150px; }
          .sv-tab { min-width: 68px; padding: 12px 12px 10px; }
          .sv-tab-icon-ring { width: 44px; height: 44px; }
          .sv-sc-body { padding: 12px 13px 14px; gap: 6px; }
          .sv-sc-name { font-size: 13px; }
          .sv-sc-desc { font-size: 11px; }
          .sv-sc-price { font-size: 16px; }
          .sv-gen-btn { padding: 9px 22px; font-size: 13px; }
          .sv-gender-outer { padding-bottom: 20px; }
        }
        @media (max-width: 400px) {
          .sv-cards-grid { grid-template-columns: 1fr; }
          .sv-sc-img { height: 180px; }
        }
      `}</style>

      <section id="services" className="sv-section" ref={sectionRef}>

        {/* Header */}
        <div className="sv-container">
          <div className="sv-header">
            <div className="reveal sv-eyebrow">
              <span style={{ width: "20px", height: "1px", background: "#C9A84C", display: "inline-block" }} />
              Home Services
            </div>
            <h2 className="reveal sv-title">{title ?? "Our Premium Services"}</h2>
            <div className="sv-divider" />
            <p className="reveal sv-subtitle">
              {subtitle ?? "All services at your doorstep — browse by category, pick your treatment, book in seconds"}
            </p>
          </div>
        </div>

        {/* ── Gender Toggle ── */}
        <div className="sv-gender-outer">
          <div className="sv-gender-pill">
            <button
              className={`sv-gen-btn ${gender === "female" ? "sv-gen-on" : ""}`}
              onClick={() => setGender("female")}
            >
              <span className="sv-gen-symbol">♀</span> Female
            </button>
            <button
              className={`sv-gen-btn ${gender === "male" ? "sv-gen-on" : ""}`}
              onClick={() => setGender("male")}
            >
              <span className="sv-gen-symbol">♂</span> Male
            </button>
          </div>
        </div>

        {/* ── Search ── */}
        <div className="sv-search-outer">
          <div className="sv-search-box">
            <Search size={15} className="sv-search-icon" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search services — e.g. Hydra, Hair, Wax, Facial…"
              className="sv-search-input"
            />
            {search && (
              <button className="sv-search-clear" onClick={() => setSearch("")} aria-label="Clear search">
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* ── Category Tabs ── */}
        <div className="sv-tabs-bar" style={isSearching ? { opacity: 0.4, pointerEvents: "none" } : undefined}>
          <div className="sv-tabs-scroll">
            {displayCats.map(cat => {
              const isOn = selectedId === cat.id;
              const thumb = gender === "male" && cat.imgsMale?.[0] ? cat.imgsMale[0] : cat.imgs[0];
              return (
                <button
                  key={cat.id}
                  className={`sv-tab ${isOn ? "sv-tab-on" : ""}`}
                  onClick={() => setSelectedId(cat.id)}
                >
                  <div className="sv-tab-icon-ring">
                    <img src={thumb} alt={cat.label} className="sv-tab-icon-img" loading="lazy" />
                  </div>
                  <span className="sv-tab-label">{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Group Filter Chips ── */}
        {!isSearching && groups.length > 0 && (
          <div className="sv-chips-row">
            <button
              className={`sv-chip ${selectedGroup === null ? "sv-chip-on" : ""}`}
              onClick={() => setSelectedGroup(null)}
            >
              All ({selectedCat.services.length})
            </button>
            {groups.map(g => (
              <button
                key={g}
                className={`sv-chip ${selectedGroup === g ? "sv-chip-on" : ""}`}
                onClick={() => setSelectedGroup(selectedGroup === g ? null : g)}
              >{g}</button>
            ))}
          </div>
        )}

        {/* ── Cards ── */}
        {!isSearching && (
        <div className="sv-cards-body">
          <div className="sv-cat-bar">
            <div>
              <div className="sv-cat-bar-name">{selectedCat.label}</div>
              <div className="sv-cat-bar-desc">{selectedCat.desc}</div>
            </div>
            <div className="sv-cat-count">
              {visibleServices.length} service{visibleServices.length !== 1 ? "s" : ""}
            </div>
          </div>

          <div className="sv-cards-grid">
            {(() => {
              const cardsToShow = showAll ? visibleServices : visibleServices.slice(0, VISIBLE_COUNT);
              return cardsToShow.map((service, i) => {
              const [c1, c2] = CAT_GRADIENTS[selectedCat.id] ?? ["#f5f5f5", "#e5e5e5"];
              const thumbPool = gender === "male" && selectedCat.imgsMale?.length ? selectedCat.imgsMale : selectedCat.imgs;
              const thumb = service.gallery?.[0] ?? thumbPool[i % thumbPool.length];
              const detailHref = `/services/${selectedCat.id}/${slugifyService(service.name)}?gender=${gender}`;
              const itemKey = cartItemKey(selectedCat.id, service.name, service.group);
              const isAdded = justAddedKey === itemKey;
              const isAdding = addingKey === itemKey;
              // Divider heading above each cluster: the umbrella `section` when
              // present (e.g. "Japanese Rituals"), plus — in wax only (see
              // useGroupHeadings) — the brand `group` ("Honey Wax" / "White
              // Chocolate Wax" / "Rica Wax").
              const headingFor = (s: ServiceItem) => s.section ?? (useGroupHeadings ? s.group : undefined);
              const heading = headingFor(service);
              const prevHeading = i > 0 ? headingFor(cardsToShow[i - 1]) : undefined;
              const showSectionHeading = !selectedGroup && !!heading && heading !== prevHeading;
              return (
                <Fragment key={`${service.group ?? ""}-${service.name}-${i}`}>
                {showSectionHeading && (
                  <div key={`section-${heading}`} className="sv-section-heading">
                    <span className="sv-section-line" />
                    <span className="sv-section-label">{heading}</span>
                    <span className="sv-section-line" />
                  </div>
                )}
                <div key={`${service.group ?? ""}-${service.name}-${i}`} className="sv-sc">
                  <Link href={detailHref} className="sv-sc-media-link">
                    <div
                      className={`sv-sc-img ${service.gallery?.length ? "sv-sc-img-product" : ""}`}
                      style={service.gallery?.length ? undefined : { background: `linear-gradient(135deg, ${c1}, ${c2})` }}
                    >
                      <ServiceCardImage images={service.gallery?.length ? service.gallery : [thumb]} alt={service.name} />
                      {(service.popular || service.trending) && (
                        <div className="sv-sc-badges">
                          {service.popular && <span className="sv-sc-pop">Popular</span>}
                          {service.trending && <span className="sv-sc-trend">Trending</span>}
                        </div>
                      )}
                      {service.group  && <span className="sv-sc-group">{service.group}</span>}
                      {service.duration && (
                        <div className="sv-sc-dur">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                          </svg>
                          {service.duration}
                        </div>
                      )}
                    </div>
                  </Link>
                  <div className="sv-sc-body">
                    <Link href={detailHref} className="sv-sc-name-link">
                      <div className="sv-sc-name">{service.group ? `${service.group} – ${service.name}` : service.name}</div>
                    </Link>
                    {getCardSubtitle(service, selectedCat.id) && (
                      <div className="sv-sc-subtitle">{getCardSubtitle(service, selectedCat.id)}</div>
                    )}
                    {getCardDesc(service) && (
                      <div className="sv-sc-desc">{getCardDesc(service)}</div>
                    )}
                    <div className="sv-sc-price-row">
                      {service.discountPercent ? (
                        <>
                          <span className="sv-sc-price">₹{Math.round(service.price * (1 - service.discountPercent / 100)).toLocaleString()}</span>
                          <span style={{ fontSize: 11, color: "#999", textDecoration: "line-through", marginLeft: 6 }}>₹{service.price.toLocaleString()}</span>
                        </>
                      ) : (
                        <span className="sv-sc-price">₹{service.price.toLocaleString()}</span>
                      )}
                      <span className="sv-sc-gst">Incl. GST</span>
                    </div>
                    <div className="sv-sc-btn">
                      <button
                        className={selectedCat.homeService ? (isAdded ? "sv-sc-added" : "") : "call-btn"}
                        onClick={() => handleAddToCart(service, selectedCat, thumb)}
                        disabled={isAdded || isAdding}
                      >
                        {selectedCat.homeService
                          ? (isAdding ? "Adding…" : isAdded ? <><Check size={13} /> Added to Cart</> : <><ShoppingBag size={13} /> Add to Cart</>)
                          : "📞 Call to Book"}
                      </button>
                    </div>
                    <div style={{ textAlign: "center", marginTop: 8 }}>
                      <InquiryButton
                        variant="text"
                        label="Ask about this"
                        service={`${service.group ? `${service.group} – ${service.name}` : service.name} — ${selectedCat.label}`}
                        gender={gender}
                      />
                    </div>
                  </div>
                </div>
                </Fragment>
              );
              });
            })()}
          </div>

          {visibleServices.length > VISIBLE_COUNT && (
            <div className="sv-see-more-row">
              <button className="sv-see-more-btn" onClick={() => setShowAll(v => !v)}>
                {showAll ? "Show Less" : `See More (${visibleServices.length - VISIBLE_COUNT})`}
              </button>
            </div>
          )}
        </div>
        )}

        {/* ── Search Results ── */}
        {isSearching && (
          <div className="sv-cards-body">
            <div className="sv-cat-bar">
              <div>
                <div className="sv-cat-bar-name">Search Results</div>
                <div className="sv-cat-bar-desc">Showing matches for &ldquo;{search.trim()}&rdquo;</div>
              </div>
              <div className="sv-cat-count">
                {searchResults.length} service{searchResults.length !== 1 ? "s" : ""}
              </div>
            </div>

            {searchResults.length === 0 ? (
              <div className="sv-search-empty">No services match &ldquo;{search.trim()}&rdquo;. Try a different keyword.</div>
            ) : (
              <div className="sv-cards-grid">
                {searchResults.map(({ service, cat }, i) => {
                  const [c1, c2] = CAT_GRADIENTS[cat.id] ?? ["#f5f5f5", "#e5e5e5"];
                  const thumbPool = gender === "male" && cat.imgsMale?.length ? cat.imgsMale : cat.imgs;
                  const thumb = service.gallery?.[0] ?? thumbPool[i % thumbPool.length];
                  const detailHref = `/services/${cat.id}/${slugifyService(service.name)}?gender=${gender}`;
                  const itemKey = cartItemKey(cat.id, service.name, service.group);
                  const isAdded = justAddedKey === itemKey;
                  const isAdding = addingKey === itemKey;
                  return (
                    <div key={`${cat.id}-${service.group ?? ""}-${service.name}-${i}`} className="sv-sc">
                      <Link href={detailHref} className="sv-sc-media-link">
                        <div
                          className={`sv-sc-img ${service.gallery?.length ? "sv-sc-img-product" : ""}`}
                          style={service.gallery?.length ? undefined : { background: `linear-gradient(135deg, ${c1}, ${c2})` }}
                        >
                          <ServiceCardImage images={service.gallery?.length ? service.gallery : [thumb]} alt={service.name} />
                          {(service.popular || service.trending) && (
                        <div className="sv-sc-badges">
                          {service.popular && <span className="sv-sc-pop">Popular</span>}
                          {service.trending && <span className="sv-sc-trend">Trending</span>}
                        </div>
                      )}
                          {service.group  && <span className="sv-sc-group">{service.group}</span>}
                          {service.duration && (
                            <div className="sv-sc-dur">
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                              </svg>
                              {service.duration}
                            </div>
                          )}
                        </div>
                      </Link>
                      <div className="sv-sc-body">
                        <Link href={detailHref} className="sv-sc-name-link">
                          <div className="sv-sc-name">{service.group ? `${service.group} – ${service.name}` : service.name}</div>
                        </Link>
                        <div className="sv-sc-subtitle">{cat.label}</div>
                        {getCardDesc(service) && (
                          <div className="sv-sc-desc">{getCardDesc(service)}</div>
                        )}
                        <div className="sv-sc-price-row">
                          {service.discountPercent ? (
                        <>
                          <span className="sv-sc-price">₹{Math.round(service.price * (1 - service.discountPercent / 100)).toLocaleString()}</span>
                          <span style={{ fontSize: 11, color: "#999", textDecoration: "line-through", marginLeft: 6 }}>₹{service.price.toLocaleString()}</span>
                        </>
                      ) : (
                        <span className="sv-sc-price">₹{service.price.toLocaleString()}</span>
                      )}
                          <span className="sv-sc-gst">Incl. GST</span>
                        </div>
                        <div className="sv-sc-btn">
                          <button
                            className={cat.homeService ? (isAdded ? "sv-sc-added" : "") : "call-btn"}
                            onClick={() => handleAddToCart(service, cat, thumb)}
                            disabled={isAdded || isAdding}
                          >
                            {cat.homeService
                              ? (isAdding ? "Adding…" : isAdded ? <><Check size={13} /> Added to Cart</> : <><ShoppingBag size={13} /> Add to Cart</>)
                              : "📞 Call to Book"}
                          </button>
                        </div>
                        <div style={{ textAlign: "center", marginTop: 8 }}>
                          <InquiryButton
                            variant="text"
                            label="Ask about this"
                            service={`${service.group ? `${service.group} – ${service.name}` : service.name} — ${cat.label}`}
                            gender={gender}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </section>
    </>
  );
}
