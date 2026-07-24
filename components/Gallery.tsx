"use client";
import Image from "next/image";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { getGalleryImages, DBGalleryImage } from "@/lib/homepageContent";

export const slides = [
  {
    src: "/images/salon-exterior.jpg",
    fallback: "/images/salon-front.jpg",
    label: "Bella & Guy",
    sub: "Wave City's Premier Unisex Salon",
  },
  {
    src: "/images/salon-entrance.jpg",
    fallback: "/images/salon-front.jpg",
    label: "Our Entrance",
    sub: "Walk in, walk out beautiful",
  },
  {
    src: "/images/interior-chairs.jpg",
    fallback: "/images/interior1.jpg",
    label: "Styling Area",
    sub: "Premium chairs & modern ambiance",
  },
  {
    src: "/images/wash-station.jpg",
    fallback: "/images/interior2.jpg",
    label: "Hair Wash Station",
    sub: "Fully equipped & hygienically maintained",
  },
  {
    src: "/images/manicure-station.jpg",
    fallback: "/images/reception.jpg",
    label: "Nail Studio",
    sub: "Manicure, Pedicure & nail art",
  },
  {
    src: "/images/team.jpg",
    fallback: "/images/team.jpg",
    label: "The Bella & Guy Team",
    sub: "15+ certified beauty professionals",
  },
];

type Slide = { src: string; fallback: string; label: string; sub: string; alt?: string };

const INTERVAL = 4200;
// Photos at least this much wider than tall get their own full-width slide —
// they fill the wide slider naturally with a normal photographic crop.
// Anything narrower (portrait / square photos) would need heavy cropping to
// fill the same wide box, so those get grouped 2-3 across instead, each in
// its own narrower panel closer to its natural shape.
const WIDE_RATIO = 1.35;

/** Groups slides into rows: wide photos go solo, narrower photos cluster up to 3 per row. */
function groupSlides(list: Slide[], ratios: Record<string, number>): Slide[][] {
  const groups: Slide[][] = [];
  let buffer: Slide[] = [];
  const flushBuffer = () => { if (buffer.length) { groups.push(buffer); buffer = []; } };
  for (const s of list) {
    const ratio = ratios[s.src] ?? WIDE_RATIO; // unknown yet → treat as wide until measured
    if (ratio >= WIDE_RATIO) {
      flushBuffer();
      groups.push([s]);
    } else {
      buffer.push(s);
      if (buffer.length === 3) flushBuffer();
    }
  }
  flushBuffer();
  return groups;
}

export default function Gallery() {
  const [current, setCurrent] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);
  const [animating, setAnimating] = useState(false);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  const [dbImages, setDbImages] = useState<DBGalleryImage[]>([]);
  useEffect(() => { getGalleryImages().then(setDbImages); }, []);

  // Admin-managed photos (from the "Homepage" tab) take over entirely once any
  // exist, same rule as the rest of the homepage manager content.
  const rawItems: Slide[] = dbImages.length > 0
    ? dbImages.map(g => ({ src: g.src, fallback: g.src, label: g.label ?? "", sub: g.sub ?? "", alt: g.alt_text ?? undefined }))
    : slides;
  const itemsKey = rawItems.map(i => i.src).join("|");
  // Stable reference across renders (changes only when the actual photo list
  // changes) — without this, groupSlides below would rerun on every render.
  const items = useMemo(() => rawItems, [itemsKey]);

  // Measure each photo's real aspect ratio once so wide vs. narrow photos can
  // be grouped correctly (see WIDE_RATIO above) instead of guessing.
  const [ratios, setRatios] = useState<Record<string, number>>({});
  useEffect(() => {
    let cancelled = false;
    items.forEach(it => {
      if (ratios[it.src] !== undefined) return;
      const img = new window.Image();
      img.onload = () => { if (!cancelled) setRatios(r => ({ ...r, [it.src]: img.naturalWidth / img.naturalHeight })); };
      img.onerror = () => { if (!cancelled) setRatios(r => ({ ...r, [it.src]: WIDE_RATIO })); };
      img.src = it.src;
    });
    return () => { cancelled = true; };
  }, [items, ratios]);

  // Only regroup once every photo's ratio is known — grouping mid-stream (as
  // ratios trickle in one at a time) would silently reshuffle which photos
  // share a slide while someone might be actively viewing one of them.
  const allMeasured = items.every(it => ratios[it.src] !== undefined);
  const groups = useMemo(
    () => allMeasured ? groupSlides(items, ratios) : items.map(it => [it]),
    [items, allMeasured, ratios]
  );

  // If regrouping does change the slide layout (e.g. once `allMeasured` flips
  // true), keep showing the same photo the visitor was on instead of jumping
  // to whatever now occupies that index.
  const prevGroupsRef = useRef(groups);
  useEffect(() => {
    if (prevGroupsRef.current !== groups) {
      const viewedSrc = prevGroupsRef.current[current]?.[0]?.src;
      const newIndex = viewedSrc ? groups.findIndex(g => g.some(s => s.src === viewedSrc)) : -1;
      prevGroupsRef.current = groups;
      if (newIndex !== -1 && newIndex !== current) {
        setCurrent(newIndex);
        setPrev(null);
      } else {
        setCurrent(c => Math.min(c, Math.max(groups.length - 1, 0)));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups]);

  const goTo = useCallback((idx: number) => {
    if (animating) return;
    setAnimating(true);
    setPrev(current);
    setCurrent(idx);
    setProgress(0);
    startTimeRef.current = Date.now();
    setTimeout(() => { setPrev(null); setAnimating(false); }, 700);
  }, [animating, current]);

  const next = useCallback(() => goTo((current + 1) % groups.length), [goTo, current, groups.length]);
  const prev_ = useCallback(() => goTo((current - 1 + groups.length) % groups.length), [goTo, current, groups.length]);

  // Auto-advance
  useEffect(() => {
    if (paused || groups.length < 2) return;
    timerRef.current = setTimeout(next, INTERVAL);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [current, paused, next, groups.length]);

  // Progress bar
  useEffect(() => {
    if (paused) return;
    setProgress(0);
    startTimeRef.current = Date.now();
    progressRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      setProgress(Math.min((elapsed / INTERVAL) * 100, 100));
    }, 100);
    return () => { if (progressRef.current) clearInterval(progressRef.current); };
  }, [current, paused]);

  const [imgSrcs, setImgSrcs] = useState<Record<string, string>>({});
  function handleImgError(slide: Slide) {
    setImgSrcs(m => ({ ...m, [slide.src]: slide.fallback }));
  }
  const srcFor = (slide: Slide) => imgSrcs[slide.src] ?? slide.src;

  return (
    <>
      <style>{`
        .gl-section {
          background: #080808;
          padding: 100px 0 0;
          overflow: hidden;
        }

        .gl-header {
          text-align: center;
          padding: 0 32px 52px;
        }

        /* Slider container */
        .gl-slider {
          position: relative;
          width: 100%;
          height: clamp(380px, 62vh, 680px);
          overflow: hidden;
          cursor: pointer;
        }

        /* Each slide */
        .gl-slide {
          position: absolute; inset: 0;
          transition: opacity 0.7s cubic-bezier(0.4,0,0.2,1);
        }
        .gl-slide.active  { opacity: 1; z-index: 2; }
        .gl-slide.leaving { opacity: 0; z-index: 1; }
        .gl-slide.hidden  { opacity: 0; z-index: 0; }

        /* Row of 1-3 photos side by side */
        .gl-slide-row { position: absolute; inset: 0; display: flex; }
        .gl-slide-cell { position: relative; flex: 1; min-width: 0; height: 100%; }
        .gl-slide-cell + .gl-slide-cell { border-left: 1px solid rgba(255,255,255,0.08); }

        /* Ken-Burns zoom on active slide */
        .gl-slide.active .gl-img {
          animation: glKenBurns 5s ease-in-out forwards;
        }
        @keyframes glKenBurns {
          from { transform: scale(1.06); }
          to   { transform: scale(1.0); }
        }

        .gl-img { object-fit: cover; }

        /* Gradient overlays */
        .gl-overlay-bottom {
          position: absolute; inset: 0; z-index: 3;
          background: linear-gradient(
            180deg,
            rgba(8,8,8,0.08) 0%,
            rgba(8,8,8,0.0) 40%,
            rgba(8,8,8,0.6) 75%,
            rgba(8,8,8,0.92) 100%
          );
        }
        .gl-overlay-left {
          position: absolute; inset: 0; z-index: 3;
          background: linear-gradient(90deg, rgba(8,8,8,0.5) 0%, transparent 50%);
        }

        /* Caption */
        .gl-caption {
          position: absolute; bottom: 0; left: 0; right: 0; z-index: 4;
          padding: 0 64px 52px;
          display: flex; align-items: flex-end; justify-content: space-between;
        }
        .gl-caption-text { max-width: 540px; }
        .gl-caption-label {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(28px, 4vw, 48px); font-weight: 400; color: #fff;
          line-height: 1.1; margin-bottom: 8px;
          transform: translateY(12px); opacity: 0;
          transition: transform 0.65s cubic-bezier(0.22,1,0.36,1) 0.1s, opacity 0.5s ease 0.1s;
        }
        .gl-slide.active .gl-caption-label { transform: translateY(0); opacity: 1; }
        .gl-caption-sub {
          font-size: 13px; color: rgba(255,255,255,0.5); font-weight: 400; letter-spacing: 0.04em;
          transform: translateY(10px); opacity: 0;
          transition: transform 0.6s cubic-bezier(0.22,1,0.36,1) 0.22s, opacity 0.5s ease 0.22s;
        }
        .gl-slide.active .gl-caption-sub { transform: translateY(0); opacity: 1; }

        /* Dot nav */
        .gl-dots {
          display: flex; gap: 8px; align-items: center;
          padding-bottom: 6px;
        }
        .gl-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: rgba(255,255,255,0.28); border: none; cursor: pointer; padding: 0;
          transition: all 0.3s ease;
        }
        .gl-dot.on { background: #C9A84C; transform: scale(1.4); }

        /* Progress bar */
        .gl-progress {
          position: absolute; bottom: 0; left: 0; height: 2px; z-index: 5;
          background: linear-gradient(90deg, #E8C96D, #C9A84C);
          transition: width 0.03s linear;
        }

        /* Arrow buttons */
        .gl-arrow {
          position: absolute; top: 50%; transform: translateY(-50%);
          z-index: 6; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.12);
          backdrop-filter: blur(10px); color: rgba(255,255,255,0.7);
          width: 48px; height: 48px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; font-size: 20px;
          transition: all 0.25s ease;
          opacity: 0; pointer-events: none;
        }
        .gl-slider:hover .gl-arrow { opacity: 1; pointer-events: auto; }
        .gl-arrow:hover { background: rgba(201,168,76,0.2); border-color: rgba(201,168,76,0.4); color: #fff; }
        .gl-arrow.gl-prev { left: 20px; }
        .gl-arrow.gl-next { right: 20px; }

        /* Counter badge */
        .gl-counter {
          position: absolute; top: 20px; right: 20px; z-index: 6;
          background: rgba(0,0,0,0.4); backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 100px; padding: 5px 14px;
          font-size: 11px; color: rgba(255,255,255,0.5); letter-spacing: 0.1em;
        }
        .gl-counter span { color: #C9A84C; font-weight: 600; }

        /* Thumbnail strip below */
        .gl-thumbs {
          display: flex; gap: 0; overflow: hidden;
          border-top: 1px solid rgba(201,168,76,0.1);
        }
        .gl-thumb {
          flex: 1; position: relative; height: 90px;
          cursor: pointer; overflow: hidden;
          transition: flex 0.4s cubic-bezier(0.22,1,0.36,1);
          opacity: 0.45;
          border-right: 1px solid rgba(0,0,0,0.4);
        }
        .gl-thumb:last-child { border-right: none; }
        .gl-thumb:hover { opacity: 0.7; }
        .gl-thumb.on { flex: 2; opacity: 1; }
        .gl-thumb-overlay {
          position: absolute; inset: 0; z-index: 2;
          background: rgba(0,0,0,0.25);
          transition: background 0.3s ease;
        }
        .gl-thumb.on .gl-thumb-overlay { background: rgba(0,0,0,0.0); }
        .gl-thumb-bar {
          position: absolute; bottom: 0; left: 0; right: 0; height: 2px; z-index: 3;
          background: #C9A84C; transform: scaleX(0); transform-origin: left;
          transition: transform 0.3s ease;
        }
        .gl-thumb.on .gl-thumb-bar { transform: scaleX(1); }

        @media (max-width: 768px) {
          .gl-caption { padding: 0 24px 36px; }
          .gl-thumbs { display: none; }
          .gl-arrow { width: 38px; height: 38px; font-size: 16px; }
          .gl-dots { padding-bottom: 4px; }
        }
        @media (max-width: 480px) {
          .gl-caption { padding: 0 14px 24px; flex-direction: column; align-items: flex-start; gap: 8px; }
          .gl-caption-sub { font-size: 11px; }
          .gl-arrow { display: none; }
        }
      `}</style>

      <section id="gallery" className="gl-section">

        <div className="gl-header">
          <span style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "10px", fontWeight: "600", letterSpacing: "0.22em", textTransform: "uppercase", color: "#C9A84C", marginBottom: "16px" }}>
            <span style={{ width: "20px", height: "1px", background: "#C9A84C", display: "inline-block" }} />
            Our Space
          </span>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(34px,5vw,54px)", fontWeight: "400", color: "#fff", lineHeight: "1.1" }}>
            Inside Bella & Guy
          </h2>
          <div style={{ width: "40px", height: "1px", background: "linear-gradient(90deg,transparent,#C9A84C,transparent)", margin: "16px auto 0" }} />
        </div>

        {/* Main slider */}
        <div
          className="gl-slider"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => { setPaused(false); startTimeRef.current = Date.now() - progress / 100 * INTERVAL; }}
        >
          {groups.map((group, i) => (
            <div
              key={`slide-${i}`}
              className={`gl-slide ${i === current ? "active" : i === prev ? "leaving" : "hidden"}`}
            >
              <div className="gl-slide-row">
                {group.map((slide, gi) => (
                  <div key={`${i}-${gi}`} className="gl-slide-cell">
                    <Image
                      src={srcFor(slide)}
                      alt={slide.alt || slide.label || "Bella & Guy Salon"}
                      fill
                      className="gl-img"
                      priority={i === 0 && gi === 0}
                      onError={() => handleImgError(slide)}
                    />
                  </div>
                ))}
              </div>
              <div className="gl-overlay-bottom" />
              <div className="gl-overlay-left" />
              <div className="gl-caption">
                <div className="gl-caption-text">
                  <div className="gl-caption-label">{group[0].label}</div>
                  <div className="gl-caption-sub">{group[0].sub}</div>
                </div>
                <div className="gl-dots">
                  {groups.map((_, d) => (
                    <button key={d} aria-label={`Go to slide ${d + 1}`} className={`gl-dot ${d === current ? "on" : ""}`} onClick={() => goTo(d)} />
                  ))}
                </div>
              </div>
            </div>
          ))}

          {/* Progress bar */}
          <div className="gl-progress" style={{ width: `${progress}%` }} />

          {/* Counter */}
          <div className="gl-counter"><span>{current + 1}</span> / {groups.length}</div>

          {/* Arrows */}
          <button className="gl-arrow gl-prev" aria-label="Previous photo" onClick={e => { e.stopPropagation(); prev_(); }}>‹</button>
          <button className="gl-arrow gl-next" aria-label="Next photo" onClick={e => { e.stopPropagation(); next(); }}>›</button>
        </div>

        {/* Thumbnail strip */}
        <div className="gl-thumbs">
          {groups.map((group, i) => (
            <div key={`thumb-${i}`} className={`gl-thumb ${i === current ? "on" : ""}`} onClick={() => goTo(i)}>
              <Image src={srcFor(group[0])} alt={group[0].alt || group[0].label || "Bella & Guy Salon"} fill style={{ objectFit: "cover" }} onError={() => handleImgError(group[0])} />
              <div className="gl-thumb-overlay" />
              <div className="gl-thumb-bar" />
            </div>
          ))}
        </div>

      </section>
    </>
  );
}
