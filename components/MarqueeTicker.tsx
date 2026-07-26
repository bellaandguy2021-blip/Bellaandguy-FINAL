"use client";

const serviceItems = [
  { icon: "✦", text: "Facials" },
  { icon: "❀", text: "Japanese Rituals" },
  { icon: "◈", text: "Cleanups" },
  { icon: "◉", text: "D-Tan" },
  { icon: "◌", text: "Bleach" },
  { icon: "〜", text: "Threading" },
  { icon: "◎", text: "Waxing" },
  { icon: "◇", text: "Manicure" },
  { icon: "◆", text: "Pedicure" },
  { icon: "✂", text: "Haircut & Style" },
  { icon: "✧", text: "Beard & Shave" },
  { icon: "◐", text: "Hair Color" },
  { icon: "◑", text: "Head Massage" },
];

const trustItems = [
  { icon: "★", text: "4.6 Google Rating" },
  { icon: "✓", text: "Verified Professionals" },
  { icon: "◎", text: "100% Original Products" },
  { icon: "★", text: "2,000+ Happy Clients" },
  { icon: "✓", text: "On-time Guarantee" },
  { icon: "◎", text: "Premium Products" },
  { icon: "★", text: "Home Service Available" },
  { icon: "✓", text: "No Hidden Charges" },
  { icon: "◎", text: "8+ Years Experience" },
  { icon: "★", text: "Wave City's #1 Salon" },
];

const SEP = <span style={{ color: "#C9A84C", opacity: 0.4, margin: "0 18px", fontSize: "8px" }}>◆</span>;

export default function MarqueeTicker() {
  // Repeat 4x so scroll feels seamless
  const servicesRow = [...serviceItems, ...serviceItems, ...serviceItems, ...serviceItems];
  const trustRow = [...trustItems, ...trustItems, ...trustItems, ...trustItems];

  return (
    <>
      <style>{`
        .ticker-wrap {
          background: #080808;
          border-top: 1px solid rgba(201,168,76,0.12);
          border-bottom: 1px solid rgba(201,168,76,0.12);
          overflow: hidden;
          position: relative;
          z-index: 10;
        }

        /* Fade edges */
        .ticker-wrap::before,
        .ticker-wrap::after {
          content: '';
          position: absolute; top: 0; bottom: 0; width: 120px; z-index: 2;
          pointer-events: none;
        }
        .ticker-wrap::before {
          left: 0;
          background: linear-gradient(90deg, #080808, transparent);
        }
        .ticker-wrap::after {
          right: 0;
          background: linear-gradient(-90deg, #080808, transparent);
        }

        /* Each row */
        .ticker-row {
          display: flex; align-items: center;
          padding: 13px 0;
          border-bottom: 1px solid rgba(255,255,255,0.04);
          overflow: hidden;
          white-space: nowrap;
        }
        .ticker-row:last-child { border-bottom: none; }

        .ticker-track {
          display: inline-flex; align-items: center;
          flex-shrink: 0; will-change: transform;
        }

        /* Animations */
        .ticker-track-left {
          animation: tickLeft 28s linear infinite;
        }
        .ticker-track-right {
          animation: tickRight 32s linear infinite;
        }

        @keyframes tickLeft {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        @keyframes tickRight {
          from { transform: translateX(-50%); }
          to   { transform: translateX(0); }
        }

        .ticker-wrap:hover .ticker-track { animation-play-state: paused; }

        /* Items */
        .ticker-item {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 0 4px;
          font-size: 11.5px; font-weight: 500;
          letter-spacing: 0.06em; text-transform: uppercase;
          white-space: nowrap;
        }
        .ticker-row-services .ticker-item { color: rgba(255,255,255,0.55); }
        .ticker-row-trust    .ticker-item { color: rgba(201,168,76,0.75); }

        .ticker-icon-svc  { color: #C9A84C; font-size: 10px; }
        .ticker-icon-trust { color: rgba(201,168,76,0.5); font-size: 9px; }

        .ticker-sep {
          display: inline-block;
          color: rgba(201,168,76,0.3);
          margin: 0 16px;
          font-size: 7px;
          vertical-align: middle;
        }
      `}</style>

      <div className="ticker-wrap">
        {/* Row 1 — Services, scrolls LEFT */}
        <div className="ticker-row ticker-row-services">
          <div className="ticker-track ticker-track-left">
            {servicesRow.map((item, i) => (
              <span key={i} className="ticker-item">
                <span className="ticker-icon-svc">{item.icon}</span>
                {item.text}
                <span className="ticker-sep">◆</span>
              </span>
            ))}
          </div>
        </div>

        {/* Row 2 — Trust signals, scrolls RIGHT */}
        <div className="ticker-row ticker-row-trust">
          <div className="ticker-track ticker-track-right">
            {trustRow.map((item, i) => (
              <span key={i} className="ticker-item">
                <span className="ticker-icon-trust">{item.icon}</span>
                {item.text}
                <span className="ticker-sep">◆</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
