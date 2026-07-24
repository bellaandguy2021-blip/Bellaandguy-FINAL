"use client";
import { useState } from "react";
import { X, Check, Phone, MessageCircle, User, Mail, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { allCategories } from "@/lib/servicesData";
import type { InquiryPrefill } from "./InquiryProvider";

interface InquiryModalProps {
  prefill: InquiryPrefill;
  onClose: () => void;
}

const SERVICE_OPTIONS = allCategories.flatMap(cat =>
  cat.services.map(s => `${s.group ? `${s.group} – ${s.name}` : s.name} — ${cat.label}`)
);

const BUDGET_OPTIONS = ["Less than ₹40 Lakhs", "₹40 – 60 Lakhs", "More than ₹80 Lakhs"];

const DUPLICATE_GUARD_KEY = "bg_last_inquiry_at";
const DUPLICATE_GUARD_MS = 2 * 60 * 1000; // 2 minutes

export default function InquiryModal({ prefill, onClose }: InquiryModalProps) {
  const isFranchise = prefill.type === "franchise";
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [gender, setGender] = useState<"female" | "male" | "">(prefill.gender ?? "");
  const [service, setService] = useState(prefill.service ?? "");
  const [budget, setBudget] = useState("");
  const [contactMethod, setContactMethod] = useState<"Phone Call" | "WhatsApp">("WhatsApp");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!fullName.trim()) { setError("Please enter your full name."); return; }
    const cleaned = phone.replace(/\D/g, "").replace(/^91/, "");
    if (!/^[6-9]\d{9}$/.test(cleaned)) { setError("Please enter a valid 10-digit Indian mobile number."); return; }
    if (isFranchise && !email.trim()) { setError("Please enter your email address."); return; }
    if (isFranchise && !budget) { setError("Please select your investment budget."); return; }

    const lastAt = Number(sessionStorage.getItem(DUPLICATE_GUARD_KEY) ?? 0);
    if (Date.now() - lastAt < DUPLICATE_GUARD_MS) {
      setError("You've already sent an inquiry just now. Our team will reach out shortly — no need to submit again.");
      return;
    }

    setLoading(true);
    try {
      const since = new Date(Date.now() - DUPLICATE_GUARD_MS).toISOString();
      const { count } = await supabase
        .from("inquiries")
        .select("id", { count: "exact", head: true })
        .eq("phone", cleaned)
        .gte("created_at", since);
      if ((count ?? 0) > 0) {
        setError("You've already sent an inquiry recently. Our team will reach out shortly.");
        setLoading(false);
        return;
      }

      const { error: insertError } = await supabase.from("inquiries").insert([{
        full_name: fullName.trim(),
        phone: cleaned,
        email: email.trim() || null,
        gender: isFranchise ? null : (gender || null),
        service: isFranchise ? null : (service || null),
        budget: isFranchise ? budget : null,
        inquiry_type: isFranchise ? "franchise" : "service",
        preferred_contact: contactMethod,
        message: isFranchise ? null : (message.trim() || null),
        status: "New",
      }]);
      if (insertError) throw insertError;

      sessionStorage.setItem(DUPLICATE_GUARD_KEY, String(Date.now()));
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{`
        .iq-overlay {
          position: fixed; inset: 0; z-index: 9999;
          background: rgba(4,4,8,0.78); backdrop-filter: blur(12px);
          display: flex; align-items: center; justify-content: center; padding: 20px;
          animation: iqFadeIn 0.25s ease;
        }
        @keyframes iqFadeIn { from{opacity:0} to{opacity:1} }
        .iq-modal {
          background: #FFFDF8; border-radius: 20px;
          border: 1px solid rgba(201,168,76,0.2);
          box-shadow: 0 40px 100px rgba(0,0,0,0.4);
          width: 100%; max-width: 480px; max-height: 90vh; overflow-y: auto;
          animation: iqSlideUp 0.35s cubic-bezier(0.22,1,0.36,1);
        }
        @keyframes iqSlideUp { from{opacity:0;transform:translateY(30px)} to{opacity:1;transform:translateY(0)} }

        .iq-head {
          background: linear-gradient(135deg, #080808, #1a1200);
          padding: 26px 28px 20px; position: relative;
        }
        .iq-close {
          position: absolute; top: 14px; right: 14px; width: 30px; height: 30px;
          border-radius: 50%; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12);
          display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,0.5); cursor: pointer;
        }
        .iq-eyebrow { font-size: 10px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: #C9A84C; margin-bottom: 8px; }
        .iq-title { font-family: 'Cormorant Garamond', serif; font-size: 24px; font-weight: 500; color: #fff; margin: 0; }
        .iq-sub { font-size: 12px; color: rgba(255,255,255,0.45); margin-top: 6px; }

        .iq-body { padding: 22px 28px 28px; }
        .iq-field { margin-bottom: 14px; }
        .iq-label { display: block; font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(0,0,0,0.35); margin-bottom: 6px; }
        .iq-input, .iq-select, .iq-textarea {
          width: 100%; border: 1.5px solid rgba(0,0,0,0.1); padding: 12px 14px;
          border-radius: 10px; font-size: 14px; color: #080808;
          background: #FAFAF8; outline: none; transition: all 0.22s;
          font-family: 'Inter', sans-serif;
        }
        .iq-input:focus, .iq-select:focus, .iq-textarea:focus { border-color: #C9A84C; background: rgba(201,168,76,0.03); box-shadow: 0 0 0 3px rgba(201,168,76,0.08); }
        .iq-textarea { height: 76px; resize: none; }
        .iq-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .iq-pill-row { display: flex; gap: 8px; }
        .iq-pill-row-stack { flex-direction: column; }
        .iq-pill {
          flex: 1; text-align: center; padding: 10px; border-radius: 10px;
          border: 1.5px solid rgba(0,0,0,0.1); background: #FAFAF8; cursor: pointer;
          font-size: 12.5px; font-weight: 600; color: #555; transition: all 0.2s;
          display: flex; align-items: center; justify-content: center; gap: 6px;
        }
        .iq-pill.on { border-color: #C9A84C; background: rgba(201,168,76,0.08); color: #8a6a1a; }
        .iq-hint { display: flex; align-items: center; font-size: 11px; color: #8a6a1a; margin-top: 7px; transition: color 0.2s ease; }
        .iq-hint.warn { color: #d64545; font-weight: 600; }

        .iq-error { background: rgba(245,101,101,0.08); border: 1px solid rgba(245,101,101,0.25); border-radius: 10px; padding: 10px 14px; font-size: 12.5px; color: #e53e3e; margin-bottom: 14px; }

        .iq-submit {
          width: 100%; padding: 15px; margin-top: 6px;
          background: linear-gradient(135deg, #E8C96D, #C9A84C);
          color: #080808; border: none; border-radius: 12px;
          font-size: 13px; font-weight: 700; letter-spacing: 0.08em;
          text-transform: uppercase; cursor: pointer; font-family: 'Inter', sans-serif;
          transition: all 0.3s;
        }
        .iq-submit:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(201,168,76,0.35); }
        .iq-submit:disabled { opacity: 0.6; cursor: not-allowed; }

        /* Confirmation screen */
        .iq-confirm { padding: 40px 28px 32px; text-align: center; }
        .iq-confirm-check {
          width: 64px; height: 64px; border-radius: 50%; margin: 0 auto 18px;
          background: rgba(45,143,94,0.1); border: 2px solid rgba(45,143,94,0.3);
          display: flex; align-items: center; justify-content: center; color: #2d8f5e;
        }
        .iq-confirm-title { font-family: 'Cormorant Garamond', serif; font-size: 26px; color: #080808; margin-bottom: 8px; }
        .iq-confirm-text { font-size: 13.5px; color: #666; line-height: 1.6; margin-bottom: 26px; }
        .iq-confirm-btns { display: flex; flex-direction: column; gap: 10px; }
        .iq-cbtn {
          display: flex; align-items: center; justify-content: center; gap: 8px;
          padding: 13px; border-radius: 10px; font-size: 12.5px; font-weight: 700;
          text-decoration: none; cursor: pointer; font-family: 'Inter', sans-serif;
          letter-spacing: 0.04em; border: none;
        }
        .iq-cbtn-primary { background: linear-gradient(135deg, #E8C96D, #C9A84C); color: #080808; }
        .iq-cbtn-wa { background: linear-gradient(135deg,#25d366,#128c7e); color: #fff; }
        .iq-cbtn-ghost { background: transparent; border: 1.5px solid rgba(0,0,0,0.12); color: rgba(0,0,0,0.5); }
      `}</style>

      <div className="iq-overlay" onClick={onClose}>
        <div className="iq-modal" onClick={e => e.stopPropagation()}>
          {!submitted ? (
            <>
              <div className="iq-head">
                <button className="iq-close" onClick={onClose}><X size={14} /></button>
                <div className="iq-eyebrow">Bella & Guy Salon</div>
                <h2 className="iq-title">{isFranchise ? "Franchise Enquiry" : "Make an Inquiry"}</h2>
                <p className="iq-sub">
                  {isFranchise
                    ? "Interested in opening a Bella & Guy franchise? Share your details and investment plans."
                    : "Have a question before booking? Tell us what you'd like to know."}
                </p>
              </div>

              <form className="iq-body" onSubmit={handleSubmit}>
                <div className="iq-2col">
                  <div className="iq-field">
                    <label className="iq-label"><User size={10} style={{ display: "inline", marginRight: 4 }} />Full Name *</label>
                    <input className="iq-input" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your name" />
                  </div>
                  <div className="iq-field">
                    <label className="iq-label"><Phone size={10} style={{ display: "inline", marginRight: 4 }} />Mobile *</label>
                    <input className="iq-input" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 XXXXXXXXXX" />
                  </div>
                </div>

                <div className="iq-field">
                  <label className="iq-label">
                    <Mail size={10} style={{ display: "inline", marginRight: 4 }} />Email {isFranchise ? "*" : <span style={{ textTransform: "none", fontWeight: 400, letterSpacing: 0, color: "rgba(0,0,0,0.3)" }}>(optional)</span>}
                  </label>
                  <input className="iq-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" />
                </div>

                {!isFranchise && (
                  <div className="iq-field">
                    <label className="iq-label">Gender</label>
                    <div className="iq-pill-row">
                      <div className={`iq-pill ${gender === "female" ? "on" : ""}`} onClick={() => setGender("female")}>♀ Female</div>
                      <div className={`iq-pill ${gender === "male" ? "on" : ""}`} onClick={() => setGender("male")}>♂ Male</div>
                    </div>
                  </div>
                )}

                {!isFranchise && (
                  <div className="iq-field">
                    <label className="iq-label"><Sparkles size={10} style={{ display: "inline", marginRight: 4 }} />Service you're asking about</label>
                    <select className="iq-select" value={service} onChange={e => setService(e.target.value)}>
                      <option value="">General inquiry (no specific service)</option>
                      {SERVICE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                )}

                <div className="iq-field">
                  <label className="iq-label">Preferred Contact Method</label>
                  <div className="iq-pill-row">
                    <div className={`iq-pill ${contactMethod === "Phone Call" ? "on" : ""}`} onClick={() => setContactMethod("Phone Call")}><Phone size={12} /> Phone Call</div>
                    <div className={`iq-pill ${contactMethod === "WhatsApp" ? "on" : ""}`} onClick={() => setContactMethod("WhatsApp")}><MessageCircle size={12} /> WhatsApp</div>
                  </div>
                  <p className={`iq-hint ${contactMethod === "Phone Call" ? "warn" : ""}`}>
                    <MessageCircle size={11} style={{ marginRight: 4, flexShrink: 0 }} />
                    {contactMethod === "Phone Call"
                      ? "Phone Call replies can take longer — switch to WhatsApp for the fastest response."
                      : "WhatsApp is recommended for the fastest response."}
                  </p>
                </div>

                {isFranchise ? (
                  <div className="iq-field">
                    <label className="iq-label">Your Investment Budget *</label>
                    <div className="iq-pill-row iq-pill-row-stack">
                      {BUDGET_OPTIONS.map(b => (
                        <div key={b} className={`iq-pill ${budget === b ? "on" : ""}`} onClick={() => setBudget(b)}>{b}</div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="iq-field">
                    <label className="iq-label">Your Question <span style={{ textTransform: "none", fontWeight: 400, letterSpacing: 0, color: "rgba(0,0,0,0.3)" }}>(optional)</span></label>
                    <textarea className="iq-textarea" value={message} onChange={e => setMessage(e.target.value)} placeholder="What would you like to know?" />
                  </div>
                )}

                {error && <div className="iq-error">⚠ {error}</div>}

                <button className="iq-submit" type="submit" disabled={loading}>
                  {loading ? "Sending..." : "Send Inquiry"}
                </button>
              </form>
            </>
          ) : (
            <div className="iq-confirm">
              <div className="iq-confirm-check"><Check size={28} /></div>
              <div className="iq-confirm-title">Thank You!</div>
              <p className="iq-confirm-text">
                Your inquiry has been received successfully.<br />
                Our team will contact you shortly via {contactMethod === "WhatsApp" ? "WhatsApp" : "phone call"}.
              </p>
              <div className="iq-confirm-btns">
                <a className="iq-cbtn iq-cbtn-primary" href="/book">Book a Service</a>
                <a className="iq-cbtn iq-cbtn-wa" href="https://wa.me/919999601212" target="_blank" rel="noopener noreferrer">
                  <MessageCircle size={14} /> WhatsApp Support
                </a>
                <button className="iq-cbtn iq-cbtn-ghost" onClick={onClose}>Back to Home</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
