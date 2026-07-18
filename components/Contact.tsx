"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { getPublicSettings } from "../lib/settings";

export default function Contact() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [siteSettings, setSiteSettings] = useState<Record<string, string>>({});

  useEffect(() => { getPublicSettings().then(setSiteSettings); }, []);

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from("contacts").insert([{ name, phone, message }]);
    setLoading(false);
    if (error) { alert(error.message); return; }
    setSent(true);
    setName(""); setPhone(""); setMessage("");
    setTimeout(() => setSent(false), 6000);
  }

  const salonPhone = siteSettings.salon_phone || "+91 96259 28495";
  const salonPhoneHref = `tel:${salonPhone.replace(/[^\d+]/g, "")}`;
  const waNumber = (siteSettings.owner_whatsapp || "919625928495").replace(/\D/g, "");
  const waMessage = siteSettings.whatsapp_message || "Hi! I'd like to book an appointment at Bella & Guy Salon.";
  const waHref = `https://wa.me/${waNumber}?text=${encodeURIComponent(waMessage)}`;
  const instagramUrl = siteSettings.instagram_url || "https://www.instagram.com/bellaandguy_";

  const contactDetails = [
    { label: "Address", value: siteSettings.salon_address || "Wave City, Ghaziabad, UP 201003" },
    { label: "Phone", value: salonPhone, href: salonPhoneHref },
    { label: "Hours", value: siteSettings.salon_hours || "Mon – Sun, 9:00 AM – 8:00 PM" },
    { label: "Service Area", value: "Wave City, Ghaziabad & surrounding areas" },
    { label: "WhatsApp", value: "Chat on WhatsApp", href: waHref },
  ];

  return (
    <>
      <style>{`
        .contact-section {
          background: #111111;
          padding: 120px 32px;
          position: relative;
        }

        .contact-section::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent 0%, rgba(201,168,76,0.2) 50%, transparent 100%);
        }

        .contact-detail-row {
          display: flex;
          flex-direction: column;
          padding: 20px 0;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          transition: all 0.2s ease;
        }

        .contact-detail-row:first-of-type { border-top: 1px solid rgba(255,255,255,0.05); }
        .contact-detail-row:hover { background: rgba(201,168,76,0.02); }

        .contact-label {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.25);
          margin-bottom: 6px;
        }

        .contact-value {
          font-size: 15px;
          color: rgba(255,255,255,0.75);
          font-weight: 400;
          text-decoration: none;
          transition: color 0.2s ease;
        }

        a.contact-value:hover { color: #C9A84C; }

        .contact-field-label {
          display: block;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.3);
          margin-bottom: 8px;
        }

        .contact-input {
          width: 100%;
          border: 1px solid rgba(255,255,255,0.08);
          padding: 13px 16px;
          border-radius: 3px;
          font-size: 14.5px;
          color: #FFFFFF;
          background: rgba(255,255,255,0.04);
          outline: none;
          font-family: 'Inter', sans-serif;
          transition: all 0.25s ease;
        }

        .contact-input:focus {
          border-color: rgba(201,168,76,0.4);
          background: rgba(201,168,76,0.04);
          box-shadow: 0 0 0 3px rgba(201,168,76,0.06);
        }

        .contact-input::placeholder { color: rgba(255,255,255,0.18); }

        .contact-send-btn {
          width: 100%;
          padding: 15px;
          background: linear-gradient(135deg, #E8C96D, #C9A84C);
          color: #080808;
          border: none;
          border-radius: 3px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          cursor: pointer;
          font-family: 'Inter', sans-serif;
          transition: all 0.3s ease;
          margin-top: 4px;
        }
        .contact-send-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 12px 32px rgba(201,168,76,0.3);
        }
        .contact-send-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        .whatsapp-cta {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          background: #25D366;
          color: #FFFFFF;
          padding: 14px 28px;
          border-radius: 3px;
          font-weight: 600;
          font-size: 14px;
          text-decoration: none;
          transition: all 0.3s ease;
          margin-top: 36px;
        }
        .whatsapp-cta:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 32px rgba(37,211,102,0.3);
        }

        .sent-banner {
          background: rgba(39,174,96,0.07);
          border: 1px solid rgba(39,174,96,0.2);
          border-radius: 3px;
          padding: 14px 18px;
          color: #27AE60;
          font-size: 13.5px;
          font-weight: 500;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        @media (max-width: 768px) {
          .contact-main-grid { grid-template-columns: 1fr !important; gap: 48px !important; }
          .contact-section { padding: 80px 20px; }
        }
        @media (max-width: 480px) {
          .contact-section { padding: 60px 16px; }
          .whatsapp-cta { width: 100%; justify-content: center; }
        }
      `}</style>

      <section id="contact" className="contact-section">
        <div style={{ maxWidth: "1260px", margin: "0 auto" }}>

          <div style={{ textAlign: "center", marginBottom: "72px" }}>
            <span style={{
              display: "block",
              fontSize: "10px", fontWeight: "600", letterSpacing: "0.22em",
              textTransform: "uppercase", color: "#C9A84C", marginBottom: "16px"
            }}>Reach Us</span>
            <h2 style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "clamp(36px, 5vw, 56px)", fontWeight: "400",
              color: "#FFFFFF", marginBottom: "12px"
            }}>
              Get In Touch
            </h2>
            <div style={{ width: "40px", height: "1px", background: "linear-gradient(90deg, transparent, #C9A84C, transparent)", margin: "0 auto" }} />
          </div>

          <div className="contact-main-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "80px" }}>

            {/* Left */}
            <div>
              <h3 style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "24px", fontWeight: "500",
                color: "#FFFFFF", marginBottom: "12px"
              }}>
                Call, WhatsApp or Visit
              </h3>
              <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.35)", marginBottom: "28px", lineHeight: "1.6" }}>
                For salon visits, please call or WhatsApp us to schedule — no online booking required for walk-ins.
              </p>

              <div>
                {contactDetails.map((d, i) => (
                  <div key={i} className="contact-detail-row">
                    <span className="contact-label">{d.label}</span>
                    {d.href
                      ? <a href={d.href} className="contact-value">{d.value}</a>
                      : <span className="contact-value">{d.value}</span>
                    }
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                <a href={waHref} target="_blank" className="whatsapp-cta">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  Chat on WhatsApp
                </a>
                <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="whatsapp-cta" style={{ background: "linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)", color: "#fff" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                  </svg>
                  Follow on Instagram
                </a>
              </div>
            </div>

            {/* Right: form */}
            <div>
              <h3 style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "24px", fontWeight: "500",
                color: "#FFFFFF", marginBottom: "32px"
              }}>
                Send a Message
              </h3>

              {sent && (
                <div className="sent-banner">
                  <span>✓</span> Message received! We'll get back to you shortly.
                </div>
              )}

              <form onSubmit={submitForm} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <label className="contact-field-label">Your Name</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                    placeholder="Full name" className="contact-input" required />
                </div>
                <div>
                  <label className="contact-field-label">Phone Number</label>
                  <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 XXXXXXXXXX" className="contact-input" required />
                </div>
                <div>
                  <label className="contact-field-label">Message</label>
                  <textarea value={message} onChange={(e) => setMessage(e.target.value)}
                    placeholder="Your enquiry or message..."
                    className="contact-input" required
                    style={{ height: "120px", resize: "none" }} />
                </div>
                <button type="submit" className="contact-send-btn" disabled={loading}>
                  {loading ? "Sending..." : "Send Message →"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}