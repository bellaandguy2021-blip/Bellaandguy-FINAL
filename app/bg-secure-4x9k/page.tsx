"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useRouter } from "next/navigation";
import { supabaseAdmin as supabase } from "../../lib/supabaseAdmin";
import { allCategories as staticCategories, Category } from "../../lib/servicesData";
import { getDynamicCategories, invalidateDynamicCategoriesCache, uploadServiceImage, mergeCategories, DBCategory, DBService } from "../../lib/dynamicServices";
import {
  getHomepageFeatures, getTestimonials, getGalleryImages, getFaqs, uploadSiteImage,
  DBFeature, DBTestimonial, DBGalleryImage, DBFaq,
} from "../../lib/homepageContent";
import { reviews as staticReviews } from "../../components/Reviews";
import { slides as staticGallerySlides } from "../../components/Gallery";
import { faqs as staticFaqs } from "../../components/Faq";

import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import {
  LayoutDashboard, CalendarDays, TrendingUp, Users, MessageSquare,
  Database, Activity, LogOut, Check, Trash2, CalendarClock,
  MessageCircle, Download, Shield, RefreshCw, Ban,
  Search, Trophy, BarChart2, DollarSign, AlertTriangle, CheckCircle,
  Info, X, FileText, AlertCircle, Star, Eye, Menu, Inbox, Phone as PhoneIcon,
  Settings as SettingsIcon, Building2, Mail, Save,
  Scissors, ImagePlus, Plus, Pencil, Layers, Loader2, Home, ChevronUp, ChevronDown, UserCheck, Tag as TagIcon, GripVertical,
  Lock, Unlock,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────
type Tab = "dashboard" | "bookings" | "revenue" | "staff" | "contacts" | "inquiries" | "customers" | "services" | "homepage" | "settings" | "backup" | "logs";
type ConfirmModal = { title: string; message: string; onConfirm: () => void; confirmLabel?: string; icon?: React.ReactNode; danger?: boolean } | null;
type FilterType = "all" | "today" | "week" | "month";
type TypeFilter = "all" | "salon" | "home";

type Booking = {
  id: number; full_name: string; phone: string; email?: string; service: string;
  booking_date: string; booking_time: string;
  address?: string; status: string; staff?: string;
  is_home_service?: boolean; created_at?: string;
};

async function sendEmailNotification(type: string, booking: Booking & { new_date?: string; new_time?: string }) {
  try {
    await fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, booking }),
    });
  } catch {}
}
type Contact = { id: number; name: string; phone: string; message: string; };
type StaffRow = { id: number; name: string; email?: string; role: string; active: boolean; };
type Inquiry = {
  id: number; full_name: string; phone: string; email?: string; gender?: string;
  service?: string; preferred_contact: string; message?: string; status: string; created_at?: string;
  inquiry_type?: string; budget?: string;
};

// ── Service price lookup ───────────────────────────────
// Keyed to match the exact strings the booking flow stores in `service`:
// "Name — Category", or "Group – Name — Category" for grouped services.
// Built from the combined static + admin-created catalog (see catalogCategories state below).
function buildServicePrices(cats: Category[]): Record<string, number> {
  const prices: Record<string, number> = {};
  cats.forEach(cat => {
    cat.services.forEach(s => {
      const price = s.discountPercent ? Math.round(s.price * (1 - s.discountPercent / 100)) : s.price;
      const key = s.group ? `${s.group} – ${s.name} — ${cat.label}` : `${s.name} — ${cat.label}`;
      prices[key] = price;
      prices[s.name] = price; // backwards compat
    });
  });
  return prices;
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string }> = {
  Pending:   { bg: "rgba(245,199,90,0.14)",  text: "#f5c75a", dot: "#f5c75a" },
  Confirmed: { bg: "rgba(90,180,245,0.14)",  text: "#5ab4f5", dot: "#5ab4f5" },
  Completed: { bg: "rgba(79,208,128,0.14)",  text: "#4fd080", dot: "#4fd080" },
  Cancelled: { bg: "rgba(245,101,101,0.14)", text: "#f56565", dot: "#f56565" },
};

const INQUIRY_STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string }> = {
  "New":                  { bg: "rgba(90,180,245,0.14)",  text: "#5ab4f5", dot: "#5ab4f5" },
  "Contacted":            { bg: "rgba(245,199,90,0.14)",  text: "#f5c75a", dot: "#f5c75a" },
  "Follow-up Required":   { bg: "rgba(232,140,80,0.14)",  text: "#e88c50", dot: "#e88c50" },
  "Converted to Booking": { bg: "rgba(79,208,128,0.14)",  text: "#4fd080", dot: "#4fd080" },
  "Closed":               { bg: "rgba(150,150,150,0.14)", text: "#999999", dot: "#999999" },
};
const INQUIRY_STATUSES = Object.keys(INQUIRY_STATUS_CONFIG);

const SETTING_GROUPS: { title: string; icon: any; keys: { key: string; label: string; placeholder: string; multiline?: boolean }[] }[] = [
  {
    title: "Business Information",
    icon: Building2,
    keys: [
      { key: "salon_name",    label: "Salon Name",    placeholder: "Bella & Guy Salon" },
      { key: "salon_tagline", label: "Tagline",        placeholder: "Premium Unisex Salon" },
      { key: "salon_phone",   label: "Phone Number",   placeholder: "+91 96259 28495" },
      { key: "salon_email",   label: "Email Address",  placeholder: "hello@bellaguysalon.com" },
      { key: "salon_address", label: "Salon Address",  placeholder: "Wave City, Ghaziabad, UP 201003", multiline: true },
      { key: "salon_hours",   label: "Working Hours",  placeholder: "Mon – Sun, 9:00 AM – 8:00 PM" },
    ],
  },
  {
    title: "Contact & Notifications",
    icon: Mail,
    keys: [
      { key: "owner_whatsapp",   label: "Owner WhatsApp Number", placeholder: "+91 96259 28495" },
      { key: "whatsapp_message", label: "Default WhatsApp Message", placeholder: "Hi! I'd like to book an appointment at Bella & Guy Salon.", multiline: true },
      { key: "admin_email",      label: "Admin Notification Email", placeholder: "admin@bellaguysalon.com" },
      { key: "review_link",      label: "Google Review Link", placeholder: "https://g.page/r/.../review" },
    ],
  },
  {
    title: "Advanced Settings",
    icon: SettingsIcon,
    keys: [
      { key: "instagram_url",      label: "Instagram Profile URL", placeholder: "https://www.instagram.com/bellaandguy_" },
      { key: "min_booking_value",  label: "Minimum Home Service Booking Value (₹)", placeholder: "1100" },
      { key: "max_bookings_per_slot", label: "Max Bookings Per Time Slot", placeholder: "3 (how many customers can book the same 30-min slot before it's shown as full)" },
    ],
  },
  {
    title: "Hero Section (Homepage Top Banner)",
    icon: Layers,
    keys: [
      { key: "hero_badge",           label: "Badge Text",              placeholder: "Wave City's Premium Home Beauty Service" },
      { key: "hero_heading_1",       label: "Heading — Line 1",        placeholder: "Premium" },
      { key: "hero_heading_2",       label: "Heading — Line 2",        placeholder: "Salon" },
      { key: "hero_heading_gold",    label: "Heading — Highlight Line", placeholder: "At Your Doorstep" },
      { key: "hero_tagline",         label: "Tagline",                 placeholder: "Professional beauty services, delivered to the comfort of your home.", multiline: true },
      { key: "hero_cta_label",       label: "Main Button Text",        placeholder: "Book Home Service →" },
      { key: "hero_cta_href",        label: "Main Button Link",        placeholder: "/book" },
      { key: "hero_secondary_label", label: "Second Button Text",      placeholder: "📞 Call Now" },
      { key: "hero_secondary_href",  label: "Second Button Link",      placeholder: "tel:+919625928495" },
      { key: "hero_bg_image",        label: "Background Image URL",    placeholder: "/images/salon-front.jpg" },
    ],
  },
  {
    title: "Hero Stats Bar",
    icon: Layers,
    keys: [
      { key: "stat1_value", label: "Stat 1 — Number",  placeholder: "5000" },
      { key: "stat1_suffix", label: "Stat 1 — Suffix", placeholder: "+" },
      { key: "stat1_label", label: "Stat 1 — Label",   placeholder: "Happy Clients" },
      { key: "stat2_value", label: "Stat 2 — Number",  placeholder: "50" },
      { key: "stat2_suffix", label: "Stat 2 — Suffix", placeholder: "+" },
      { key: "stat2_label", label: "Stat 2 — Label",   placeholder: "Services" },
      { key: "stat3_value", label: "Stat 3 — Number",  placeholder: "8" },
      { key: "stat3_suffix", label: "Stat 3 — Suffix", placeholder: "+" },
      { key: "stat3_label", label: "Stat 3 — Label",   placeholder: "Years Experience" },
      { key: "stat4_value", label: "Stat 4 — Number",  placeholder: "4.9" },
      { key: "stat4_suffix", label: "Stat 4 — Suffix", placeholder: "★" },
      { key: "stat4_label", label: "Stat 4 — Label",   placeholder: "Google Rating" },
    ],
  },
  {
    title: "Trust Bullets (shown under the Hero buttons)",
    icon: Layers,
    keys: [
      { key: "trust_1", label: "Bullet 1", placeholder: "Certified Professionals" },
      { key: "trust_2", label: "Bullet 2", placeholder: "100% Original Products" },
      { key: "trust_3", label: "Bullet 3", placeholder: "On-time Guarantee" },
      { key: "trust_4", label: "Bullet 4", placeholder: "No Hidden Charges" },
      { key: "trust_5", label: "Bullet 5", placeholder: "GST Included" },
      { key: "trust_6", label: "Bullet 6", placeholder: "Trusted Brands Only" },
      { key: "trust_7", label: "Bullet 7", placeholder: "No Convenience Charge" },
      { key: "trust_8", label: "Bullet 8", placeholder: "Free Consultation" },
    ],
  },
];

// ── CSS ────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
* { box-sizing: border-box; }
.adm { background: #07070f; min-height: 100vh; font-family: 'Inter', sans-serif; color: #d0d0d0; display: flex; }

/* SIDEBAR */
.sb { width: 224px; min-width: 224px; background: rgba(8,8,18,0.98); border-right: 1px solid rgba(201,168,76,0.1); display: flex; flex-direction: column; height: 100vh; position: sticky; top: 0; z-index: 100; }
.sb-logo { padding: 22px 18px 18px; border-bottom: 1px solid rgba(255,255,255,0.04); display: flex; align-items: center; gap: 11px; }
.sb-icon { width: 42px; height: 42px; border-radius: 50%; overflow: hidden; flex-shrink: 0; box-shadow: 0 4px 16px rgba(201,168,76,0.3); }
.sb-icon img { width: 100%; height: 100%; object-fit: cover; display: block; }
.sb-title { font-size: 14px; font-weight: 700; color: #fff; }
.sb-sub { font-size: 10px; color: #3a3a3a; margin-top: 2px; }
.sb-nav { flex: 1; padding: 14px 10px; display: flex; flex-direction: column; gap: 3px; overflow-y: auto; }
.nav-label { font-size: 9px; font-weight: 700; color: #2a2a2a; letter-spacing: 0.12em; text-transform: uppercase; padding: 10px 10px 6px; }
.ni { display: flex; align-items: center; gap: 9px; padding: 10px 12px; border-radius: 10px; border: none; width: 100%; cursor: pointer; font-size: 13px; font-family: 'Inter', sans-serif; text-align: left; transition: all 0.15s; color: #484848; background: transparent; }
.ni.on { background: rgba(201,168,76,0.1); color: #c9a84c; }
.ni:hover:not(.on) { background: rgba(255,255,255,0.04); color: #888; }
.ni-badge { margin-left: auto; background: rgba(201,168,76,0.12); color: #c9a84c; border-radius: 20px; padding: 2px 7px; font-size: 10px; font-weight: 600; }
.ni.on .ni-badge { background: #c9a84c; color: #0f0f12; }
.sb-foot { padding: 10px 10px 18px; display: flex; flex-direction: column; gap: 5px; border-top: 1px solid rgba(255,255,255,0.04); margin-top: auto; }
.sb-btn { width: 100%; padding: 9px 12px; border-radius: 9px; cursor: pointer; font-size: 12px; font-family: 'Inter', sans-serif; font-weight: 500; transition: all 0.15s; display: flex; align-items: center; gap: 8px; }
.sb-sec { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); color: #666; }
.sb-sec:hover { background: rgba(255,255,255,0.06); color: #bbb; }
.sb-red { background: rgba(245,101,101,0.06); border: 1px solid rgba(245,101,101,0.15); color: #f56565; }
.sb-red:hover { background: rgba(245,101,101,0.12); }

/* MAIN */
.mc { flex: 1; overflow-y: auto; min-width: 0; }
.topbar { display: flex; justify-content: space-between; align-items: center; padding: 18px 28px; border-bottom: 1px solid rgba(255,255,255,0.04); background: rgba(7,7,15,0.92); backdrop-filter: blur(12px); position: sticky; top: 0; z-index: 50; }
.tb-title { font-size: 20px; font-weight: 700; color: #fff; }
.tb-sub { font-size: 11px; color: #383838; margin-top: 2px; }
.live-pill { display: flex; align-items: center; gap: 6px; background: rgba(79,208,128,0.08); border: 1px solid rgba(79,208,128,0.18); border-radius: 20px; padding: 5px 12px; font-size: 11px; color: #4fd080; font-weight: 500; }
.live-dot { width: 7px; height: 7px; border-radius: 50%; background: #4fd080; animation: lp 1.6s ease-in-out infinite; }
@keyframes lp { 0%,100%{box-shadow:0 0 0 0 rgba(79,208,128,0.4);}50%{box-shadow:0 0 0 5px rgba(79,208,128,0);} }

/* PAGE */
.pb { padding: 24px 28px; }

/* TOAST */
.toast { position: fixed; top: 22px; right: 22px; z-index: 99999; display: flex; align-items: center; gap: 12px; background: linear-gradient(135deg,rgba(18,24,18,0.97),rgba(10,20,12,0.97)); border: 1.5px solid rgba(79,208,128,0.45); border-radius: 14px; padding: 14px 20px; font-size: 14px; font-weight: 600; color: #4fd080; box-shadow: 0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(79,208,128,0.1); animation: toastIn 0.4s cubic-bezier(0.22,1,0.36,1); max-width: 340px; }
.toast::before { content: "🔔"; font-size: 18px; }
@keyframes toastIn { from{opacity:0;transform:translateX(60px) scale(0.92);}to{opacity:1;transform:translateX(0) scale(1);} }

/* STATS GRID */
.sg { display: grid; grid-template-columns: repeat(auto-fill, minmax(136px,1fr)); gap: 10px; margin-bottom: 22px; }
.sc { background: rgba(14,14,22,0.95); border: 1px solid rgba(255,255,255,0.05); border-radius: 14px; padding: 15px; transition: all 0.2s; animation: sfi 0.5s ease both; }
.sc:hover { border-color: rgba(201,168,76,0.2); transform: translateY(-2px); }
@keyframes sfi { from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);} }
.sc-lbl { font-size: 9px; font-weight: 700; color: #363636; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 7px; }
.sc-val { font-size: 24px; font-weight: 700; line-height: 1; }
.sc-sub { font-size: 10px; color: #383838; margin-top: 5px; }

/* SECTION CARD */
.card { background: rgba(12,12,20,0.97); border: 1px solid rgba(255,255,255,0.05); border-radius: 16px; padding: 18px 20px; margin-bottom: 16px; }
.cm-box-anim { animation: cmBoxIn 0.25s cubic-bezier(0.22,1,0.36,1); border-color: rgba(201,168,76,0.15); }
@keyframes cmBoxIn { from { opacity: 0; transform: translateY(14px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
.card-title { font-size: 13px; font-weight: 600; color: #c9a84c; margin-bottom: 14px; display: flex; align-items: center; gap: 7px; }

/* TABLE */
.tw { background: rgba(12,12,20,0.97); border: 1px solid rgba(255,255,255,0.05); border-radius: 16px; overflow: auto; }
table { width: 100%; border-collapse: collapse; }
th { padding: 11px 14px; text-align: left; font-size: 9px; font-weight: 700; color: #363636; text-transform: uppercase; letter-spacing: 0.08em; background: rgba(7,7,15,0.8); border-bottom: 1px solid rgba(255,255,255,0.04); white-space: nowrap; }
tr { border-bottom: 1px solid rgba(255,255,255,0.03); transition: background 0.1s; }
tr:hover { background: rgba(255,255,255,0.02); }
tr:last-child { border-bottom: none; }
td { padding: 11px 14px; font-size: 12px; color: #bbb; vertical-align: middle; }
.nc { display: flex; align-items: center; gap: 9px; }
.av { width: 30px; height: 30px; border-radius: 9px; background: rgba(201,168,76,0.1); color: #c9a84c; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; flex-shrink: 0; }
.sw { position: relative; display: inline-flex; align-items: center; }
.sd { position: absolute; left: 8px; width: 6px; height: 6px; border-radius: 50%; pointer-events: none; }
.ss { appearance: none; border: none; outline: none; border-radius: 20px; padding: 5px 10px 5px 22px; font-size: 11px; font-weight: 600; font-family: 'Inter', sans-serif; cursor: pointer; }
.stf { background: rgba(255,255,255,0.04); color: #bbb; border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 5px 9px; font-size: 11px; font-family: 'Inter', sans-serif; outline: none; cursor: pointer; }
.empty td { padding: 44px; text-align: center; color: #2a2a2a; font-size: 13px; }
.aw { display: flex; flex-direction: column; gap: 4px; min-width: 160px; }
.aw-row { display: flex; gap: 4px; align-items: center; }
.btn { border-radius: 8px; padding: 5px 11px; cursor: pointer; font-size: 11px; font-weight: 500; font-family: 'Inter', sans-serif; border: 1px solid; transition: all 0.15s; white-space: nowrap; }
.btn:hover { opacity: 0.85; transform: translateY(-1px); }
.bv { background: rgba(90,180,245,0.1); color: #5ab4f5; border-color: rgba(90,180,245,0.2); }
.bc { background: rgba(79,208,128,0.1); color: #4fd080; border-color: rgba(79,208,128,0.2); }
.bx { background: rgba(245,101,101,0.1); color: #f56565; border-color: rgba(245,101,101,0.2); }
.bw { background: rgba(37,211,102,0.1); color: #25d366; border-color: rgba(37,211,102,0.2); }
.br { background: rgba(90,130,245,0.1); color: #7ba8ff; border-color: rgba(90,130,245,0.2); }
.bd { background: rgba(255,80,80,0.07); color: #f56565; border-color: rgba(255,80,80,0.12); }
.bg { background: rgba(201,168,76,0.1); color: #c9a84c; border-color: rgba(201,168,76,0.25); }

/* FILTER */
.fb { display: flex; gap: 10px; align-items: center; margin-bottom: 14px; flex-wrap: wrap; }
.si { flex: 1; min-width: 180px; position: relative; }
.si-ic { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); font-size: 12px; opacity: 0.25; pointer-events: none; }
.si input { width: 100%; padding: 9px 10px 9px 32px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07); border-radius: 9px; color: #fff; font-size: 13px; font-family: 'Inter', sans-serif; outline: none; transition: border-color 0.2s; }
.si input:focus { border-color: rgba(201,168,76,0.35); }
.si input::placeholder { color: #333; }
.fb-btns { display: flex; gap: 5px; flex-wrap: wrap; }
.fb-btn { padding: 8px 14px; border-radius: 9px; border: 1px solid rgba(255,255,255,0.07); background: rgba(255,255,255,0.03); color: #444; font-size: 12px; font-family: 'Inter', sans-serif; cursor: pointer; font-weight: 500; transition: all 0.15s; }
.fb-btn:hover { background: rgba(255,255,255,0.06); color: #888; }
.fb-btn.on { background: #c9a84c; color: #0f0f12; border-color: #c9a84c; font-weight: 600; }
.fb-divider { width: 1px; height: 22px; background: rgba(255,255,255,0.07); flex-shrink: 0; }
.type-sel { padding: 7px 12px; border-radius: 9px; border: 1px solid rgba(255,255,255,0.07); background: rgba(255,255,255,0.03); color: #888; font-size: 12px; font-family: 'Inter', sans-serif; cursor: pointer; outline: none; appearance: none; -webkit-appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23666'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 10px center; padding-right: 28px; }
.type-sel.active { border-color: rgba(201,168,76,0.5); color: #c9a84c; background-color: rgba(201,168,76,0.08); background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23c9a84c'/%3E%3C/svg%3E"); }

/* BACKUP TAB */
.bk-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
.bk-card { background: rgba(12,12,20,0.97); border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; padding: 22px 20px; }
.bk-card-title { font-size: 11px; font-weight: 700; color: #484848; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 14px; display: flex; align-items: center; gap: 8px; }
.bk-status-dot { width: 7px; height: 7px; border-radius: 50%; display: inline-block; }
.bk-btn { display: flex; align-items: center; gap: 10px; width: 100%; padding: 13px 16px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.07); background: rgba(255,255,255,0.03); color: #bbb; font-size: 13px; font-weight: 600; cursor: pointer; font-family: 'Inter', sans-serif; transition: all 0.18s; margin-bottom: 10px; text-align: left; }
.bk-btn:last-child { margin-bottom: 0; }
.bk-btn:hover:not(:disabled) { background: rgba(201,168,76,0.08); border-color: rgba(201,168,76,0.2); color: #c9a84c; }
.bk-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.bk-btn-primary { background: linear-gradient(135deg, rgba(201,168,76,0.15), rgba(201,168,76,0.08)); border-color: rgba(201,168,76,0.3); color: #c9a84c; }
.bk-btn-primary:hover:not(:disabled) { background: linear-gradient(135deg, rgba(201,168,76,0.25), rgba(201,168,76,0.12)); border-color: rgba(201,168,76,0.5); }
.bk-btn-icon { font-size: 18px; flex-shrink: 0; display:flex; align-items:center; }
.bk-btn-info { flex: 1; }
.bk-btn-label { font-size: 13px; font-weight: 600; display: block; }
.bk-btn-sub { font-size: 11px; color: #484848; font-weight: 400; margin-top: 2px; display: block; }
.bk-btn-primary .bk-btn-sub { color: rgba(201,168,76,0.55); }
.bk-toggle { display: flex; align-items: center; justify-content: space-between; padding: 12px 0; border-top: 1px solid rgba(255,255,255,0.04); margin-top: 4px; }
.bk-toggle-label { font-size: 13px; color: #888; font-weight: 500; }
.bk-switch { position: relative; width: 40px; height: 22px; cursor: pointer; }
.bk-switch input { opacity: 0; width: 0; height: 0; }
.bk-slider { position: absolute; inset: 0; background: rgba(255,255,255,0.08); border-radius: 22px; transition: 0.25s; }
.bk-slider::before { content: ''; position: absolute; height: 16px; width: 16px; left: 3px; top: 3px; background: #555; border-radius: 50%; transition: 0.25s; }
input:checked + .bk-slider { background: rgba(201,168,76,0.3); }
input:checked + .bk-slider::before { background: #c9a84c; transform: translateX(18px); }
.bk-hist-row { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.03); }
.bk-hist-row:last-child { border-bottom: none; }
.bk-hist-icon { font-size: 15px; opacity: 0.6; }
.bk-hist-info { flex: 1; }
.bk-hist-type { font-size: 12px; font-weight: 600; color: #888; }
.bk-hist-date { font-size: 11px; color: #333; margin-top: 1px; }
.bk-hist-size { font-size: 11px; color: #333; }
.bk-empty { text-align: center; color: #2a2a2a; font-size: 13px; padding: 24px 0; }
@media (max-width: 720px) { .bk-grid { grid-template-columns: 1fr; } }

/* LOGS TAB */
.log-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
.log-title { font-size: 18px; font-weight: 700; color: #c9a84c; letter-spacing: -0.3px; }
.log-count { font-size: 12px; color: #555; background: rgba(255,255,255,0.04); border-radius: 20px; padding: 3px 10px; }
.log-table { width: 100%; border-collapse: collapse; }
.log-table th { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #555; padding: 0 14px 10px; text-align: left; }
.log-table td { padding: 12px 14px; font-size: 12.5px; vertical-align: top; border-top: 1px solid rgba(255,255,255,0.025); }
.log-table tr:hover td { background: rgba(255,255,255,0.02); }
.log-time { color: #444; font-family: monospace; font-size: 11px; white-space: nowrap; }
.log-actor { font-weight: 600; color: #aaa; font-size: 12px; }
.log-badge { display: inline-block; font-size: 10px; font-weight: 700; letter-spacing: 0.06em; padding: 2px 7px; border-radius: 4px; text-transform: uppercase; white-space: nowrap; }
.log-badge-status  { background: rgba(100,180,100,0.12); color: #5cbc5c; }
.log-badge-cancel  { background: rgba(245,101,101,0.12); color: #f56565; }
.log-badge-delete  { background: rgba(245,101,101,0.18); color: #fc8181; }
.log-badge-assign  { background: rgba(100,150,220,0.12); color: #7baee8; }
.log-badge-backup  { background: rgba(201,168,76,0.12); color: #c9a84c; }
.log-badge-login   { background: rgba(180,120,220,0.12); color: #c084fc; }
.log-badge-default { background: rgba(255,255,255,0.05); color: #777; }
.log-detail { color: #555; font-size: 12px; line-height: 1.5; }
.log-empty { text-align: center; padding: 60px 0; color: #333; }
.log-empty-icon { font-size: 36px; margin-bottom: 10px; }
.log-empty-text { font-size: 14px; color: #444; }
.log-empty-sub { font-size: 12px; color: #333; margin-top: 6px; }

/* REVENUE TAB */
.kpi-row { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px,1fr)); gap: 12px; margin-bottom: 22px; }
.kpi { background: rgba(12,12,20,0.97); border: 1px solid rgba(255,255,255,0.05); border-radius: 14px; padding: 18px 16px; }
.kpi-lbl { font-size: 10px; font-weight: 600; color: #383838; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px; }
.kpi-val { font-size: 26px; font-weight: 700; }
.kpi-sub { font-size: 11px; color: #383838; margin-top: 5px; }

/* STAFF CARDS */
.staff-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px,1fr)); gap: 14px; margin-bottom: 20px; }
.staff-card { background: rgba(12,12,20,0.97); border: 1px solid rgba(255,255,255,0.05); border-radius: 14px; padding: 20px; transition: all 0.25s; }
.staff-card:hover { border-color: rgba(201,168,76,0.2); transform: translateY(-3px); box-shadow: 0 12px 32px rgba(0,0,0,0.3); }
.staff-av { width: 48px; height: 48px; border-radius: 14px; background: linear-gradient(135deg,rgba(201,168,76,0.2),rgba(201,168,76,0.08)); color: #c9a84c; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 700; margin-bottom: 12px; border: 1px solid rgba(201,168,76,0.15); }
.staff-name { font-size: 15px; font-weight: 600; color: #fff; margin-bottom: 3px; }
.staff-role { font-size: 10px; color: #484848; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 14px; }
.staff-stat { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.04); font-size: 12px; }
.staff-stat:last-child { border-bottom: none; }
.staff-stat-k { color: #484848; }
.staff-stat-v { font-weight: 600; }

/* CALENDAR */
.react-calendar { background: transparent !important; border: none !important; color: #888 !important; font-family: 'Inter', sans-serif !important; width: 100% !important; }
.react-calendar__tile { color: #888 !important; border-radius: 7px !important; font-size: 12px !important; }
.react-calendar__tile--active { background: #c9a84c !important; color: #0f0f12 !important; }
.react-calendar__tile:hover { background: rgba(201,168,76,0.15) !important; }
.react-calendar__navigation button { color: #c9a84c !important; background: transparent !important; font-size: 13px !important; }
.react-calendar__month-view__weekdays__weekday { color: #3a3a3a !important; font-size: 10px; }
.react-calendar__tile--weekend { color: #f56565 !important; }
.react-calendar__tile--hasActive { background: rgba(201,168,76,0.2) !important; }

/* MODAL */
.mb { position: fixed; inset: 0; background: rgba(0,0,0,0.78); backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; z-index: 9999; animation: mbi 0.2s ease; overflow-y: auto; padding: 20px; }
@keyframes mbi { from{opacity:0;}to{opacity:1;} }
.mbox { background: #0e0e1a; border: 1px solid rgba(201,168,76,0.15); border-radius: 20px; padding: 26px; width: 520px; max-width: 100%; animation: msl 0.3s cubic-bezier(0.22,1,0.36,1); }
@keyframes msl { from{opacity:0;transform:translateY(20px) scale(0.97);}to{opacity:1;transform:translateY(0) scale(1);} }
.mt { font-size: 16px; font-weight: 700; color: #c9a84c; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
.mr { display: flex; gap: 6px; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.04); font-size: 13px; }
.mr:last-of-type { border-bottom: none; }
.mk { color: #444; min-width: 110px; font-weight: 500; }
.mv { color: #ddd; }
.hb { margin: 14px 0; background: rgba(201,168,76,0.05); border: 1px solid rgba(201,168,76,0.12); border-radius: 12px; padding: 14px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.hs { font-size: 12px; color: #555; margin-bottom: 3px; }
.hv { font-size: 18px; font-weight: 700; }
.ma { display: flex; gap: 8px; margin-top: 18px; flex-wrap: wrap; }

/* LOADING */
.ls { min-height: 100vh; background: #07070f; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; font-family: 'Inter', sans-serif; }
.lsp { width: 34px; height: 34px; border-radius: 50%; border: 3px solid rgba(201,168,76,0.18); border-top-color: #c9a84c; animation: sp 0.8s linear infinite; }
@keyframes sp { to{transform:rotate(360deg);} }
.spin { animation: sp 0.8s linear infinite; }

/* SCROLLBAR */
::-webkit-scrollbar { width: 5px; height: 5px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.07); border-radius: 3px; }

/* CHART TOOLTIPS */
.recharts-default-tooltip { background: #0e0e1a !important; border: 1px solid rgba(201,168,76,0.2) !important; border-radius: 8px !important; font-size: 12px; }

/* REVENUE BARS */
.rev-row { display: flex; justify-content: space-between; align-items: center; padding: 9px 0; border-bottom: 1px solid rgba(255,255,255,0.04); font-size: 13px; }
.rev-row:last-child { border-bottom: none; }
.rev-bar-wrap { flex: 1; margin: 0 16px; height: 4px; background: rgba(255,255,255,0.06); border-radius: 2px; overflow: hidden; }
.rev-bar { height: 100%; background: linear-gradient(90deg,#c9a84c,#f5d98b); border-radius: 2px; transition: width 1s cubic-bezier(0.22,1,0.36,1); }
.tomorrow-box { background: rgba(245,199,90,0.06); border: 1px solid rgba(245,199,90,0.2); border-radius: 12px; padding: 14px 18px; margin-bottom: 18px; }

/* ── MOBILE ──────────────────────────────────────────── */
.mob-menu-btn { display: none; }
.sb-close-btn { display: none; }
.sb-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.65); z-index: 998; }
.sb-overlay.vis { display: block; }

@media (max-width: 768px) {
  .sb {
    position: fixed; left: -240px; top: 0; height: 100dvh;
    width: 220px; min-width: 220px;
    transition: left 0.28s cubic-bezier(0.4,0,0.2,1);
    z-index: 999;
  }
  .sb.sb-open { left: 0; box-shadow: 6px 0 32px rgba(0,0,0,0.75); }
  .mc { width: 100%; }
  .mob-menu-btn {
    display: flex; align-items: center; justify-content: center;
    width: 36px; height: 36px; border-radius: 9px; flex-shrink: 0;
    background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
    color: #888; cursor: pointer; margin-right: 8px;
  }
  .sb-close-btn {
    display: flex; align-items: center; justify-content: flex-end; gap: 6px;
    padding: 12px 14px 4px; border: none; background: none;
    color: #555; cursor: pointer; width: 100%; font-size: 12px; font-family: 'Inter',sans-serif;
  }
  .sb-close-btn:hover { color: #999; }
  .topbar { padding: 12px 14px; }
  .tb-title { font-size: 15px; }
  .tb-sub { display: none; }
  .pb { padding: 14px 12px; }
  .sg { grid-template-columns: repeat(2,1fr); gap: 8px; }
  .sc { padding: 12px; }
  .sc-val { font-size: 20px; }
  .sc-lbl { font-size: 8px; }
  .today-kpi-grid { grid-template-columns: repeat(2,1fr) !important; }
  .today-main-grid { grid-template-columns: 1fr !important; }
  .dash-2col-grid { grid-template-columns: 1fr !important; }
  .rev-2col-grid { grid-template-columns: 1fr !important; }
  .fb { flex-direction: column; gap: 8px; }
  .si { min-width: unset; }
  .fb-btns { flex-wrap: wrap; }
  .fb-divider { display: none; }
  .type-sel { width: 100%; }
  .kpi-row { grid-template-columns: repeat(2,1fr); }
  .kpi { padding: 14px; }
  .kpi-val { font-size: 20px; }
  .staff-grid { grid-template-columns: repeat(2,1fr); }
  .bk-grid { grid-template-columns: 1fr; }
  .mb { padding: 0; align-items: flex-end; }
  .mbox { width: 100%; max-width: 100%; border-radius: 18px 18px 0 0; padding: 22px 16px 28px; max-height: 90vh; overflow-y: auto; }
  .hb { grid-template-columns: repeat(2,1fr); gap: 8px; }
  .ma { flex-wrap: wrap; }
  .toast { left: 10px; right: 10px; max-width: unset; font-size: 12px; padding: 12px 14px; top: 10px; }
  .log-table td, .log-table th { padding: 8px 10px; font-size: 11px; }
  .bk-btn { padding: 11px 12px; }
  .card { padding: 14px; }
  .card-title { font-size: 12px; }
  .tb-user-info { display: none; }
}
@media (max-width: 480px) {
  .sc-val { font-size: 18px; }
  .sc { padding: 10px; }
  .staff-grid { grid-template-columns: 1fr; }
  .pb { padding: 12px 10px; }
  .kpi-row { grid-template-columns: 1fr 1fr; }
  .topbar { padding: 10px 10px; }
  .mob-menu-btn { width: 32px; height: 32px; }
}
`;

const smallInputStyle: React.CSSProperties = { flex: 1, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "7px 10px", color: "#eee", fontSize: 12.5, fontFamily: "inherit" };
const removeBtnStyle: React.CSSProperties = { background: "rgba(245,101,101,0.1)", border: "1px solid rgba(245,101,101,0.2)", borderRadius: 8, color: "#f56565", cursor: "pointer", padding: "0 10px", fontSize: 14 };

function RepeatableList({ items, onChange, placeholder }: { items: string[]; onChange: (items: string[]) => void; placeholder: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {items.map((item, i) => (
        <div key={i} style={{ display: "flex", gap: 6 }}>
          <input type="text" value={item} placeholder={placeholder}
            onChange={e => { const next = [...items]; next[i] = e.target.value; onChange(next); }}
            style={smallInputStyle} />
          <button onClick={() => onChange(items.filter((_, j) => j !== i))} style={removeBtnStyle}>×</button>
        </div>
      ))}
      <button onClick={() => onChange([...items, ""])} className="btn bv" style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 4 }}>
        <Plus size={11} />Add
      </button>
    </div>
  );
}

function RepeatableFaqs({ items, onChange }: { items: { q: string; a: string }[]; onChange: (items: { q: string; a: string }[]) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {items.map((item, i) => (
        <div key={i} style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: 8, display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", gap: 6 }}>
            <input type="text" value={item.q} placeholder="Question"
              onChange={e => { const next = [...items]; next[i] = { ...next[i], q: e.target.value }; onChange(next); }}
              style={smallInputStyle} />
            <button onClick={() => onChange(items.filter((_, j) => j !== i))} style={removeBtnStyle}>×</button>
          </div>
          <textarea value={item.a} placeholder="Answer" rows={2}
            onChange={e => { const next = [...items]; next[i] = { ...next[i], a: e.target.value }; onChange(next); }}
            style={{ ...smallInputStyle, resize: "vertical" as const }} />
        </div>
      ))}
      <button onClick={() => onChange([...items, { q: "", a: "" }])} className="btn bv" style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 4 }}>
        <Plus size={11} />Add FAQ
      </button>
    </div>
  );
}

/** True when a Supabase error means "this table/column doesn't exist yet" — i.e. a migration hasn't been run. */
function isMissingTableError(err: any): boolean {
  return !!err && (err.code === "42P01" || err.code === "PGRST205" || /could not find the table|does not exist|schema cache/i.test(err.message ?? ""));
}

/** Shared shell for every add/edit modal in this file: dark overlay, click-outside-to-close, click-inside-does-nothing, capped width/height with scroll. */
function Modal({ title, onClose, width = 420, children }: { title: React.ReactNode; onClose: () => void; width?: number; children: React.ReactNode }) {
  return (
    <div className="cm-overlay" onClick={onClose}>
      <div className="card cm-box-anim" onClick={e => e.stopPropagation()} style={{ width, maxWidth: "90vw", maxHeight: "85vh", overflowY: "auto" }}>
        <div className="card-title" style={{ justifyContent: "space-between" }}>
          <span>{title}</span>
          <button onClick={onClose} aria-label="Close" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", color: "#999", cursor: "pointer", flexShrink: 0 }}>
            <X size={13} />
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function HomeRowActions({ visible, onMoveUp, onMoveDown, onToggleVisible }: { visible: boolean; onMoveUp: () => void; onMoveDown: () => void; onToggleVisible: () => void }) {
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center", flexShrink: 0 }}>
      <button className="btn bv" title="Move up" onClick={onMoveUp} style={{ padding: 5 }}><ChevronUp size={11} /></button>
      <button className="btn bv" title="Move down" onClick={onMoveDown} style={{ padding: 5 }}><ChevronDown size={11} /></button>
      <button className="btn bv" title={visible ? "Visible — click to hide" : "Hidden — click to show"} onClick={onToggleVisible} style={{ padding: 5, opacity: visible ? 1 : 0.4 }}><Eye size={11} /></button>
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const [catalogCategories, setCatalogCategories] = useState<Category[]>(staticCategories);
  const refreshCatalog = () => {
    invalidateDynamicCategoriesCache();
    getDynamicCategories().then(dynamic => setCatalogCategories(mergeCategories(staticCategories, dynamic)));
  };
  useEffect(() => { refreshCatalog(); }, []);
  const SERVICE_PRICES = useMemo(() => buildServicePrices(catalogCategories), [catalogCategories]);
  const [bookings, setBookings]   = useState<Booking[]>([]);
  const [contacts, setContacts]   = useState<Contact[]>([]);
  const [staffs, setStaffs]       = useState<StaffRow[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [customerMeta, setCustomerMeta] = useState<Record<string, { notes: string; tags: string[]; blacklisted: boolean }>>({});
  const [customerMetaMissing, setCustomerMetaMissing] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [activeCustomer, setActiveCustomer] = useState<string | null>(null);
  const [customerNotesDraft, setCustomerNotesDraft] = useState("");
  const [customerTagsDraft, setCustomerTagsDraft] = useState("");
  const [customerSaving, setCustomerSaving] = useState(false);
  const [customerError, setCustomerError] = useState("");
  const [settings, setSettings]   = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKey, setSavedKey]   = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState("");
  const [heroImgUploading, setHeroImgUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [search, setSearch]       = useState("");
  const [filter, setFilter]       = useState<FilterType>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [inquirySearch, setInquirySearch] = useState("");
  const [inquiryStatusFilter, setInquiryStatusFilter] = useState<string>("all");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [selectedDate, setSelectedDate]       = useState<Date>(new Date());
  const [notification, setNotification] = useState("");
  function notify(msg: string, ms = 3000) {
    setNotification(msg);
    setTimeout(() => setNotification(""), ms);
  }
  const [loading, setLoading]     = useState(true);
  const [currentStaff, setCurrentStaff] = useState<StaffRow | null>(null);
  const currentStaffRef = useRef<StaffRow | null>(null);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [confirmModal, setConfirmModal] = useState<ConfirmModal>(null);
  const [secEvents, setSecEvents] = useState<{ created_at: string; locked_for_seconds: number }[]>([]);
  const [autoBackup, setAutoBackup] = useState(() => { try { return localStorage.getItem("bg_auto_backup") === "1"; } catch { return false; } });
  const [backupHistory, setBackupHistory] = useState<{ date: string; type: string; size: string }[]>(() => { try { return JSON.parse(localStorage.getItem("bg_backup_history") || "[]"); } catch { return []; } });
  const [backingUp, setBackingUp] = useState(false);
  const [activityLogs, setActivityLogs] = useState<{ id: number; created_at: string; actor: string; actor_role: string; action: string; details: string; entity_type?: string }[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isAdmin = !currentStaff || currentStaff.role === "admin";

  function showConfirm(title: string, message: string, onConfirm: () => void, opts?: { confirmLabel?: string; icon?: React.ReactNode; danger?: boolean }) {
    setConfirmModal({ title, message, onConfirm, ...opts });
  }

  // ── Services tab: admin-managed categories/services (Supabase-backed) ──
  const [dbCategories, setDbCategories]     = useState<DBCategory[]>([]);
  const [dbServices, setDbServices]         = useState<DBService[]>([]);
  const [svcActiveCatId, setSvcActiveCatId] = useState<string | null>(null);
  const [svcCatForm, setSvcCatForm]         = useState<Partial<DBCategory> | null>(null);
  const [svcForm, setSvcForm]               = useState<Partial<DBService> | null>(null);
  const [svcSaving, setSvcSaving]           = useState(false);
  const [svcUploading, setSvcUploading]     = useState(false);
  const [svcError, setSvcError]             = useState("");
  const [svcSearch, setSvcSearch]           = useState("");
  const [svcImporting, setSvcImporting]     = useState(false);
  const [svcImportMsg, setSvcImportMsg]     = useState("");

  const [svcTablesMissing, setSvcTablesMissing] = useState(false);
  const [svcChecking, setSvcChecking]           = useState(false);

  async function loadCatalogRaw() {
    setSvcChecking(true);
    const [{ data: cats, error: catErr }, { data: svcs, error: svcErr }] = await Promise.all([
      supabase.from("service_categories").select("*").order("sort_order"),
      supabase.from("services").select("*").order("sort_order"),
    ]);
    setSvcTablesMissing(isMissingTableError(catErr) || isMissingTableError(svcErr));
    setDbCategories((cats as DBCategory[]) ?? []);
    setDbServices((svcs as DBService[]) ?? []);
    setSvcChecking(false);
  }

  useEffect(() => { loadCatalogRaw(); }, []);

  async function saveCategory() {
    if (!svcCatForm?.id || !svcCatForm?.label) { setSvcError("Category ID and label are required."); return; }
    setSvcSaving(true); setSvcError("");
    const isNew = !dbCategories.some(c => c.id === svcCatForm.id);
    const { error } = isNew
      ? await supabase.from("service_categories").insert({
          id: svcCatForm.id, label: svcCatForm.label, description: svcCatForm.description ?? "",
          icon: svcCatForm.icon ?? "✨", color: svcCatForm.color ?? "#f5f5f5",
          gender: svcCatForm.gender ?? "both", home_service: svcCatForm.home_service ?? true,
          images: svcCatForm.images ?? [],
        })
      : await supabase.from("service_categories").update({
          label: svcCatForm.label, description: svcCatForm.description ?? "",
          icon: svcCatForm.icon ?? "✨", color: svcCatForm.color ?? "#f5f5f5",
          gender: svcCatForm.gender ?? "both", home_service: svcCatForm.home_service ?? true,
          images: svcCatForm.images ?? [],
        }).eq("id", svcCatForm.id);
    setSvcSaving(false);
    if (error) { setSvcError(error.message); return; }
    await loadCatalogRaw();
    refreshCatalog();
    setSvcActiveCatId(svcCatForm.id!);
    notify(`Saved "${svcCatForm.label}" ✓`);
    setSvcCatForm(null);
  }

  function deleteCategory(cat: DBCategory) {
    showConfirm(
      "Delete Category",
      `Delete "${cat.label}" and all its services? This can't be undone.`,
      async () => {
        setConfirmModal(null);
        await supabase.from("service_categories").delete().eq("id", cat.id);
        await loadCatalogRaw();
        refreshCatalog();
        if (svcActiveCatId === cat.id) setSvcActiveCatId(null);
        notify(`Deleted "${cat.label}" ✓`);
      },
      { confirmLabel: "Delete", icon: <Trash2 size={22} />, danger: true }
    );
  }

  async function saveService() {
    if (!svcForm?.category_id || !svcForm?.name || svcForm.price == null) {
      setSvcError("Category, name, and price are required.");
      return;
    }
    setSvcSaving(true); setSvcError("");
    const payload = {
      category_id: svcForm.category_id, name: svcForm.name, price: Math.round(Number(svcForm.price)),
      duration: svcForm.duration || null, group_name: svcForm.group_name || null,
      description: svcForm.description || null, popular: svcForm.popular ?? false,
      images: svcForm.images ?? [],
      trending: svcForm.trending ?? false,
      discount_percent: svcForm.discount_percent || null,
      long_description: svcForm.long_description || null,
      included_steps: svcForm.included_steps ?? [],
      benefits: svcForm.benefits ?? [],
      before_images: svcForm.before_images ?? [],
      after_images: svcForm.after_images ?? [],
      faqs: svcForm.faqs ?? [],
      section: svcForm.section || null,
    };
    const { error } = svcForm.id
      ? await supabase.from("services").update(payload).eq("id", svcForm.id)
      : await supabase.from("services").insert(payload);
    setSvcSaving(false);
    if (error) { setSvcError(error.message); return; }
    await loadCatalogRaw();
    refreshCatalog();
    // Jump to whichever category the service now belongs to, so an edit that
    // reassigns the category doesn't look like it "disappeared" — the admin
    // was looking at the old category and the saved item moved out of view.
    setSvcActiveCatId(svcForm.category_id!);
    notify(`Saved "${svcForm.name}" ✓`);
    setSvcForm(null);
  }

  function deleteService(svc: DBService) {
    showConfirm(
      "Delete Service",
      `Delete "${svc.name}"? This can't be undone.`,
      async () => {
        setConfirmModal(null);
        await supabase.from("services").delete().eq("id", svc.id);
        await loadCatalogRaw();
        refreshCatalog();
        notify(`Deleted "${svc.name}" ✓`);
      },
      { confirmLabel: "Delete", icon: <Trash2 size={22} />, danger: true }
    );
  }

  // Drag-and-drop reorder: dropping service `draggedId` onto `targetId` moves
  // it to that position (not just a single-step swap), then re-numbers every
  // row's sort_order in the new sequence so the order sticks.
  const [draggedServiceId, setDraggedServiceId] = useState<number | null>(null);
  const [dragOverServiceId, setDragOverServiceId] = useState<number | null>(null);
  // Lock switch for the drag-and-drop above — locked means no accidental
  // reorders while browsing/editing; persisted per device.
  const [reorderLocked, setReorderLocked] = useState(() => { try { return localStorage.getItem("bg_reorder_lock") === "1"; } catch { return false; } });
  function toggleReorderLock() {
    setReorderLocked(locked => {
      const next = !locked;
      try { localStorage.setItem("bg_reorder_lock", next ? "1" : "0"); } catch {}
      notify(next ? "Order locked 🔒 — drag-and-drop disabled" : "Order unlocked — drag to rearrange");
      return next;
    });
  }
  async function reorderByDrag<T extends { id: string | number; sort_order: number }>(
    table: string, rows: T[], draggedId: T["id"], targetId: T["id"]
  ) {
    if (reorderLocked || draggedId === targetId) return;
    const fromIdx = rows.findIndex(r => r.id === draggedId);
    const toIdx = rows.findIndex(r => r.id === targetId);
    if (fromIdx < 0 || toIdx < 0) return;
    const reordered = [...rows];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    const results = await Promise.all(
      reordered.map((r, i) => r.sort_order === i ? null : supabase.from(table).update({ sort_order: i }).eq("id", r.id))
    );
    const failed = results.find(r => r?.error);
    if (failed?.error) { setSvcError(failed.error.message); return; }
    await loadCatalogRaw();
    refreshCatalog();
  }
  const reorderServiceByDrag = (rows: DBService[], draggedId: number, targetId: number) => reorderByDrag("services", rows, draggedId, targetId);
  const [draggedCategoryId, setDraggedCategoryId] = useState<string | null>(null);
  const [dragOverCategoryId, setDragOverCategoryId] = useState<string | null>(null);
  const reorderCategoryByDrag = (draggedId: string, targetId: string) => reorderByDrag("service_categories", dbCategories, draggedId, targetId);

  async function handleSvcImageUpload(files: FileList | null, target: "category" | "service" | "before" | "after") {
    if (!files || !files.length) return;
    setSvcUploading(true); setSvcError("");
    try {
      const urls = await Promise.all(Array.from(files).map(f => uploadServiceImage(f)));
      if (target === "category") {
        setSvcCatForm(f => f ? { ...f, images: [...(f.images ?? []), ...urls] } : f);
      } else if (target === "before") {
        setSvcForm(f => f ? { ...f, before_images: [...(f.before_images ?? []), ...urls] } : f);
      } else if (target === "after") {
        setSvcForm(f => f ? { ...f, after_images: [...(f.after_images ?? []), ...urls] } : f);
      } else {
        setSvcForm(f => f ? { ...f, images: [...(f.images ?? []), ...urls] } : f);
      }
    } catch (err: any) {
      setSvcError(err.message || "Image upload failed.");
    } finally {
      setSvcUploading(false);
    }
  }

  // One-time import: copies the original hardcoded catalog (lib/servicesData.ts)
  // into the database so every service — old and new — is manageable from this
  // one screen. Skips categories already imported, so it's safe to click again
  // (e.g. after adding a brand-new static category in code later).
  async function importStaticCatalog() {
    const alreadyImported = new Set(dbCategories.map(c => c.id));
    const toImport = staticCategories.filter(c => !alreadyImported.has(c.id));
    if (toImport.length === 0) { setSvcImportMsg("Everything is already imported."); return; }

    setSvcImporting(true); setSvcImportMsg(""); setSvcError("");
    let catCount = 0, svcCount = 0;
    for (const cat of toImport) {
      const { error: catErr } = await supabase.from("service_categories").insert({
        id: cat.id, label: cat.label, description: cat.desc, icon: cat.icon, color: cat.color,
        gender: cat.gender, home_service: cat.homeService, images: cat.imgs ?? [],
      });
      if (catErr) { setSvcError(`Failed on "${cat.label}": ${catErr.message}`); break; }
      catCount++;
      const rows = cat.services.map(s => ({
        category_id: cat.id, name: s.name, price: s.price, duration: s.duration ?? null,
        group_name: s.group ?? null, description: s.desc ?? null, popular: s.popular ?? false,
        images: s.gallery ?? [], section: s.section ?? null, trending: s.trending ?? false,
        discount_percent: s.discountPercent ?? null, long_description: s.longDesc ?? null,
        included_steps: s.includedSteps ?? [], benefits: s.benefits ?? [],
        before_images: s.beforeImages ?? [], after_images: s.afterImages ?? [],
        faqs: s.faqs ?? [],
      }));
      if (rows.length) {
        const { error: svcErr } = await supabase.from("services").insert(rows);
        if (svcErr) { setSvcError(`Failed on services for "${cat.label}": ${svcErr.message}`); break; }
        svcCount += rows.length;
      }
    }
    await loadCatalogRaw();
    refreshCatalog();
    setSvcImporting(false);
    setSvcImportMsg(`Imported ${catCount} categor${catCount === 1 ? "y" : "ies"} and ${svcCount} services.`);
  }

  // ── Homepage tab: Why Choose Us / Testimonials / Gallery / FAQ (Supabase-backed) ──
  type HomeTable = "homepage_features" | "testimonials" | "gallery_images" | "faqs";
  const [dbFeatures, setDbFeatures]         = useState<DBFeature[]>([]);
  const [dbTestimonials, setDbTestimonials] = useState<DBTestimonial[]>([]);
  const [dbGalleryImages, setDbGalleryImages] = useState<DBGalleryImage[]>([]);
  const [dbFaqs, setDbFaqs]                 = useState<DBFaq[]>([]);
  const [homeSection, setHomeSection]       = useState<"features" | "testimonials" | "gallery" | "faqs">("features");
  const [homeTablesMissing, setHomeTablesMissing] = useState(false);
  const [homeChecking, setHomeChecking]     = useState(false);
  const [homeError, setHomeError]           = useState("");
  const [homeSaving, setHomeSaving]         = useState(false);
  const [homeUploading, setHomeUploading]   = useState(false);
  const [homeImporting, setHomeImporting]   = useState(false);
  const [homeImportMsg, setHomeImportMsg]   = useState("");
  const [featureForm, setFeatureForm]         = useState<Partial<DBFeature> | null>(null);
  const [testimonialForm, setTestimonialForm] = useState<Partial<DBTestimonial> | null>(null);
  const [galleryForm, setGalleryForm]         = useState<Partial<DBGalleryImage> | null>(null);
  const [faqForm, setFaqForm]                 = useState<Partial<DBFaq> | null>(null);

  async function loadHomepageRaw() {
    setHomeChecking(true);
    const [
      { data: feats, error: featErr }, { data: testis, error: testiErr },
      { data: imgs, error: imgErr }, { data: faqRows, error: faqErr },
    ] = await Promise.all([
      supabase.from("homepage_features").select("*").order("sort_order"),
      supabase.from("testimonials").select("*").order("sort_order"),
      supabase.from("gallery_images").select("*").order("sort_order"),
      supabase.from("faqs").select("*").order("sort_order"),
    ]);
    setHomeTablesMissing(isMissingTableError(featErr) || isMissingTableError(testiErr) || isMissingTableError(imgErr) || isMissingTableError(faqErr));
    setDbFeatures((feats as DBFeature[]) ?? []);
    setDbTestimonials((testis as DBTestimonial[]) ?? []);
    setDbGalleryImages((imgs as DBGalleryImage[]) ?? []);
    setDbFaqs((faqRows as DBFaq[]) ?? []);
    setHomeChecking(false);
  }
  useEffect(() => { loadHomepageRaw(); }, []);

  async function saveHomeRow(table: HomeTable, row: Record<string, any>, label: string) {
    setHomeSaving(true); setHomeError("");
    const { id, ...payload } = row;
    const { error } = id
      ? await supabase.from(table).update(payload).eq("id", id)
      : await supabase.from(table).insert(payload);
    setHomeSaving(false);
    if (error) { setHomeError(error.message); return false; }
    await loadHomepageRaw();
    notify(`Saved "${label}" ✓`);
    return true;
  }

  function deleteHomeRow(table: HomeTable, id: number, label: string) {
    showConfirm(
      "Delete",
      `Delete "${label}"? This can't be undone.`,
      async () => {
        setConfirmModal(null);
        await supabase.from(table).delete().eq("id", id);
        await loadHomepageRaw();
        notify(`Deleted "${label}" ✓`);
      },
      { confirmLabel: "Delete", icon: <Trash2 size={22} />, danger: true }
    );
  }

  async function toggleHomeVisible(table: HomeTable, id: number, visible: boolean) {
    const { error } = await supabase.from(table).update({ visible }).eq("id", id);
    if (error) { setHomeError(error.message); return; }
    await loadHomepageRaw();
  }

  async function moveHomeRow(table: HomeTable, rows: { id: number }[], id: number, dir: -1 | 1) {
    const idx = rows.findIndex(r => r.id === id);
    const swapIdx = idx + dir;
    if (idx < 0 || swapIdx < 0 || swapIdx >= rows.length) return;
    const results = await Promise.all([
      supabase.from(table).update({ sort_order: swapIdx }).eq("id", rows[idx].id),
      supabase.from(table).update({ sort_order: idx }).eq("id", rows[swapIdx].id),
    ]);
    const failed = results.find(r => r.error);
    if (failed?.error) { setHomeError(failed.error.message); return; }
    await loadHomepageRaw();
  }

  async function handleGalleryImageUpload(files: FileList | null) {
    if (!files || !files.length) return;
    // Selecting more than one photo here adds them all as separate gallery
    // entries directly (a single row only holds one photo) and closes this
    // form — matches the dedicated "Upload Multiple" button's behavior.
    if (files.length > 1) {
      await handleBulkGalleryUpload(files);
      setGalleryForm(null);
      return;
    }
    setHomeUploading(true); setHomeError("");
    try {
      const url = await uploadSiteImage(files[0]);
      setGalleryForm(f => f ? { ...f, src: url } : f);
    } catch (err: any) {
      setHomeError(err.message || "Image upload failed.");
    } finally {
      setHomeUploading(false);
    }
  }

  async function handleBulkGalleryUpload(files: FileList | null) {
    if (!files || !files.length) return;
    setHomeUploading(true); setHomeError("");
    try {
      const urls = await Promise.all(Array.from(files).map(f => uploadSiteImage(f)));
      const startOrder = dbGalleryImages.length;
      const { error } = await supabase.from("gallery_images").insert(
        urls.map((src, i) => ({ src, visible: true, sort_order: startOrder + i }))
      );
      if (error) throw error;
      await loadHomepageRaw();
      notify(`Added ${urls.length} photo${urls.length === 1 ? "" : "s"} ✓`);
    } catch (err: any) {
      setHomeError(err.message || "Image upload failed.");
    } finally {
      setHomeUploading(false);
    }
  }

  async function handleTestimonialPhotoUpload(files: FileList | null) {
    if (!files || !files.length) return;
    setHomeUploading(true); setHomeError("");
    try {
      const url = await uploadSiteImage(files[0]);
      setTestimonialForm(f => f ? { ...f, photo: url } : f);
    } catch (err: any) {
      setHomeError(err.message || "Image upload failed.");
    } finally {
      setHomeUploading(false);
    }
  }

  // One-time import: copies the content currently hardcoded on the live homepage
  // (Why Choose Us cards, testimonials, gallery photos, FAQs) into the database
  // so it shows up here and can be edited — same idea as the Services tab's
  // "Bring in my existing services". Only imports sections that are still empty,
  // so it's safe to click again later.
  async function importHomepageDefaults() {
    setHomeImporting(true); setHomeImportMsg(""); setHomeError("");
    // Why Choose Us cards are deliberately NOT auto-imported: the live site's
    // 6 cards use hand-drawn gold line-icon SVGs that can't be represented as
    // emoji text without looking noticeably worse. They stay hardcoded/SVG
    // unless you build brand-new cards here yourself ("Add Card").
    let n = { testimonials: 0, gallery: 0, faqs: 0 };
    try {
      if (dbTestimonials.length === 0) {
        const { error } = await supabase.from("testimonials").insert(
          staticReviews.map((r, i) => ({
            name: r.name, location: r.date, service: r.service, review: r.text,
            rating: r.rating, initials: r.initials, sort_order: i,
          }))
        );
        if (error) throw new Error(`Testimonials: ${error.message}`);
        n.testimonials = staticReviews.length;
      }
      if (dbGalleryImages.length === 0) {
        const { error } = await supabase.from("gallery_images").insert(
          staticGallerySlides.map((s, i) => ({ src: s.fallback, label: s.label, sub: s.sub, sort_order: i }))
        );
        if (error) throw new Error(`Gallery: ${error.message}`);
        n.gallery = staticGallerySlides.length;
      }
      if (dbFaqs.length === 0) {
        const { error } = await supabase.from("faqs").insert(
          staticFaqs.map((f, i) => ({ question: f.q, answer: f.a, sort_order: i }))
        );
        if (error) throw new Error(`FAQs: ${error.message}`);
        n.faqs = staticFaqs.length;
      }
      await loadHomepageRaw();
      const parts = [
        n.testimonials && `${n.testimonials} testimonial${n.testimonials === 1 ? "" : "s"}`,
        n.gallery && `${n.gallery} gallery photo${n.gallery === 1 ? "" : "s"}`,
        n.faqs && `${n.faqs} FAQ${n.faqs === 1 ? "" : "s"}`,
      ].filter(Boolean);
      setHomeImportMsg(parts.length ? `Imported: ${parts.join(", ")}.` : "Everything is already imported.");
    } catch (err: any) {
      setHomeError(err.message || "Import failed.");
    } finally {
      setHomeImporting(false);
    }
  }

  async function logActivity(action: string, details: string, entityType?: string, entityId?: number) {
    try {
      await (supabase as any).from("activity_logs").insert({
        actor: currentStaff?.name || "Admin",
        actor_role: currentStaff?.role || "admin",
        action, details,
        entity_type: entityType,
        entity_id: entityId,
      });
      const { data } = await (supabase as any).from("activity_logs").select("*").order("created_at", { ascending: false }).limit(100);
      if (data) setActivityLogs(data);
    } catch {}
  }

  // ── Fetch ──────────────────────────────────────────
  useEffect(() => { Notification.requestPermission(); }, []);

  useEffect(() => { init(); }, []);

  function playNotificationSound() {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const notes = [880, 1100, 880, 1320];
      let t = ctx.currentTime;
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = "sine";
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.35, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
        osc.start(t);
        osc.stop(t + 0.22);
        t += 0.18;
      });
    } catch {}
  }

  useEffect(() => {
    const ch = supabase.channel("appts")
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, payload => {
        fetchBookings(currentStaffRef.current);
        if (payload.eventType === "INSERT") {
          const n = payload.new as Booking;
          playNotificationSound();
          notify(`New booking: ${n.full_name} — ${n.service}`, 6000);
          if (Notification.permission === "granted")
            new Notification("New Booking", { body: `${n.full_name} booked ${n.service}` });
        }
      }).subscribe();
    // Polling fallback every 30s in case realtime replication isn't enabled on the table
    const poll = setInterval(() => fetchBookings(currentStaffRef.current), 30000);
    return () => { supabase.removeChannel(ch); clearInterval(poll); };
  }, []);

  useEffect(() => {
    const ch = supabase.channel("inquiries")
      .on("postgres_changes", { event: "*", schema: "public", table: "inquiries" }, payload => {
        fetchInquiries();
        if (payload.eventType === "INSERT") {
          const n = payload.new as Inquiry;
          playNotificationSound();
          notify(`New inquiry: ${n.full_name}${n.service ? ` — ${n.service}` : ""}`, 6000);
          if (Notification.permission === "granted")
            new Notification("New Inquiry", { body: `${n.full_name} sent an inquiry` });
        }
      }).subscribe();
    const poll = setInterval(fetchInquiries, 30000);
    return () => { supabase.removeChannel(ch); clearInterval(poll); };
  }, []);

  async function init() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push("/login"); return; }
    const email = session.user.email?.trim().toLowerCase() ?? "";
    const { data: sd } = await supabase.from("staff").select("*").ilike("email", email);
    const staff = sd?.[0] ?? null;
    // Block customers — only staff table members can access admin panel
    if (!staff) { await supabase.auth.signOut(); router.push("/login"); return; }
    setCurrentStaff(staff);
    currentStaffRef.current = staff;
    await Promise.all([fetchBookings(staff), fetchContacts(), fetchStaff(), fetchInquiries(), fetchSettings(), fetchCustomerMeta()]);
    // Try fetch security events (silently skip if table doesn't exist)
    try {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: se } = await (supabase as any).from("security_events").select("created_at,locked_for_seconds").gte("created_at", since).order("created_at", { ascending: false });
      if (se?.length) setSecEvents(se);
    } catch {}
    // Try fetch activity logs
    try {
      const { data: al } = await (supabase as any).from("activity_logs").select("*").order("created_at", { ascending: false }).limit(100);
      if (al) setActivityLogs(al);
    } catch {}
    // Log admin session start
    try {
      await (supabase as any).from("activity_logs").insert({ actor: staff.name, actor_role: staff.role, action: "LOGIN", details: "Admin panel opened", entity_type: "session" });
    } catch {}
    setLoading(false);
    // Auto-backup: trigger once per day if enabled
    try {
      const autoOn  = localStorage.getItem("bg_auto_backup") === "1";
      const lastBk  = localStorage.getItem("bg_last_backup");
      if (autoOn && lastBk !== new Date().toDateString()) {
        setTimeout(() => backupFull(), 4000);
      }
    } catch {}
  }

  async function fetchBookings(staff?: StaffRow | null) {
    let q = supabase.from("appointments").select("*").order("id", { ascending: false });
    if (staff && staff.role === "staff") q = q.eq("staff", staff.name);
    const { data } = await q;
    if (data) setBookings(data);
  }

  async function fetchContacts() {
    const { data } = await supabase.from("contacts").select("*").order("id", { ascending: false });
    if (data) setContacts(data);
  }

  async function fetchStaff() {
    const { data } = await supabase.from("staff").select("*").eq("active", true).neq("role", "admin");
    if (data) setStaffs(data);
  }

  async function fetchInquiries() {
    // Wrapped defensively: the `inquiries` table is created via supabase/inquiries.sql,
    // which may not have been run yet — don't let a missing table break the whole panel.
    try {
      const { data } = await supabase.from("inquiries").select("*").order("id", { ascending: false });
      if (data) setInquiries(data);
    } catch {}
  }

  async function fetchCustomerMeta() {
    try {
      const { data, error } = await supabase.from("customers").select("*");
      setCustomerMetaMissing(isMissingTableError(error));
      if (data) {
        const map: Record<string, { notes: string; tags: string[]; blacklisted: boolean }> = {};
        data.forEach((c: any) => { map[c.phone] = { notes: c.notes ?? "", tags: c.tags ?? [], blacklisted: c.blacklisted ?? false }; });
        setCustomerMeta(map);
      }
    } catch {}
  }

  async function saveCustomerMeta(phone: string, updates: Partial<{ notes: string; tags: string[]; blacklisted: boolean }>) {
    setCustomerSaving(true); setCustomerError("");
    const current = customerMeta[phone] ?? { notes: "", tags: [], blacklisted: false };
    const next = { ...current, ...updates };
    const { error } = await supabase.from("customers").upsert({ phone, ...next, updated_at: new Date().toISOString() });
    setCustomerSaving(false);
    if (error) { setCustomerError(error.message); return; }
    setCustomerMeta(m => ({ ...m, [phone]: next }));
    notify("Saved ✓", 2500);
  }

  async function fetchSettings() {
    try {
      const { data, error } = await supabase.from("settings").select("*");
      if (error) {
        setSettingsError(
          isMissingTableError(error)
            ? 'Settings table not found. Run supabase/settings.sql in the Supabase SQL Editor, then reload this page.'
            : error.message
        );
        return;
      }
      setSettingsError("");
      if (data) {
        const map: Record<string, string> = {};
        (data as { key: string; value: string }[]).forEach(s => { map[s.key] = s.value; });
        setSettings(map);
      }
    } catch (err: any) {
      setSettingsError(err?.message || "Failed to load settings.");
    }
  }

  async function saveSetting(key: string) {
    setSavingKey(key);
    setSettingsError("");
    try {
      const { error } = await supabase.from("settings").upsert({ key, value: settings[key] ?? "", updated_at: new Date().toISOString() });
      if (error) {
        setSettingsError(
          isMissingTableError(error)
            ? 'Settings table not found. Run supabase/settings.sql in the Supabase SQL Editor, then try again.'
            : `Could not save "${key}": ${error.message}`
        );
        return;
      }
      logActivity("SETTING_UPDATED", `Setting "${key}" updated`, "setting");
      setSavedKey(key);
      setTimeout(() => setSavedKey(null), 3000);
    } catch (err: any) {
      setSettingsError(err?.message || `Could not save "${key}".`);
    } finally {
      setSavingKey(null);
    }
  }

  function getHeroImages(): string[] {
    try {
      const parsed = JSON.parse(settings.hero_bg_images || "[]");
      if (Array.isArray(parsed) && parsed.length) return parsed;
    } catch {}
    return settings.hero_bg_image ? [settings.hero_bg_image] : [];
  }

  async function saveHeroImages(images: string[]) {
    setSettings(p => ({ ...p, hero_bg_images: JSON.stringify(images) }));
    const { error } = await supabase.from("settings").upsert({ key: "hero_bg_images", value: JSON.stringify(images), updated_at: new Date().toISOString() });
    if (error) throw error;
    setSavedKey("hero_bg_image");
    setTimeout(() => setSavedKey(null), 3000);
  }

  async function handleHeroImageUpload(files: FileList | null) {
    if (!files || !files.length) return;
    setHeroImgUploading(true); setSettingsError("");
    try {
      const urls = await Promise.all(Array.from(files).map(f => uploadSiteImage(f)));
      await saveHeroImages([...getHeroImages(), ...urls]);
    } catch (err: any) {
      setSettingsError(err?.message || "Image upload failed.");
    } finally {
      setHeroImgUploading(false);
    }
  }

  async function removeHeroImage(url: string) {
    try {
      await saveHeroImages(getHeroImages().filter(u => u !== url));
    } catch (err: any) {
      setSettingsError(err?.message || "Could not remove image.");
    }
  }

  async function updateStatus(id: number, status: string) {
    await supabase.from("appointments").update({ status }).eq("id", id);
    const b = bookings.find(bk => bk.id === id);
    if (b) logActivity("STATUS_CHANGED", `${b.full_name}'s ${b.service} changed to ${status}`, "booking", id);
    fetchBookings(currentStaff);
  }

  async function assignStaff(id: number, staff: string) {
    await supabase.from("appointments").update({ staff }).eq("id", id);
    const b = bookings.find(bk => bk.id === id);
    if (b) logActivity("STAFF_ASSIGNED", `${staff || "Unassigned"} assigned to ${b.full_name}'s ${b.service}`, "booking", id);
    fetchBookings(currentStaff);
  }

  function cancelBooking(b: Booking) {
    showConfirm(
      "Cancel Booking",
      `Mark ${b.full_name}'s ${b.service} on ${b.booking_date} as Cancelled? This can be undone by changing the status back.`,
      async () => {
        setConfirmModal(null);
        await updateStatus(b.id, "Cancelled");
        logActivity("BOOKING_CANCELLED", `${b.full_name}'s ${b.service} on ${b.booking_date} cancelled`, "booking", b.id);
        sendWA(b.phone, `Hello ${b.full_name}, we regret to inform you that your appointment has been cancelled.\n\nService: ${b.service}\n📅 ${b.booking_date} at ⏰ ${b.booking_time}\n\nWe apologize for the inconvenience. Please contact us to reschedule.\n\n— Bella & Guy Salon`);
        sendEmailNotification("cancelled", b);
      },
      { confirmLabel: "Yes, Cancel It", icon: <Ban size={22}/>, danger: false }
    );
  }

  function deleteBooking(id: number) {
    const b = bookings.find(bk => bk.id === id);
    showConfirm(
      "Delete Booking",
      "This booking will be permanently deleted and cannot be recovered.",
      async () => {
        setConfirmModal(null);
        await supabase.from("appointments").delete().eq("id", id);
        if (b) logActivity("BOOKING_DELETED", `${b.full_name}'s ${b.service} on ${b.booking_date} deleted`, "booking", id);
        fetchBookings(currentStaff);
      },
      { confirmLabel: "Delete", icon: <Trash2 size={22}/>, danger: true }
    );
  }

  function deleteContact(id: number) {
    const c = contacts.find(ct => ct.id === id);
    showConfirm(
      "Delete Message",
      "This contact message will be permanently deleted.",
      async () => {
        setConfirmModal(null);
        await supabase.from("contacts").delete().eq("id", id);
        if (c) logActivity("CONTACT_DELETED", `Message from ${c.name} (${c.phone}) deleted`, "contact", id);
        fetchContacts();
      }
    );
  }

  async function updateInquiryStatus(id: number, status: string) {
    await supabase.from("inquiries").update({ status }).eq("id", id);
    const inq = inquiries.find(i => i.id === id);
    if (inq) logActivity("INQUIRY_STATUS_CHANGED", `${inq.full_name}'s inquiry changed to ${status}`, "inquiry", id);
    fetchInquiries();
  }

  function deleteInquiry(id: number) {
    const inq = inquiries.find(i => i.id === id);
    showConfirm(
      "Delete Inquiry",
      "This inquiry will be permanently deleted and cannot be recovered.",
      async () => {
        setConfirmModal(null);
        await supabase.from("inquiries").delete().eq("id", id);
        if (inq) logActivity("INQUIRY_DELETED", `Inquiry from ${inq.full_name} deleted`, "inquiry", id);
        fetchInquiries();
      },
      { confirmLabel: "Delete", icon: <Trash2 size={22}/>, danger: true }
    );
  }

  // ── Computed values ───────────────────────────────
  const today       = new Date().toISOString().split("T")[0];
  const thisMonth   = new Date().toISOString().slice(0, 7);
  const tomorrow    = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split("T")[0]; })();

  const price = (b: Booking) =>
    b.service.split(", ").reduce((sum, part) => sum + (SERVICE_PRICES[part.trim()] || 0), 0);

  // ── Customer CRM: derived purely from bookings + inquiries, grouped by phone ──
  type CustomerProfile = {
    phone: string; name: string; email?: string;
    bookings: Booking[]; inquiries: Inquiry[];
    totalBookings: number; lifetimeValue: number; lastVisit: string;
    favouriteService: string; notes: string; tags: string[]; blacklisted: boolean;
  };
  const customerProfiles = useMemo<CustomerProfile[]>(() => {
    const byPhone: Record<string, { bookings: Booking[]; inquiries: Inquiry[] }> = {};
    bookings.forEach(b => { (byPhone[b.phone] ??= { bookings: [], inquiries: [] }).bookings.push(b); });
    inquiries.forEach(i => { (byPhone[i.phone] ??= { bookings: [], inquiries: [] }).inquiries.push(i); });

    return Object.entries(byPhone).map(([phone, g]) => {
      const sortedBookings = [...g.bookings].sort((a, b) => (b.booking_date || "").localeCompare(a.booking_date || ""));
      const latest = sortedBookings[0] ?? g.inquiries[0];
      const serviceCounts: Record<string, number> = {};
      g.bookings.forEach(b => { b.service.split(", ").forEach(s => { serviceCounts[s.trim()] = (serviceCounts[s.trim()] ?? 0) + 1; }); });
      const favouriteService = Object.entries(serviceCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
      const meta = customerMeta[phone] ?? { notes: "", tags: [], blacklisted: false };
      return {
        phone,
        name: latest?.full_name ?? phone,
        email: sortedBookings.find(b => b.email)?.email ?? g.inquiries.find(i => i.email)?.email,
        bookings: sortedBookings,
        inquiries: g.inquiries,
        totalBookings: g.bookings.length,
        lifetimeValue: g.bookings.filter(b => b.status !== "Cancelled").reduce((s, b) => s + price(b), 0),
        lastVisit: sortedBookings[0]?.booking_date ?? "",
        favouriteService,
        ...meta,
      };
    }).sort((a, b) => b.lifetimeValue - a.lifetimeValue);
  }, [bookings, inquiries, customerMeta, SERVICE_PRICES]);

  const filteredCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return customerProfiles;
    return customerProfiles.filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(q) || (c.email ?? "").toLowerCase().includes(q));
  }, [customerProfiles, customerSearch]);

  const totalRevenue  = useMemo(() => bookings.filter(b => b.status !== "Cancelled").reduce((s, b) => s + price(b), 0), [bookings, SERVICE_PRICES]);
  const monthRevenue  = useMemo(() => bookings.filter(b => b.status !== "Cancelled" && b.booking_date?.slice(0,7) === thisMonth).reduce((s,b) => s + price(b), 0), [bookings, SERVICE_PRICES]);
  const todayRevenue  = useMemo(() => bookings.filter(b => b.status !== "Cancelled" && b.booking_date === today).reduce((s,b) => s + price(b), 0), [bookings, SERVICE_PRICES]);
  const completedCnt  = bookings.filter(b => b.status === "Completed").length;
  const avgBooking    = completedCnt ? Math.round(totalRevenue / completedCnt) : 0;

  // Monthly chart data — last 12 months
  const monthlyChart = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - (11 - i));
      const ym = d.toISOString().slice(0, 7);
      const label = d.toLocaleString("default", { month: "short" });
      const rev = bookings.filter(b => b.status !== "Cancelled" && b.booking_date?.slice(0,7) === ym).reduce((s,b) => s + price(b), 0);
      const cnt = bookings.filter(b => b.booking_date?.slice(0,7) === ym).length;
      return { name: label, Revenue: rev, Bookings: cnt };
    });
  }, [bookings, SERVICE_PRICES]);

  // Service revenue breakdown
  const serviceRevenue = useMemo(() => {
    const map: Record<string,number> = {};
    bookings.filter(b => b.status !== "Cancelled").forEach(b => {
      map[b.service] = (map[b.service] || 0) + price(b);
    });
    return Object.entries(map).sort((a,b) => b[1]-a[1]).slice(0, 10);
  }, [bookings, SERVICE_PRICES]);

  const maxServiceRev = serviceRevenue[0]?.[1] || 1;

  // Staff performance
  const staffPerformance = useMemo(() => staffs.map(s => {
    const sb = bookings.filter(b => b.staff === s.name);
    const rev = sb.filter(b => b.status !== "Cancelled").reduce((sum,b) => sum + price(b), 0);
    const done = sb.filter(b => b.status === "Completed").length;
    const top = Object.entries(sb.reduce((a,b) => { a[b.service]=(a[b.service]||0)+1; return a; }, {} as Record<string,number>)).sort((a,b)=>b[1]-a[1])[0];
    return { ...s, total: sb.length, done, revenue: rev, avg: sb.length ? Math.round(rev/sb.length) : 0, topService: top?.[0] || "—" };
  }), [staffs, bookings, SERVICE_PRICES]);

  // Filter bookings
  const filteredBookings = useMemo(() => bookings.filter(b => {
    const q = search.toLowerCase().trim();
    const bgRef = `BG-${String(b.id).padStart(5, "0")}`;
    const bgMatch = q.startsWith("bg")
      ? bgRef.toLowerCase().includes(q)
      : /^\d+$/.test(q) && b.id === parseInt(q, 10);
    const m = bgMatch || (b.full_name?.toLowerCase().includes(q) || b.phone?.includes(q) || b.service?.toLowerCase().includes(q));
    // Type filter: salon = no address, home = has address
    if (typeFilter === "salon" && b.address) return false;
    if (typeFilter === "home"  && !b.address) return false;
    if (filter === "today") return m && b.booking_date === today;
    if (filter === "week")  {
      const d = new Date(b.booking_date); const now = new Date();
      const wStart = new Date(now); wStart.setDate(now.getDate() - now.getDay());
      return m && d >= wStart;
    }
    if (filter === "month") return m && b.booking_date?.slice(0,7) === thisMonth;
    return m;
  }), [bookings, search, filter, typeFilter]);

  const filteredInquiries = useMemo(() => inquiries.filter(i => {
    const q = inquirySearch.toLowerCase().trim();
    const m = !q || [i.full_name, i.phone, i.service, i.message, i.budget].some(f => (f ?? "").toLowerCase().includes(q));
    const s = inquiryStatusFilter === "all" || i.status === inquiryStatusFilter;
    return m && s;
  }), [inquiries, inquirySearch, inquiryStatusFilter]);

  // Customer history for modal
  const custHistory = selectedBooking ? bookings.filter(b => b.phone === selectedBooking.phone) : [];
  const custSpent   = custHistory.filter(b => b.status !== "Cancelled").reduce((s,b) => s + price(b), 0);

  // Tomorrow bookings
  const tmrBookings = bookings.filter(b => b.booking_date === tomorrow);

  // ── PDF Helpers ────────────────────────────────────
  function pdfHeader(doc: jsPDF, title: string, subtitle: string) {
    const W = doc.internal.pageSize.getWidth();
    // Gold top bar
    doc.setFillColor(201, 168, 76);
    doc.rect(0, 0, W, 2, "F");
    // Header bg
    doc.setFillColor(252, 250, 245);
    doc.rect(0, 2, W, 42, "F");
    // Salon name
    doc.setFontSize(22); doc.setTextColor(15, 15, 20);
    doc.setFont("helvetica", "bold");
    doc.text("BELLA & GUY", 14, 18);
    // Gold ampersand accent
    doc.setFontSize(22); doc.setTextColor(201, 168, 76);
    // Tagline
    doc.setFontSize(8); doc.setTextColor(160, 140, 100);
    doc.setFont("helvetica", "normal");
    doc.text("Premium Unisex Salon  |  Wave City, Ghaziabad  |  +91 96259 28495", 14, 26);
    // Divider line
    doc.setDrawColor(201, 168, 76); doc.setLineWidth(0.4);
    doc.line(14, 30, W - 14, 30);
    // Report title
    doc.setFontSize(13); doc.setTextColor(15, 15, 20);
    doc.setFont("helvetica", "bold");
    doc.text(title, 14, 39);
    // Subtitle / date
    doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(140, 130, 110);
    doc.text(subtitle, W - 14, 39, { align: "right" });
    // Reset bg
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 44, W, doc.internal.pageSize.getHeight() - 44, "F");
  }

  function pdfFooter(doc: jsPDF) {
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    doc.setFillColor(252, 250, 245);
    doc.rect(0, H - 14, W, 14, "F");
    doc.setDrawColor(220, 210, 185); doc.setLineWidth(0.3);
    doc.line(14, H - 14, W - 14, H - 14);
    doc.setFontSize(7.5); doc.setTextColor(180, 160, 110); doc.setFont("helvetica", "normal");
    doc.text("Bella & Guy Salon  —  Confidential Business Report", 14, H - 5);
    doc.text(`Generated: ${new Date().toLocaleString("en-IN")}`, W - 14, H - 5, { align: "right" });
  }

  function pdfStatBox(doc: jsPDF, x: number, y: number, w: number, label: string, value: string, accent = false) {
    doc.setFillColor(accent ? 252 : 248, accent ? 248 : 248, accent ? 235 : 248);
    doc.setDrawColor(accent ? 201 : 220, accent ? 168 : 210, accent ? 76 : 190);
    doc.setLineWidth(0.4);
    doc.roundedRect(x, y, w, 18, 2, 2, "FD");
    doc.setFontSize(7); doc.setTextColor(140, 130, 110); doc.setFont("helvetica", "normal");
    doc.text(label.toUpperCase(), x + 5, y + 6.5);
    doc.setFontSize(11); doc.setTextColor(accent ? 160 : 30, accent ? 120 : 30, accent ? 20 : 30);
    doc.setFont("helvetica", "bold");
    doc.text(value, x + 5, y + 14);
  }

  // ── PDF Exports ────────────────────────────────────
  function pdfAppointments() {
    const doc = new jsPDF();
    const W = doc.internal.pageSize.getWidth();
    const dateStr = new Date().toLocaleDateString("en-IN", { day:"2-digit", month:"long", year:"numeric" });

    pdfHeader(doc, "Appointments Report", dateStr);

    // Stats row
    const confirmed = filteredBookings.filter(b => b.status === "Confirmed").length;
    const completed = filteredBookings.filter(b => b.status === "Completed").length;
    const cancelled = filteredBookings.filter(b => b.status === "Cancelled").length;
    const bw = (W - 28) / 4;
    pdfStatBox(doc, 14,      48, bw - 3, "Total Bookings",  String(filteredBookings.length));
    pdfStatBox(doc, 14 + bw, 48, bw - 3, "Confirmed",       String(confirmed));
    pdfStatBox(doc, 14 + bw*2, 48, bw - 3, "Completed",    String(completed));
    pdfStatBox(doc, 14 + bw*3, 48, bw - 3, "Total Revenue", `Rs.${totalRevenue.toLocaleString()}`, true);

    autoTable(doc, {
      startY: 70,
      head: [["#", "Client Name", "Phone", "Service", "Date", "Time", "Status", "Staff", "Type"]],
      body: filteredBookings.map((b, i) => [
        i + 1, b.full_name, b.phone, b.service,
        b.booking_date, b.booking_time,
        b.status, b.staff || "—", b.address ? "Home" : "Salon"
      ]),
      headStyles: {
        fillColor: [30, 25, 10], textColor: [201, 168, 76],
        fontSize: 8, fontStyle: "bold", cellPadding: 4,
      },
      bodyStyles: { fontSize: 8, textColor: [40, 35, 25], cellPadding: 3.5 },
      alternateRowStyles: { fillColor: [252, 250, 244] },
      styles: { lineColor: [230, 220, 200], lineWidth: 0.2 },
      columnStyles: {
        0: { cellWidth: 8, halign: "center" },
        6: { fontStyle: "bold" },
      },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 6) {
          const status = data.cell.raw as string;
          if (status === "Completed")  data.cell.styles.textColor = [34, 150, 80];
          if (status === "Confirmed")  data.cell.styles.textColor = [30, 120, 200];
          if (status === "Cancelled")  data.cell.styles.textColor = [200, 60, 60];
          if (status === "Pending")    data.cell.styles.textColor = [180, 140, 20];
        }
      },
      didDrawPage: () => pdfFooter(doc),
    });

    doc.save(`bella-guy-appointments-${today}.pdf`);
  }

  function pdfRevenue() {
    const doc = new jsPDF();
    const W = doc.internal.pageSize.getWidth();
    const dateStr = new Date().toLocaleDateString("en-IN", { day:"2-digit", month:"long", year:"numeric" });

    pdfHeader(doc, "Revenue Report", dateStr);

    // Stats
    const bw = (W - 28) / 4;
    pdfStatBox(doc, 14,        48, bw - 3, "Total Revenue",   `Rs.${totalRevenue.toLocaleString()}`,  true);
    pdfStatBox(doc, 14 + bw,   48, bw - 3, "This Month",      `Rs.${monthRevenue.toLocaleString()}`);
    pdfStatBox(doc, 14 + bw*2, 48, bw - 3, "Today",           `Rs.${todayRevenue.toLocaleString()}`);
    pdfStatBox(doc, 14 + bw*3, 48, bw - 3, "Avg Booking",     `Rs.${avgBooking.toLocaleString()}`);

    // Monthly breakdown
    doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 25, 10);
    doc.text("Monthly Breakdown", 14, 74);
    doc.setDrawColor(201, 168, 76); doc.setLineWidth(0.3);
    doc.line(14, 76, 60, 76);

    autoTable(doc, {
      startY: 79,
      head: [["Month", "Revenue (Rs.)", "Bookings"]],
      body: monthlyChart.map(m => [m.name, `Rs.${m.Revenue.toLocaleString()}`, m.Bookings]),
      headStyles: { fillColor: [30, 25, 10], textColor: [201, 168, 76], fontSize: 9, fontStyle: "bold", cellPadding: 4 },
      bodyStyles: { fontSize: 9, textColor: [40, 35, 25], cellPadding: 3.5 },
      alternateRowStyles: { fillColor: [252, 250, 244] },
      styles: { lineColor: [230, 220, 200], lineWidth: 0.2 },
      tableWidth: (W - 28) / 2,
      didDrawPage: () => pdfFooter(doc),
    });

    const y2 = (doc as any).lastAutoTable.finalY + 12;
    doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 25, 10);
    doc.text("Top Services by Revenue", 14, y2);
    doc.setDrawColor(201, 168, 76); doc.setLineWidth(0.3);
    doc.line(14, y2 + 2, 70, y2 + 2);

    autoTable(doc, {
      startY: y2 + 5,
      head: [["Service", "Revenue (Rs.)"]],
      body: serviceRevenue.map(([s, r]) => [s, `Rs.${(r as number).toLocaleString()}`]),
      headStyles: { fillColor: [30, 25, 10], textColor: [201, 168, 76], fontSize: 9, fontStyle: "bold", cellPadding: 4 },
      bodyStyles: { fontSize: 9, textColor: [40, 35, 25], cellPadding: 3.5 },
      alternateRowStyles: { fillColor: [252, 250, 244] },
      styles: { lineColor: [230, 220, 200], lineWidth: 0.2 },
      tableWidth: (W - 28) / 2,
      didDrawPage: () => pdfFooter(doc),
    });

    pdfFooter(doc);
    doc.save(`bella-guy-revenue-${today}.pdf`);
  }

  function pdfStaff() {
    const doc = new jsPDF({ orientation: "landscape" });
    const W = doc.internal.pageSize.getWidth();
    const dateStr = new Date().toLocaleDateString("en-IN", { day:"2-digit", month:"long", year:"numeric" });

    pdfHeader(doc, "Staff Performance Report", dateStr);

    // Stats row
    const totalStaff = staffPerformance.length;
    const topEarner = staffPerformance.reduce((a, b) => a.revenue > b.revenue ? a : b, staffPerformance[0] || { name: "—", revenue: 0 });
    const bw = (W - 28) / 4;
    pdfStatBox(doc, 14,        48, bw - 3, "Active Staff",   String(totalStaff));
    pdfStatBox(doc, 14 + bw,   48, bw - 3, "Total Bookings", String(staffPerformance.reduce((s, x) => s + x.total, 0)));
    pdfStatBox(doc, 14 + bw*2, 48, bw - 3, "Total Revenue",  `Rs.${staffPerformance.reduce((s, x) => s + x.revenue, 0).toLocaleString()}`, true);
    pdfStatBox(doc, 14 + bw*3, 48, bw - 3, "Top Performer",  topEarner?.name || "—");

    autoTable(doc, {
      startY: 70,
      head: [["Staff Member", "Role", "Total", "Completed", "Cancelled", "Revenue (Rs.)", "Avg / Booking", "Top Service"]],
      body: staffPerformance.map(s => [
        s.name, s.role, s.total, s.done,
        s.total - s.done,
        `Rs.${s.revenue.toLocaleString()}`,
        `Rs.${s.avg.toLocaleString()}`,
        s.topService,
      ]),
      headStyles: { fillColor: [30, 25, 10], textColor: [201, 168, 76], fontSize: 9, fontStyle: "bold", cellPadding: 4 },
      bodyStyles: { fontSize: 9, textColor: [40, 35, 25], cellPadding: 3.5 },
      alternateRowStyles: { fillColor: [252, 250, 244] },
      styles: { lineColor: [230, 220, 200], lineWidth: 0.2 },
      columnStyles: {
        0: { fontStyle: "bold" },
        5: { textColor: [34, 150, 80], fontStyle: "bold" },
      },
      didDrawPage: () => pdfFooter(doc),
    });

    pdfFooter(doc);
    doc.save(`bella-guy-staff-${today}.pdf`);
  }

  // ── Backup System ──────────────────────────────────
  function saveBackupHistory(type: string, bytes: number) {
    const entry = { date: new Date().toISOString(), type, size: bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB` };
    const hist = [entry, ...backupHistory].slice(0, 20);
    setBackupHistory(hist);
    try { localStorage.setItem("bg_backup_history", JSON.stringify(hist)); } catch {}
    try { localStorage.setItem("bg_last_backup", new Date().toDateString()); } catch {}
  }

  function downloadJSON(obj: object, filename: string) {
    const json = JSON.stringify(obj, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a"); a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    return new TextEncoder().encode(json).length;
  }

  async function backupFull() {
    setBackingUp(true);
    const { data: appts } = await supabase.from("appointments").select("*").order("id");
    const { data: cons  } = await supabase.from("contacts").select("*").order("id");
    const { data: stf   } = await supabase.from("staff").select("*").order("id");
    const payload = {
      metadata: { salon: "Bella & Guy Salon", backup_date: new Date().toISOString(), version: "1.0", type: "full" },
      tables: { appointments: appts || [], contacts: cons || [], staff: stf || [] },
      summary: { total_appointments: appts?.length || 0, total_contacts: cons?.length || 0, total_staff: stf?.length || 0 },
    };
    const bytes = downloadJSON(payload, `bella-guy-full-backup-${today}.json`);
    saveBackupHistory("Full Backup", bytes);
    logActivity("BACKUP_FULL", `Full backup downloaded — ${appts?.length||0} appointments, ${cons?.length||0} contacts, ${stf?.length||0} staff (${(bytes/1024).toFixed(1)} KB)`);
    setBackingUp(false);
  }

  async function backupTable(table: "appointments" | "contacts" | "staff", label: string) {
    setBackingUp(true);
    const { data } = await supabase.from(table).select("*").order("id");
    const payload = { metadata: { salon: "Bella & Guy Salon", backup_date: new Date().toISOString(), table, type: label }, data: data || [] };
    const bytes = downloadJSON(payload, `bella-guy-${table}-${today}.json`);
    saveBackupHistory(label, bytes);
    logActivity("BACKUP_TABLE", `${label} downloaded — ${data?.length||0} records (${(bytes/1024).toFixed(1)} KB)`, "table");
    setBackingUp(false);
  }

  function toggleAutoBackup(val: boolean) {
    setAutoBackup(val);
    try { localStorage.setItem("bg_auto_backup", val ? "1" : "0"); } catch {}
  }

  function csvExport() {
    const h = ["ID", "Client Name", "Phone", "Email", "Service", "Date", "Time", "Address", "Status", "Staff", "Type", "Price (Rs.)"];
    const rows = filteredBookings.map(b => [
      b.id, b.full_name, b.phone, b.email || "",
      b.service, b.booking_date, b.booking_time,
      b.address || "", b.status, b.staff || "",
      b.address ? "Home Service" : "Salon",
      price(b) || 0,
    ]);
    // UTF-8 BOM so Excel opens Indian characters correctly
    const BOM = "﻿";
    const csv = BOM + [h, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `bella-guy-bookings-${today}.csv`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  function csvExportInquiries() {
    const h = ["ID", "Name", "Phone", "Email", "Type", "Gender", "Service", "Budget", "Preferred Contact", "Message", "Status", "Date"];
    const rows = filteredInquiries.map(i => [
      i.id, i.full_name, i.phone, i.email || "", i.inquiry_type === "franchise" ? "Franchise" : "Service", i.gender || "",
      i.service || "", i.budget || "", i.preferred_contact, i.message || "", i.status,
      i.created_at ? new Date(i.created_at).toLocaleString("en-IN") : "",
    ]);
    const BOM = "﻿";
    const csv = BOM + [h, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `bella-guy-inquiries-${today}.csv`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  function pdfInquiries() {
    const doc = new jsPDF();
    const W = doc.internal.pageSize.getWidth();
    const dateStr = new Date().toLocaleDateString("en-IN", { day:"2-digit", month:"long", year:"numeric" });

    pdfHeader(doc, "Inquiries Report", dateStr);

    const converted = filteredInquiries.filter(i => i.status === "Converted to Booking").length;
    const newCount  = filteredInquiries.filter(i => i.status === "New").length;
    const bw = (W - 28) / 3;
    pdfStatBox(doc, 14,        48, bw - 3, "Total Inquiries", String(filteredInquiries.length));
    pdfStatBox(doc, 14 + bw,   48, bw - 3, "New",             String(newCount));
    pdfStatBox(doc, 14 + bw*2, 48, bw - 3, "Converted",       String(converted), true);

    autoTable(doc, {
      startY: 70,
      head: [["#", "Name", "Phone", "Service / Budget", "Preferred", "Status", "Date"]],
      body: filteredInquiries.map((i, idx) => [
        idx + 1, i.full_name, i.phone,
        i.inquiry_type === "franchise" ? `Franchise · ${i.budget || "—"}` : (i.service || "—"),
        i.preferred_contact, i.status,
        i.created_at ? new Date(i.created_at).toLocaleDateString("en-IN") : "—",
      ]),
      headStyles: { fillColor: [30, 25, 10], textColor: [201, 168, 76], fontSize: 8, fontStyle: "bold", cellPadding: 4 },
      bodyStyles: { fontSize: 8, textColor: [40, 35, 25], cellPadding: 3.5 },
      alternateRowStyles: { fillColor: [252, 250, 244] },
      styles: { lineColor: [230, 220, 200], lineWidth: 0.2 },
      columnStyles: { 0: { cellWidth: 8, halign: "center" } },
      didDrawPage: () => pdfFooter(doc),
    });

    doc.save(`bella-guy-inquiries-${today}.pdf`);
  }

  function sendWA(phone: string, msg: string) {
    let cleaned = phone.replace(/[\s\-\(\)\+]/g, "");
    if (cleaned.startsWith("91") && cleaned.length > 10) cleaned = cleaned.slice(2);
    if (cleaned.length < 10) return;
    const fullPhone = `91${cleaned}`;
    const url = msg
      ? `https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/${fullPhone}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  if (loading) return (
    <div className="ls"><style>{CSS}</style>
      <div className="lsp" />
      <div style={{ color: "#444", fontSize: 13 }}>Loading Bella & Guy Admin…</div>
    </div>
  );

  const NAV: [Tab, React.ReactNode, string, number][] = [
    ["dashboard", <LayoutDashboard size={16} />, "Dashboard", bookings.length],
    ["bookings",  <CalendarDays size={16} />,    "Appointments", bookings.length],
    ["revenue",   <TrendingUp size={16} />,      "Revenue", 0],
    ["staff",     <Users size={16} />,           "Staff", staffs.length],
    ["contacts",  <MessageSquare size={16} />,   "Messages", contacts.length],
    ["inquiries", <Inbox size={16} />,           "Inquiries", inquiries.filter(i => i.status === "New").length],
    ["customers", <UserCheck size={16} />,       "Customers", 0],
    ["services",  <Scissors size={16} />,        "Services", 0],
    ["homepage",  <Home size={16} />,            "Homepage", 0],
    ["settings",  <SettingsIcon size={16} />,    "Settings", 0],
    ["backup",    <Database size={16} />,         "Backup", 0],
    ["logs",      <Activity size={16} />,         "Activity", activityLogs.length],
  ];

  return (
    <>
      <style>{CSS}</style>
      <div className="adm">

        {/* SIDEBAR */}
        <div className={`sb-overlay${sidebarOpen ? " vis" : ""}`} onClick={() => setSidebarOpen(false)} />
        <aside className={`sb${sidebarOpen ? " sb-open" : ""}`}>
          <button className="sb-close-btn" onClick={() => setSidebarOpen(false)}><X size={16}/> Close</button>
          <div className="sb-logo">
            <div className="sb-icon"><img src="/images/logo.png" alt="Bella & Guy" /></div>
            <div><div className="sb-title">Bella & Guy</div><div className="sb-sub">Admin Panel</div></div>
          </div>
          <nav className="sb-nav">
            <div className="nav-label">Navigation</div>
            {NAV.map(([tab, icon, label, count]) => (
              <button key={tab} className={`ni ${activeTab === tab ? "on" : ""}`} onClick={() => {
                // These edit modals aren't scoped to the tab that opened them (they
                // render unconditionally on their own form state), so switching tabs
                // while one is open used to leave it floating over the new tab's
                // content — close everything on every tab switch.
                setSvcCatForm(null); setSvcForm(null);
                setFeatureForm(null); setTestimonialForm(null); setGalleryForm(null); setFaqForm(null);
                setActiveCustomer(null); setConfirmModal(null);
                setActiveTab(tab); setSidebarOpen(false);
              }}>
                <span style={{ display:"flex", alignItems:"center", opacity: activeTab === tab ? 1 : 0.5 }}>{icon}</span>
                <span style={{ flex: 1 }}>{label}</span>
                {count > 0 && <span className="ni-badge">{count}</span>}
              </button>
            ))}
          </nav>
          {isAdmin && (
            <div className="sb-foot">
              <div className="nav-label">Export</div>
              <button className="sb-btn sb-sec" onClick={pdfAppointments} style={{display:"inline-flex",alignItems:"center",gap:6}}><CalendarDays size={13}/>Appointments PDF</button>
              <button className="sb-btn sb-sec" onClick={pdfRevenue} style={{display:"inline-flex",alignItems:"center",gap:6}}><TrendingUp size={13}/>Revenue PDF</button>
              <button className="sb-btn sb-sec" onClick={pdfStaff} style={{display:"inline-flex",alignItems:"center",gap:6}}><Users size={13}/>Staff PDF</button>
              <button className="sb-btn sb-sec" onClick={csvExport} style={{display:"inline-flex",alignItems:"center",gap:6}}><Download size={13}/>Export CSV</button>
              <button className="sb-btn sb-red" style={{display:"inline-flex",alignItems:"center",gap:6}} onClick={() => showConfirm("Logout", "Are you sure you want to log out from the admin panel?", async () => { setConfirmModal(null); document.cookie="bg_role=;path=/;max-age=0;SameSite=Strict"; await supabase.auth.signOut(); router.push("/login"); }, { confirmLabel: "Logout", icon: <LogOut size={22}/>, danger: true })}><LogOut size={13}/>Logout</button>
            </div>
          )}
          {!isAdmin && (
            <div className="sb-foot">
              <button className="sb-btn sb-red" style={{display:"inline-flex",alignItems:"center",gap:6}} onClick={() => showConfirm("Logout", "Are you sure you want to logout?", async () => { setConfirmModal(null); document.cookie="bg_role=;path=/;max-age=0;SameSite=Strict"; await supabase.auth.signOut(); router.push("/login"); }, { confirmLabel: "Logout", icon: <LogOut size={22}/>, danger: true })}><LogOut size={13}/>Logout</button>
            </div>
          )}
        </aside>

        {/* MAIN */}
        <div className="mc">
          <div className="topbar">
            <button className="mob-menu-btn" onClick={() => setSidebarOpen(true)}><Menu size={18}/></button>
            <div style={{ flex: 1 }}>
              <div className="tb-title">
                { activeTab === "dashboard" ? "Dashboard" : activeTab === "bookings" ? "Appointments" : activeTab === "revenue" ? "Revenue Analytics" : activeTab === "staff" ? "Staff Management" : activeTab === "contacts" ? "Messages" : activeTab === "inquiries" ? "Inquiries" : activeTab === "customers" ? "Customers" : activeTab === "services" ? "Services" : activeTab === "homepage" ? "Homepage" : activeTab === "settings" ? "Settings" : activeTab === "backup" ? "Backup" : "Activity Log" }
              </div>
              <div className="tb-sub">
                {new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              {currentStaff && <span className="tb-user-info" style={{ fontSize: 11, color: "#484848" }}>Logged in as <strong style={{ color: "#c9a84c" }}>{currentStaff.name}</strong></span>}
              <div className="live-pill"><div className="live-dot" /> Live</div>
            </div>
          </div>

          <div className="pb">
            {notification && <div className="toast">{notification}</div>}

            {/* ── DASHBOARD TAB ── */}
            {activeTab === "dashboard" && (<>

              {/* Security Alert Banner */}
              {secEvents.length > 0 && (
                <div style={{ background:"rgba(245,101,101,0.07)", border:"1px solid rgba(245,101,101,0.25)", borderRadius:14, padding:"14px 18px", marginBottom:18, display:"flex", alignItems:"flex-start", gap:14 }}>
                  <span style={{ flexShrink:0, color:"#f87171" }}><AlertCircle size={22}/></span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:"#f87171", marginBottom:4 }}>Security Alert — Failed Login Attempts Detected</div>
                    <div style={{ fontSize:12, color:"rgba(248,113,113,0.7)", marginBottom:8 }}>
                      {secEvents.length} lockout event{secEvents.length > 1 ? "s" : ""} in the last 24 hours. Someone entered wrong passwords repeatedly.
                    </div>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                      {secEvents.slice(0,5).map((e, i) => (
                        <span key={i} style={{ background:"rgba(245,101,101,0.1)", border:"1px solid rgba(245,101,101,0.2)", borderRadius:6, padding:"3px 9px", fontSize:11, color:"#f87171" }}>
                          {new Date(e.created_at).toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit" })} · locked {Math.round(e.locked_for_seconds / 60)}min
                        </span>
                      ))}
                    </div>
                  </div>
                  <button onClick={() => setSecEvents([])} style={{ background:"none", border:"none", color:"rgba(248,113,113,0.4)", cursor:"pointer", flexShrink:0, padding:0, display:"flex" }}><X size={18}/></button>
                </div>
              )}

              <div className="sg">
                {[
                  { lbl: "Total Bookings",  val: bookings.length,        color: "#c9a84c", sub: "all time" },
                  { lbl: "Today",           val: bookings.filter(b=>b.booking_date===today).length, color: "#c4a4ff", sub: `₹${todayRevenue.toLocaleString()} today` },
                  { lbl: "Pending",         val: bookings.filter(b=>b.status==="Pending").length, color: "#f5c75a", sub: "needs action" },
                  { lbl: "Confirmed",       val: bookings.filter(b=>b.status==="Confirmed").length, color: "#5ab4f5", sub: "upcoming" },
                  { lbl: "Completed",       val: completedCnt,           color: "#4fd080", sub: "served" },
                  { lbl: "Cancelled",       val: bookings.filter(b=>b.status==="Cancelled").length, color: "#f56565", sub: "" },
                  { lbl: "Total Customers", val: new Set(bookings.map(b=>b.phone)).size, color: "#f5a623", sub: "unique" },
                  { lbl: "Home Services",   val: bookings.filter(b=>b.address).length, color: "#22c55e", sub: "doorstep" },
                  { lbl: "Total Revenue",   val: `₹${totalRevenue.toLocaleString()}`, color: "#00d26a", sub: "excl. cancelled" },
                  { lbl: "This Month",      val: `₹${monthRevenue.toLocaleString()}`, color: "#00bfff", sub: new Date().toLocaleString("default",{month:"long"}) },
                  { lbl: "Avg / Booking",   val: `₹${avgBooking.toLocaleString()}`, color: "#e879f9", sub: "completed only" },
                  { lbl: "Messages",        val: contacts.length,        color: "#fb923c", sub: "from website" },
                ].map((s,i) => (
                  <div key={i} className="sc" style={{ animationDelay: `${i*0.04}s` }}>
                    <div className="sc-lbl">{s.lbl}</div>
                    <div className="sc-val" style={{ color: s.color }}>{s.val}</div>
                    {s.sub && <div className="sc-sub">{s.sub}</div>}
                  </div>
                ))}
              </div>

              {/* Tomorrow reminder */}
              {tmrBookings.length > 0 && (
                <div className="tomorrow-box" style={{ marginBottom: 18 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#f5c75a", marginBottom: 10 }}>
                    <span style={{display:"inline-flex",alignItems:"center",gap:6}}><CalendarDays size={14}/>{tmrBookings.length} appointment{tmrBookings.length>1?"s":""} tomorrow</span>
                  </div>
                  <button className="btn bw" onClick={() => setShowReminderModal(true)}>
                    Send All Reminders via WhatsApp
                  </button>
                </div>
              )}

              {/* ── TODAY AT A GLANCE ── */}
              {(() => {
                const todayBookings = bookings.filter(b => b.booking_date === today);
                const todayCompleted = todayBookings.filter(b => b.status === "Completed");
                const todayPending = todayBookings.filter(b => b.status === "Pending" || !b.status);
                const todayConfirmed = todayBookings.filter(b => b.status === "Confirmed");
                const todayRevCalc = todayBookings.filter(b => b.status !== "Cancelled").reduce((s,b) => s + price(b), 0);
                const todayCancelledCnt = todayBookings.filter(b => b.status === "Cancelled").length;
                const todayAvg = todayCompleted.length ? Math.round(todayCompleted.reduce((s,b)=>s+price(b),0)/todayCompleted.length) : 0;

                // service breakdown for today
                const todaySvcMap: Record<string,number> = {};
                todayBookings.filter(b=>b.status!=="Cancelled").forEach(b => {
                  todaySvcMap[b.service] = (todaySvcMap[b.service]||0) + price(b);
                });
                const todaySvcs = Object.entries(todaySvcMap).sort((a,b)=>b[1]-a[1]);
                const todaySvcMax = todaySvcs[0]?.[1] || 1;

                const now = new Date();
                const nowMins = now.getHours()*60 + now.getMinutes();
                const parseMins = (t: string) => {
                  const [time, ampm] = t.split(" "); const [h,m] = time.split(":").map(Number);
                  return ((h%12) + (ampm==="PM"?12:0))*60 + (m||0);
                };

                return (
                  <div style={{ marginBottom: 18 }}>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <div style={{ width:3, height:18, borderRadius:99, background:"linear-gradient(180deg,#c9a84c,#f5c75a)" }} />
                        <span style={{ fontSize:14, fontWeight:700, color:"#fff", letterSpacing:"0.01em" }}>Today at a Glance</span>
                        <span style={{ fontSize:11, color:"#484848" }}>{new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long"})}</span>
                      </div>
                    </div>

                    {/* KPI row */}
                    <div className="today-kpi-grid" style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:10, marginBottom:14 }}>
                      {[
                        { lbl:"Revenue",   val:`₹${todayRevCalc.toLocaleString()}`, color:"#c9a84c",  icon:"₹" },
                        { lbl:"Bookings",  val:todayBookings.length,                color:"#c4a4ff",  icon:"📋" },
                        { lbl:"Completed", val:todayCompleted.length,               color:"#4fd080",  icon:"✓" },
                        { lbl:"Pending",   val:todayPending.length,                 color:"#f5c75a",  icon:"⏳" },
                        { lbl:"Avg Value", val:todayAvg?`₹${todayAvg.toLocaleString()}`:"—", color:"#e879f9", icon:"⌀" },
                      ].map((k,i) => (
                        <div key={i} style={{ background:"rgba(255,255,255,0.025)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:12, padding:"14px 16px" }}>
                          <div style={{ fontSize:10, color:"#484848", fontWeight:600, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:6 }}>{k.lbl}</div>
                          <div style={{ fontSize:22, fontWeight:800, color:k.color, lineHeight:1 }}>{k.val}</div>
                        </div>
                      ))}
                    </div>

                    <div className="today-main-grid" style={{ display:"grid", gridTemplateColumns:"1.7fr 1fr", gap:12 }}>
                      {/* Today's bookings table */}
                      <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.05)", borderRadius:14, overflow:"hidden" }}>
                        <div style={{ padding:"12px 16px", borderBottom:"1px solid rgba(255,255,255,0.05)", display:"flex", alignItems:"center", gap:8 }}>
                          <CalendarDays size={13} color="#c9a84c"/>
                          <span style={{ fontSize:13, fontWeight:600, color:"#ddd" }}>Today&rsquo;s Appointments</span>
                          {todayCancelledCnt > 0 && <span style={{ marginLeft:"auto", fontSize:10, color:"#f56565", background:"rgba(245,101,101,0.1)", padding:"2px 8px", borderRadius:20 }}>{todayCancelledCnt} cancelled</span>}
                        </div>
                        {todayBookings.length === 0
                          ? <div style={{ padding:"24px 16px", color:"#2a2a2a", fontSize:13 }}>No appointments today</div>
                          : <div style={{ maxHeight:260, overflowY:"auto" }}>
                              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                                <thead>
                                  <tr style={{ background:"rgba(255,255,255,0.03)" }}>
                                    {["#","Client","Service","Time","Price","Status"].map(h => (
                                      <th key={h} style={{ padding:"8px 12px", textAlign:"left", color:"#484848", fontWeight:600, fontSize:10, letterSpacing:"0.08em", textTransform:"uppercase", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>{h}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {todayBookings.sort((a,b) => {
                                    try { return parseMins(a.booking_time) - parseMins(b.booking_time); } catch { return 0; }
                                  }).map((b,i) => {
                                    const sc = STATUS_CONFIG[b.status] || STATUS_CONFIG["Pending"];
                                    const bMins = (() => { try { return parseMins(b.booking_time); } catch { return -1; } })();
                                    const isPast = bMins > 0 && bMins < nowMins && b.status !== "Completed";
                                    return (
                                      <tr key={b.id} style={{ borderBottom:"1px solid rgba(255,255,255,0.03)", opacity: b.status==="Cancelled"?0.45:1 }}>
                                        <td style={{ padding:"9px 12px", fontFamily:"monospace", fontSize:10, color:"#c9a84c", fontWeight:700 }}>BG-{String(b.id).padStart(5,"0")}</td>
                                        <td style={{ padding:"9px 12px", color:"#ccc", maxWidth:100, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{b.full_name}</td>
                                        <td style={{ padding:"9px 12px", color:"#999", maxWidth:120, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{b.service}</td>
                                        <td style={{ padding:"9px 12px", color: isPast ? "#f56565" : "#5ab4f5", fontWeight:600, whiteSpace:"nowrap" }}>{b.booking_time}</td>
                                        <td style={{ padding:"9px 12px", color:"#4fd080", fontWeight:600 }}>{b.status==="Cancelled"?"—":`₹${price(b).toLocaleString()}`}</td>
                                        <td style={{ padding:"9px 12px" }}>
                                          <span style={{ background:sc.bg, color:sc.text, padding:"3px 8px", borderRadius:20, fontSize:10, fontWeight:600, whiteSpace:"nowrap" }}>{b.status||"Pending"}</span>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                        }
                      </div>

                      {/* Today service revenue breakdown */}
                      <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.05)", borderRadius:14, padding:"12px 16px" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
                          <DollarSign size={13} color="#c9a84c"/>
                          <span style={{ fontSize:13, fontWeight:600, color:"#ddd" }}>Revenue by Service</span>
                        </div>
                        {todaySvcs.length === 0
                          ? <div style={{ color:"#2a2a2a", fontSize:13 }}>No revenue today</div>
                          : todaySvcs.map(([svc,rev]) => (
                              <div key={svc} style={{ marginBottom:12 }}>
                                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                                  <span style={{ fontSize:11, color:"#bbb", maxWidth:130, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{svc}</span>
                                  <span style={{ fontSize:11, color:"#c9a84c", fontWeight:700 }}>₹{rev.toLocaleString()}</span>
                                </div>
                                <div style={{ height:4, background:"rgba(255,255,255,0.05)", borderRadius:99 }}>
                                  <div style={{ height:"100%", width:`${Math.round((rev/todaySvcMax)*100)}%`, background:"linear-gradient(90deg,#c9a84c,#f5c75a)", borderRadius:99 }} />
                                </div>
                              </div>
                            ))
                        }

                        {/* Confirmed / pending status pills */}
                        <div style={{ marginTop:16, paddingTop:14, borderTop:"1px solid rgba(255,255,255,0.05)" }}>
                          <div style={{ fontSize:10, color:"#484848", fontWeight:600, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:10 }}>Status Breakdown</div>
                          {[
                            { lbl:"Confirmed", cnt:todayConfirmed.length, color:"#5ab4f5" },
                            { lbl:"Pending",   cnt:todayPending.length,   color:"#f5c75a" },
                            { lbl:"Completed", cnt:todayCompleted.length, color:"#4fd080" },
                            { lbl:"Cancelled", cnt:todayCancelledCnt,     color:"#f56565" },
                          ].filter(x=>x.cnt>0).map(x => (
                            <div key={x.lbl} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:7 }}>
                              <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                                <div style={{ width:7, height:7, borderRadius:"50%", background:x.color, flexShrink:0 }} />
                                <span style={{ fontSize:11, color:"#999" }}>{x.lbl}</span>
                              </div>
                              <span style={{ fontSize:12, fontWeight:700, color:x.color }}>{x.cnt}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="dash-2col-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
                <div className="card">
                  <div className="card-title" style={{display:"flex",alignItems:"center",gap:6}}><Trophy size={13}/>Top Services (All Time)</div>
                  {Object.entries(bookings.reduce((a,b) => { a[b.service]=(a[b.service]||0)+1; return a; }, {} as Record<string,number>)).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([s,c]) => (
                    <div key={s} className="rev-row">
                      <span style={{ fontSize: 12, color: "#bbb", flex: 1 }}>{s}</span>
                      <span style={{ fontSize: 11, color: "#484848", background: "rgba(255,255,255,0.04)", padding: "2px 8px", borderRadius: 20 }}>{c}×</span>
                    </div>
                  ))}
                </div>
                <div className="card">
                  <div className="card-title" style={{display:"flex",alignItems:"center",gap:6}}><Users size={13}/>Top Customers</div>
                  {Object.entries(bookings.reduce((a,b) => { a[b.full_name]=(a[b.full_name]||0)+1; return a; }, {} as Record<string,number>)).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([name,c]) => (
                    <div key={name} className="rev-row">
                      <span style={{ fontSize: 12, color: "#bbb", flex: 1 }}>{name}</span>
                      <span style={{ fontSize: 11, color: "#484848", background: "rgba(255,255,255,0.04)", padding: "2px 8px", borderRadius: 20 }}>{c} visit{c>1?"s":""}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card">
                <div className="card-title" style={{display:"flex",alignItems:"center",gap:6}}><TrendingUp size={13}/>Revenue — Last 12 Months</div>
                <div style={{ height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyChart} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                      <XAxis dataKey="name" tick={{ fill: "#484848", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "#484848", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v>=1000?`${Math.round(v/1000)}k`:v}`} />
                      <Tooltip formatter={(v: any) => [`₹${Number(v).toLocaleString()}`, "Revenue"]} contentStyle={{ background:"#0e0e1a", border:"1px solid rgba(201,168,76,0.2)", borderRadius:8, color:"#fff", fontSize:12 }} />
                      <Bar dataKey="Revenue" fill="#c9a84c" radius={[5,5,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>)}

            {/* ── BOOKINGS TAB ── */}
            {activeTab === "bookings" && (<>
              <div className="fb">
                <div className="si">
                  <span className="si-ic" style={{display:"flex",alignItems:"center"}}><Search size={14}/></span>
                  <input placeholder="Search name, phone, service…" value={search} onChange={e=>setSearch(e.target.value)} />
                </div>
                <div className="fb-btns">
                  {(["all","today","week","month"] as FilterType[]).map(f => (
                    <button key={f} className={`fb-btn ${filter===f?"on":""}`} onClick={()=>setFilter(f)}>
                      {f==="all"?"All":f==="today"?"Today":f==="week"?"This Week":"This Month"}
                    </button>
                  ))}
                </div>
                <div className="fb-divider" />
                <select
                  className={`type-sel ${typeFilter!=="all"?"active":""}`}
                  value={typeFilter}
                  onChange={e => setTypeFilter(e.target.value as TypeFilter)}
                >
                  <option value="all">All Types</option>
                  <option value="salon">🏪 At Salon</option>
                  <option value="home">🏠 Home Service</option>
                </select>
                {isAdmin && <button className="btn bg" onClick={pdfAppointments} style={{display:"inline-flex",alignItems:"center",gap:4}}><Download size={12}/>PDF</button>}
                {isAdmin && <button className="btn bg" onClick={csvExport} style={{display:"inline-flex",alignItems:"center",gap:4}}><Download size={12}/>CSV</button>}
              </div>

              <div className="tw">
                <table>
                  <thead><tr>
                    {["Booking #","Client","Phone","Service","Date","Time","Type","Status","Staff","Price","Actions"].map(h=><th key={h}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {filteredBookings.length === 0
                      ? <tr className="empty"><td colSpan={11}>No bookings found</td></tr>
                      : filteredBookings.map((b, i) => {
                          const sc = STATUS_CONFIG[b.status] || STATUS_CONFIG["Pending"];
                          const isCancelled = b.status === "Cancelled";
                          return (
                            <tr key={b.id} style={isCancelled ? { opacity: 0.45, background: "rgba(245,101,101,0.03)", boxShadow: "inset 3px 0 0 rgba(245,101,101,0.5)" } : {}}>
                              <td style={{ color:"#c9a84c",fontSize:10,fontFamily:"monospace",fontWeight:600,whiteSpace:"nowrap" }}>BG-{String(b.id).padStart(5,"0")}</td>
                              <td style={{ whiteSpace:"nowrap" }}><div className="nc"><div className="av">{(b.full_name||"?")[0].toUpperCase()}</div><span style={{ fontWeight:500,color:"#eee" }}>{b.full_name}</span></div></td>
                              <td style={{ fontFamily:"monospace",fontSize:11,color:"#484848",whiteSpace:"nowrap" }}>{b.phone}</td>
                              <td style={{ maxWidth:160 }}>{b.service}</td>
                              <td style={{ color:"#c9a84c",fontFamily:"monospace",fontSize:11,whiteSpace:"nowrap" }}>{b.booking_date}</td>
                              <td style={{ fontFamily:"monospace",fontSize:11,whiteSpace:"nowrap" }}>{b.booking_time}</td>
                              <td><span style={{ fontSize:10,padding:"3px 8px",borderRadius:20,background: b.address?"rgba(34,197,94,0.12)":"rgba(90,130,245,0.12)",color: b.address?"#22c55e":"#7ba8ff" }}>{b.address?"Home":"Salon"}</span></td>
                              <td>
                                <div className="sw">
                                  <span className="sd" style={{ background: sc.dot }} />
                                  <select value={b.status||"Pending"} onChange={e => {
                                    const v = e.target.value;
                                    if (v === "Cancelled") {
                                      cancelBooking(b);
                                    } else if (b.status === "Cancelled") {
                                      showConfirm(
                                        "Restore Booking",
                                        `Re-activate ${b.full_name}'s ${b.service} appointment and set status to "${v}"?`,
                                        async () => { setConfirmModal(null); updateStatus(b.id, v); },
                                        { confirmLabel: "Yes, Restore", icon: <RefreshCw size={22}/>, danger: false }
                                      );
                                    } else {
                                      updateStatus(b.id, v);
                                    }
                                  }} className="ss" style={{ background:sc.bg,color:sc.text }}>
                                    {Object.keys(STATUS_CONFIG).map(s=><option key={s}>{s}</option>)}
                                  </select>
                                </div>
                              </td>
                              <td>
                                {isCancelled
                                  ? <span style={{ fontSize:12,color:"#3a3a3a" }}>{b.staff||"—"}</span>
                                  : isAdmin
                                    ? <select value={b.staff||""} onChange={e=>assignStaff(b.id,e.target.value)} className="stf">
                                        <option value="">Assign</option>
                                        {staffs.length>0 ? staffs.map(s=><option key={s.id} value={s.name}>{s.name}</option>) : ["Sana","Pooja","Riya","Arjun"].map(n=><option key={n}>{n}</option>)}
                                      </select>
                                    : <span style={{ fontSize:12,color:"#bbb" }}>{b.staff||"—"}</span>
                                }
                              </td>
                              <td style={{ color:"#4fd080",fontWeight:600,fontSize:12 }}>{price(b)?`₹${price(b).toLocaleString()}`:"—"}</td>
                              <td style={{ whiteSpace:"nowrap" }}>
                                <div className="aw">
                                  <div className="aw-row">
                                    <button className="btn bv" onClick={()=>setSelectedBooking(b)} style={{display:"inline-flex",alignItems:"center",gap:4}}><Eye size={12}/>View</button>
                                    {!isCancelled && <button className="btn bc" onClick={()=>{updateStatus(b.id,"Confirmed");sendWA(b.phone,`Hello ${b.full_name}, your appointment is confirmed ✅\n\nService: ${b.service}\n📅 ${b.booking_date} at ⏰ ${b.booking_time}\n\nBella & Guy Salon`);}} style={{display:"inline-flex",alignItems:"center",gap:4}}><Check size={12}/>Confirm</button>}
                                    {!isCancelled && <button className="btn bw" onClick={()=>sendWA(b.phone,"")} style={{display:"inline-flex",alignItems:"center",gap:4}}><MessageCircle size={12}/>WA</button>}
                                  </div>
                                  <div className="aw-row">
                                    {!isCancelled && <button className="btn br" title="Reschedule" onClick={()=>{const nd=prompt("New date (YYYY-MM-DD)");const nt=prompt("New time (HH:MM)");if(!nd||!nt)return;supabase.from("appointments").update({booking_date:nd,booking_time:nt}).eq("id",b.id).then(()=>{fetchBookings(currentStaff);sendWA(b.phone,`Hello ${b.full_name}, your appointment has been rescheduled.\n\nNew Date: ${nd}\nNew Time: ${nt}\n\nBella & Guy Salon`);sendEmailNotification("rescheduled",{...b,new_date:nd,new_time:nt});});}} style={{display:"inline-flex",alignItems:"center",gap:4}}><CalendarClock size={12}/>Reschedule</button>}
                                    {isAdmin && <button className="btn bd" title="Delete" onClick={()=>deleteBooking(b.id)} style={{display:"inline-flex",alignItems:"center",justifyContent:"center"}}><Trash2 size={12}/></button>}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                    }
                  </tbody>
                </table>
              </div>
            </>)}

            {/* ── REVENUE TAB ── */}
            {activeTab === "revenue" && (<>
              <div className="kpi-row">
                {[
                  { lbl: "Total Revenue",    val: `₹${totalRevenue.toLocaleString()}`,   color: "#4fd080",  sub: "all time (excl. cancelled)" },
                  { lbl: "This Month",       val: `₹${monthRevenue.toLocaleString()}`,   color: "#00bfff",  sub: new Date().toLocaleString("default",{month:"long",year:"numeric"}) },
                  { lbl: "Today",            val: `₹${todayRevenue.toLocaleString()}`,   color: "#c9a84c",  sub: new Date().toLocaleDateString("en-IN") },
                  { lbl: "Avg / Booking",    val: `₹${avgBooking.toLocaleString()}`,     color: "#e879f9",  sub: `from ${completedCnt} completed` },
                  { lbl: "Total Bookings",   val: bookings.length,                        color: "#f5a623",  sub: "all time" },
                  { lbl: "Completed",        val: completedCnt,                           color: "#4fd080",  sub: `${bookings.length?Math.round(completedCnt/bookings.length*100):0}% rate` },
                ].map((k,i) => (
                  <div key={i} className="kpi">
                    <div className="kpi-lbl">{k.lbl}</div>
                    <div className="kpi-val" style={{ color: k.color }}>{k.val}</div>
                    <div className="kpi-sub">{k.sub}</div>
                  </div>
                ))}
              </div>

              <div className="card">
                <div className="card-title" style={{display:"flex",alignItems:"center",gap:6}}><BarChart2 size={13}/>Monthly Revenue — Last 12 Months</div>
                <div style={{ height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyChart} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                      <XAxis dataKey="name" tick={{ fill:"#484848",fontSize:11 }} axisLine={false} tickLine={false} />
                      <YAxis yAxisId="rev" tick={{ fill:"#484848",fontSize:10 }} axisLine={false} tickLine={false} tickFormatter={v=>`₹${v>=1000?`${Math.round(v/1000)}k`:v}`} />
                      <YAxis yAxisId="cnt" orientation="right" tick={{ fill:"#484848",fontSize:10 }} axisLine={false} tickLine={false} />
                      <Tooltip formatter={(v:any, n:any) => [n==="Revenue"?`₹${Number(v).toLocaleString()}`:v, n]} contentStyle={{ background:"#0e0e1a",border:"1px solid rgba(201,168,76,0.2)",borderRadius:8,color:"#fff",fontSize:12 }} />
                      <Legend wrapperStyle={{ fontSize:11,color:"#484848" }} />
                      <Line yAxisId="rev" type="monotone" dataKey="Revenue" stroke="#c9a84c" strokeWidth={2} dot={{ fill:"#c9a84c",r:3 }} activeDot={{ r:5 }} />
                      <Line yAxisId="cnt" type="monotone" dataKey="Bookings" stroke="#5ab4f5" strokeWidth={2} dot={{ fill:"#5ab4f5",r:3 }} activeDot={{ r:5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rev-2col-grid" style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:16 }}>
                <div className="card">
                  <div className="card-title" style={{display:"flex",alignItems:"center",gap:6}}><DollarSign size={13}/>Revenue by Service</div>
                  {serviceRevenue.length === 0
                    ? <div style={{ color:"#2a2a2a",fontSize:13 }}>No data yet</div>
                    : serviceRevenue.map(([s, r]) => (
                      <div key={s} className="rev-row">
                        <span style={{ fontSize:11,color:"#bbb",flex:1,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",paddingRight:8 }}>{s}</span>
                        <div className="rev-bar-wrap"><div className="rev-bar" style={{ width:`${(r/maxServiceRev)*100}%` }} /></div>
                        <span style={{ fontSize:11,color:"#4fd080",fontWeight:600,flexShrink:0 }}>₹{r.toLocaleString()}</span>
                      </div>
                    ))
                  }
                </div>

                <div className="card">
                  <div className="card-title" style={{display:"flex",alignItems:"center",gap:6}}><Users size={13}/>Revenue by Staff</div>
                  {staffPerformance.length === 0
                    ? <div style={{ color:"#2a2a2a",fontSize:13 }}>No assigned bookings yet</div>
                    : staffPerformance.sort((a,b)=>b.revenue-a.revenue).map(s => (
                      <div key={s.id} className="rev-row">
                        <div>
                          <div style={{ fontSize:13,color:"#eee",fontWeight:500 }}>{s.name}</div>
                          <div style={{ fontSize:10,color:"#484848" }}>{s.total} bookings</div>
                        </div>
                        <div style={{ textAlign:"right" }}>
                          <div style={{ fontSize:13,color:"#4fd080",fontWeight:700 }}>₹{s.revenue.toLocaleString()}</div>
                          <div style={{ fontSize:10,color:"#484848" }}>avg ₹{s.avg.toLocaleString()}</div>
                        </div>
                      </div>
                    ))
                  }
                </div>
              </div>

              {isAdmin && (
                <div style={{ display:"flex",gap:10,flexWrap:"wrap" }}>
                  <button className="btn bg" onClick={pdfRevenue} style={{display:"inline-flex",alignItems:"center",gap:6}}><FileText size={13}/>Export Revenue PDF</button>
                  <button className="btn bg" onClick={csvExport} style={{display:"inline-flex",alignItems:"center",gap:6}}><Download size={13}/>Export CSV</button>
                </div>
              )}
            </>)}

            {/* ── STAFF TAB ── */}
            {activeTab === "staff" && (<>
              <div className="staff-grid">
                {staffPerformance.length === 0
                  ? <div style={{ color:"#2a2a2a",fontSize:13 }}>No active staff found. Add staff in the Supabase staff table.</div>
                  : staffPerformance.map(s => (
                    <div key={s.id} className="staff-card">
                      <div className="staff-av">{s.name[0]}</div>
                      <div className="staff-name">{s.name}</div>
                      <div className="staff-role">{s.role}</div>
                      {[
                        ["Total Bookings", s.total, "#c9a84c"],
                        ["Completed",      s.done,  "#4fd080"],
                        ["Revenue",        `₹${s.revenue.toLocaleString()}`, "#00d26a"],
                        ["Avg / Booking",  `₹${s.avg.toLocaleString()}`,     "#e879f9"],
                        ["Top Service",    s.topService, "#5ab4f5"],
                      ].map(([k,v,c]) => (
                        <div key={k as string} className="staff-stat">
                          <span className="staff-stat-k">{k}</span>
                          <span className="staff-stat-v" style={{ color: c as string }}>{v}</span>
                        </div>
                      ))}
                    </div>
                  ))
                }
              </div>

              {/* Staff bookings table */}
              <div className="card" style={{ marginTop:4 }}>
                <div className="card-title" style={{display:"flex",alignItems:"center",gap:7}}><Users size={14}/>All Staff Assignments</div>
                <div className="tw">
                  <table>
                    <thead><tr>
                      {["Client","Service","Date","Time","Status","Staff"].map(h=><th key={h}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {bookings.filter(b=>b.staff).length === 0
                        ? <tr className="empty"><td colSpan={6}>No assigned bookings yet</td></tr>
                        : bookings.filter(b=>b.staff).map(b => {
                            const sc = STATUS_CONFIG[b.status] || STATUS_CONFIG["Pending"];
                            return (
                              <tr key={b.id}>
                                <td><div className="nc"><div className="av">{(b.full_name||"?")[0].toUpperCase()}</div><span>{b.full_name}</span></div></td>
                                <td>{b.service}</td>
                                <td style={{ color:"#c9a84c",fontFamily:"monospace",fontSize:11 }}>{b.booking_date}</td>
                                <td style={{ fontFamily:"monospace",fontSize:11 }}>{b.booking_time}</td>
                                <td><div className="sw"><span className="sd" style={{ background:sc.dot }} /><span className="ss" style={{ background:sc.bg,color:sc.text,paddingLeft:22 }}>{b.status}</span></div></td>
                                <td style={{ color:"#c9a84c",fontWeight:500 }}>{b.staff}</td>
                              </tr>
                            );
                          })
                      }
                    </tbody>
                  </table>
                </div>
              </div>

              {isAdmin && (
                <div style={{ marginTop:14 }}>
                  <button className="btn bg" onClick={pdfStaff} style={{display:"inline-flex",alignItems:"center",gap:6}}><FileText size={13}/>Export Staff PDF</button>
                </div>
              )}
            </>)}

            {/* ── CONTACTS TAB ── */}
            {activeTab === "contacts" && (
              <div className="tw">
                <table>
                  <thead><tr>{["Name","Phone","Message","Actions"].map(h=><th key={h}>{h}</th>)}</tr></thead>
                  <tbody>
                    {contacts.length === 0
                      ? <tr className="empty"><td colSpan={4}>No messages yet</td></tr>
                      : contacts.map(c => (
                        <tr key={c.id}>
                          <td><div className="nc"><div className="av">{(c.name||"?")[0].toUpperCase()}</div><span style={{ fontWeight:500,color:"#eee" }}>{c.name}</span></div></td>
                          <td style={{ fontFamily:"monospace",fontSize:11,color:"#484848" }}>{c.phone}</td>
                          <td style={{ color:"#888",maxWidth:340 }}>{c.message}</td>
                          <td>
                            <div className="aw">
                              <button className="btn bw" onClick={()=>sendWA(c.phone,"")}>WhatsApp</button>
                              {isAdmin && <button className="btn bd" onClick={()=>deleteContact(c.id)}>Delete</button>}
                            </div>
                          </td>
                        </tr>
                      ))
                    }
                  </tbody>
                </table>
              </div>
            )}

            {/* ── INQUIRIES TAB ── */}
            {activeTab === "inquiries" && (<>
              <div className="fb">
                <div className="si">
                  <span className="si-ic" style={{display:"flex",alignItems:"center"}}><Search size={14}/></span>
                  <input placeholder="Search name, phone, service…" value={inquirySearch} onChange={e=>setInquirySearch(e.target.value)} />
                </div>
                <select
                  className={`type-sel ${inquiryStatusFilter!=="all"?"active":""}`}
                  value={inquiryStatusFilter}
                  onChange={e => setInquiryStatusFilter(e.target.value)}
                >
                  <option value="all">All Statuses</option>
                  {INQUIRY_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                {isAdmin && <button className="btn bg" onClick={pdfInquiries} style={{display:"inline-flex",alignItems:"center",gap:4}}><Download size={12}/>PDF</button>}
                {isAdmin && <button className="btn bg" onClick={csvExportInquiries} style={{display:"inline-flex",alignItems:"center",gap:4}}><Download size={12}/>CSV</button>}
              </div>

              <div className="tw">
                <table>
                  <thead><tr>
                    {["ID","Client","Phone","Email","Service","Preferred","Message","Status","Date","Actions"].map(h=><th key={h}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {filteredInquiries.length === 0
                      ? <tr className="empty"><td colSpan={10}>No inquiries found</td></tr>
                      : filteredInquiries.map(i => {
                          const sc = INQUIRY_STATUS_CONFIG[i.status] || INQUIRY_STATUS_CONFIG["New"];
                          return (
                            <tr key={i.id}>
                              <td style={{ color:"#c9a84c",fontSize:10,fontFamily:"monospace",fontWeight:600,whiteSpace:"nowrap" }}>INQ-{String(i.id).padStart(5,"0")}</td>
                              <td style={{ whiteSpace:"nowrap" }}><div className="nc"><div className="av">{(i.full_name||"?")[0].toUpperCase()}</div><span style={{ fontWeight:500,color:"#eee" }}>{i.full_name}</span></div></td>
                              <td style={{ fontFamily:"monospace",fontSize:11,color:"#484848",whiteSpace:"nowrap" }}>{i.phone}</td>
                              <td style={{ fontSize:11,color:"#484848" }}>{i.email || "—"}</td>
                              <td style={{ maxWidth:160,fontSize:12 }}>
                                {i.inquiry_type === "franchise"
                                  ? <span style={{ fontWeight:700,color:"#c9a84c" }}>💰 Franchise · {i.budget || "—"}</span>
                                  : (i.service || "General")}
                              </td>
                              <td style={{ fontSize:11 }}>{i.preferred_contact}</td>
                              <td style={{ color:"#888",maxWidth:220 }} title={i.message || ""}>{i.message || "—"}</td>
                              <td>
                                <div className="sw">
                                  <span className="sd" style={{ background: sc.dot }} />
                                  <select value={i.status||"New"} onChange={e => updateInquiryStatus(i.id, e.target.value)} className="ss" style={{ background:sc.bg,color:sc.text }}>
                                    {INQUIRY_STATUSES.map(s=><option key={s}>{s}</option>)}
                                  </select>
                                </div>
                              </td>
                              <td style={{ fontFamily:"monospace",fontSize:10.5,color:"#484848",whiteSpace:"nowrap" }}>{i.created_at ? new Date(i.created_at).toLocaleString("en-IN", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" }) : "—"}</td>
                              <td style={{ whiteSpace:"nowrap" }}>
                                <div className="aw">
                                  <a className="btn bv" href={`tel:+91${i.phone}`} style={{display:"inline-flex",alignItems:"center",gap:4,textDecoration:"none"}}><PhoneIcon size={12}/>Call</a>
                                  <button className="btn bw" onClick={()=>sendWA(i.phone,`Hi ${i.full_name}, thanks for your inquiry with Bella & Guy Salon${i.service?` about ${i.service}`:""}! How can we help?`)} style={{display:"inline-flex",alignItems:"center",gap:4}}><MessageCircle size={12}/>WA</button>
                                  {isAdmin && <button className="btn bd" title="Delete" onClick={()=>deleteInquiry(i.id)} style={{display:"inline-flex",alignItems:"center",justifyContent:"center"}}><Trash2 size={12}/></button>}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                    }
                  </tbody>
                </table>
              </div>
            </>)}

            {/* ── CUSTOMERS TAB ── */}
            {activeTab === "customers" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {customerMetaMissing && (
                  <div style={{ background: "rgba(245,101,101,0.1)", border: "1px solid rgba(245,101,101,0.3)", borderRadius: 10, padding: "10px 14px", fontSize: 12.5, color: "#f87171" }}>
                    Notes, tags and blacklist need one more table. Run <strong>supabase/customers.sql</strong> in the Supabase SQL Editor to enable them — the customer list below already works without it.
                  </div>
                )}
                <div className="fb">
                  <div className="si">
                    <Search size={14} className="si-ic" />
                    <input value={customerSearch} onChange={e => setCustomerSearch(e.target.value)} placeholder="Search name, phone, email…" />
                  </div>
                </div>
                <div className="tw">
                  <table>
                    <thead>
                      <tr>
                        <th>Customer</th><th>Bookings</th><th>Lifetime Value</th><th>Last Visit</th><th>Favourite Service</th><th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCustomers.length === 0 ? (
                        <tr className="empty"><td colSpan={6}>No customers yet — they'll show up here after their first booking or inquiry.</td></tr>
                      ) : filteredCustomers.map(c => (
                        <tr key={c.phone} style={{ cursor: "pointer" }} onClick={() => { setActiveCustomer(c.phone); setCustomerNotesDraft(c.notes); setCustomerTagsDraft(c.tags.join(", ")); setCustomerError(""); }}>
                          <td>
                            <div className="nc">
                              <div className="av">{c.name.slice(0, 2).toUpperCase()}</div>
                              <div>
                                <div style={{ fontWeight: 600 }}>{c.name}</div>
                                <div style={{ fontSize: 11, color: "#666" }}>{c.phone}</div>
                              </div>
                            </div>
                          </td>
                          <td>{c.totalBookings}</td>
                          <td>₹{c.lifetimeValue.toLocaleString()}</td>
                          <td>{c.lastVisit ? new Date(c.lastVisit + "T00:00:00").toLocaleDateString("en-IN") : "—"}</td>
                          <td>{c.favouriteService}</td>
                          <td>{c.blacklisted ? <span style={{ color: "#f56565", fontWeight: 600 }}>Blacklisted</span> : <span style={{ color: "#4fd080" }}>Active</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── Customer detail modal ── */}
            {activeCustomer && (() => {
              const c = customerProfiles.find(p => p.phone === activeCustomer);
              if (!c) return null;
              return (
                <Modal
                  width={520}
                  onClose={() => setActiveCustomer(null)}
                  title={
                    <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span>{c.name}</span>
                      {c.blacklisted && <span style={{ color: "#f56565", fontSize: 11, fontWeight: 700 }}>BLACKLISTED</span>}
                    </span>
                  }
                >
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      <div style={{ display: "flex", gap: 16, fontSize: 12.5, color: "#999", flexWrap: "wrap" }}>
                        <span><PhoneIcon size={11} style={{ verticalAlign: -1, marginRight: 4 }} />{c.phone}</span>
                        {c.email && <span><Mail size={11} style={{ verticalAlign: -1, marginRight: 4 }} />{c.email}</span>}
                      </div>
                      <div className="sg" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
                        <div className="sc"><div className="sc-lbl">Bookings</div><div className="sc-val" style={{ color: "#5ab4f5" }}>{c.totalBookings}</div></div>
                        <div className="sc"><div className="sc-lbl">Lifetime Value</div><div className="sc-val" style={{ color: "#c9a84c" }}>₹{c.lifetimeValue.toLocaleString()}</div></div>
                        <div className="sc"><div className="sc-lbl">Inquiries</div><div className="sc-val" style={{ color: "#e88c50" }}>{c.inquiries.length}</div></div>
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: 10.5, color: "#666", marginBottom: 4 }}>Notes (staff-only)</label>
                        <textarea value={customerNotesDraft} onChange={e => setCustomerNotesDraft(e.target.value)} rows={3}
                          style={{ width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "9px 12px", color: "#eee", fontSize: 13, fontFamily: "inherit", resize: "vertical" }} />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: 10.5, color: "#666", marginBottom: 4 }}><TagIcon size={11} style={{ verticalAlign: -1, marginRight: 3 }} />Tags (comma-separated)</label>
                        <input type="text" value={customerTagsDraft} placeholder="VIP, Bridal, Referral" onChange={e => setCustomerTagsDraft(e.target.value)}
                          style={{ width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "9px 12px", color: "#eee", fontSize: 13 }} />
                      </div>
                      {customerError && <div style={{ color: "#f56565", fontSize: 12 }}>{customerError}</div>}
                      <div style={{ display: "flex", gap: 8 }}>
                        <button className="btn bg" disabled={customerSaving} style={{ flex: 1, padding: "9px 0" }}
                          onClick={() => saveCustomerMeta(c.phone, { notes: customerNotesDraft, tags: customerTagsDraft.split(",").map(t => t.trim()).filter(Boolean) })}>
                          {customerSaving ? "Saving…" : "Save Notes & Tags"}
                        </button>
                        <button className={c.blacklisted ? "btn bc" : "btn bx"} disabled={customerSaving}
                          onClick={() => saveCustomerMeta(c.phone, { blacklisted: !c.blacklisted })}>
                          {c.blacklisted ? "Remove from Blacklist" : "Blacklist"}
                        </button>
                      </div>

                      <div>
                        <div className="card-title" style={{ marginTop: 6 }}>Booking History</div>
                        {c.bookings.length === 0 ? <div style={{ fontSize: 12.5, color: "#555" }}>No bookings yet.</div> : (
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            {c.bookings.map(b => (
                              <div key={b.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "8px 10px", borderRadius: 8, background: "rgba(255,255,255,0.02)", fontSize: 12 }}>
                                <div>
                                  <div style={{ color: "#ddd" }}>{b.service}</div>
                                  <div style={{ color: "#666", fontSize: 11 }}>{b.booking_date ? new Date(b.booking_date + "T00:00:00").toLocaleDateString("en-IN") : "—"} · {b.booking_time}</div>
                                </div>
                                <span style={{ color: STATUS_CONFIG[b.status]?.text ?? "#999", flexShrink: 0 }}>{b.status}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {c.inquiries.length > 0 && (
                        <div>
                          <div className="card-title">Inquiry History</div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            {c.inquiries.map(i => (
                              <div key={i.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "8px 10px", borderRadius: 8, background: "rgba(255,255,255,0.02)", fontSize: 12 }}>
                                <div>
                                  <div style={{ color: "#ddd" }}>{i.service || i.message?.slice(0, 40) || "General Inquiry"}</div>
                                  <div style={{ color: "#666", fontSize: 11 }}>{i.created_at ? new Date(i.created_at).toLocaleDateString("en-IN") : "—"}</div>
                                </div>
                                <span style={{ color: INQUIRY_STATUS_CONFIG[i.status]?.text ?? "#999", flexShrink: 0 }}>{i.status}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <button className="cm-cancel" onClick={() => setActiveCustomer(null)}>Close</button>
                    </div>
                </Modal>
              );
            })()}

            {/* ── SERVICES TAB ── */}
            {activeTab === "services" && (() => {
              const notYetImported = staticCategories.filter(c => !dbCategories.some(d => d.id === c.id));
              const q = svcSearch.trim().toLowerCase();
              const filteredCats = q
                ? dbCategories.filter(c =>
                    c.label.toLowerCase().includes(q) ||
                    dbServices.some(s => s.category_id === c.id && s.name.toLowerCase().includes(q))
                  )
                : dbCategories;
              const activeCat = dbCategories.find(c => c.id === svcActiveCatId);
              const activeCatServices = dbServices
                .filter(s => s.category_id === svcActiveCatId)
                .filter(s => !q || s.name.toLowerCase().includes(q));

              if (svcTablesMissing) {
                return (
                  <div className="card" style={{ background: "rgba(245,101,101,0.07)", border: "1px solid rgba(245,101,101,0.3)", maxWidth: 640 }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                      <AlertTriangle size={20} color="#f87171" style={{ flexShrink: 0, marginTop: 1 }} />
                      <div>
                        <div style={{ fontSize: 14.5, fontWeight: 700, color: "#f87171", marginBottom: 6 }}>
                          Database setup required — that's why nothing shows here
                        </div>
                        <div style={{ fontSize: 12.5, color: "#bbb", lineHeight: 1.7 }}>
                          This screen reads from two database tables that don't exist in your Supabase project yet. Until they're created, no service — old or new — can show up here, no matter what you click.
                        </div>
                        <ol style={{ fontSize: 12.5, color: "#ccc", lineHeight: 2, margin: "12px 0", paddingLeft: 18 }}>
                          <li>Open your <strong style={{ color: "#e8c96d" }}>Supabase dashboard</strong> → left sidebar → <strong style={{ color: "#e8c96d" }}>SQL Editor</strong></li>
                          <li>Click <strong style={{ color: "#e8c96d" }}>New query</strong></li>
                          <li>In this project's code, open the file <strong style={{ color: "#e8c96d" }}>supabase/services.sql</strong>, select all, copy it</li>
                          <li>Paste it into the SQL Editor and click <strong style={{ color: "#e8c96d" }}>Run</strong></li>
                          <li>Come back here and click the button below</li>
                        </ol>
                        <button className="btn bg" disabled={svcChecking} onClick={loadCatalogRaw} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                          {svcChecking ? <><Loader2 size={13} className="spin" />Checking…</> : <><RefreshCw size={13} />I've run it — check again</>}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {notYetImported.length > 0 && (
                    <div className="card" style={{ background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.25)" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
                        <div>
                          <div style={{ fontSize: 13.5, fontWeight: 700, color: "#e8c96d", marginBottom: 3 }}>
                            {notYetImported.length} categor{notYetImported.length === 1 ? "y" : "ies"} from your existing site menu {notYetImported.length === 1 ? "isn't" : "aren't"} here yet
                          </div>
                          <div style={{ fontSize: 12, color: "#999" }}>
                            One click copies your current Waxing, Facials, Hair Color etc. (and every service inside them) into this screen, so you can edit or add photos to any of them — nothing on the live site changes until you edit here.
                          </div>
                        </div>
                        <button className="btn bg" disabled={svcImporting} onClick={importStaticCatalog} style={{ display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
                          {svcImporting ? <><Loader2 size={13} className="spin" />Importing…</> : <><Download size={13} />Bring in my existing services</>}
                        </button>
                      </div>
                      {svcImportMsg && <div style={{ fontSize: 12, color: "#8ce0a8", marginTop: 10 }}>{svcImportMsg}</div>}
                    </div>
                  )}

                  {svcError && (
                    <div style={{ background: "rgba(245,101,101,0.1)", border: "1px solid rgba(245,101,101,0.3)", borderRadius: 10, padding: "10px 14px", fontSize: 12.5, color: "#f87171" }}>
                      {svcError}
                    </div>
                  )}

                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ position: "relative", maxWidth: 360, flex: "1 1 220px" }}>
                      <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#555" }} />
                      <input
                        value={svcSearch}
                        onChange={e => setSvcSearch(e.target.value)}
                        placeholder="Search categories or services…"
                        style={{
                          width: "100%", padding: "9px 12px 9px 34px", borderRadius: 10, fontSize: 12.5,
                          background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "#ddd",
                        }}
                      />
                    </div>
                    <button
                      className={reorderLocked ? "btn bg" : "btn bv"}
                      onClick={toggleReorderLock}
                      title={reorderLocked ? "Order is locked — click to enable drag-and-drop reordering" : "Order is unlocked — click to lock and prevent accidental reordering"}
                      style={{ display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}
                    >
                      {reorderLocked ? <><Lock size={12} />Order Locked</> : <><Unlock size={12} />Order Unlocked</>}
                    </button>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 16, alignItems: "start" }}>
                    {/* Categories */}
                    <div className="card">
                      <div className="card-title" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 7 }}><Layers size={14} />Categories</span>
                        <button className="btn bg" onClick={() => setSvcCatForm({ gender: "both", home_service: true, images: [] })} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <Plus size={12} />Add Category
                        </button>
                      </div>
                      {dbCategories.length === 0 ? (
                        <div style={{ color: "#444", fontSize: 12.5, padding: "10px 0", lineHeight: 1.6 }}>
                          Nothing here yet. Click <strong style={{ color: "#c9a84c" }}>"Bring in my existing services"</strong> above to load your current menu, or add a brand-new category with "Add Category".
                        </div>
                      ) : filteredCats.length === 0 ? (
                        <div style={{ color: "#444", fontSize: 12.5, padding: "10px 0" }}>No categories or services match "{svcSearch}".</div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {filteredCats.map(cat => {
                            const count = dbServices.filter(s => s.category_id === cat.id).length;
                            const isActive = svcActiveCatId === cat.id;
                            return (
                              <div key={cat.id}
                                onClick={() => setSvcActiveCatId(cat.id)}
                                draggable={!reorderLocked}
                                onDragStart={e => { e.stopPropagation(); setDraggedCategoryId(cat.id); }}
                                onDragOver={e => { e.preventDefault(); e.stopPropagation(); if (dragOverCategoryId !== cat.id) setDragOverCategoryId(cat.id); }}
                                onDragLeave={() => setDragOverCategoryId(id => id === cat.id ? null : id)}
                                onDrop={e => {
                                  e.preventDefault(); e.stopPropagation();
                                  setDragOverCategoryId(null);
                                  if (draggedCategoryId != null) reorderCategoryByDrag(draggedCategoryId, cat.id);
                                  setDraggedCategoryId(null);
                                }}
                                onDragEnd={() => { setDraggedCategoryId(null); setDragOverCategoryId(null); }}
                                style={{
                                  display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 12, cursor: isActive || reorderLocked ? "pointer" : "grab",
                                  background: isActive ? "rgba(201,168,76,0.1)" : "rgba(255,255,255,0.02)",
                                  border: dragOverCategoryId === cat.id ? "1px solid #c9a84c" : `1px solid ${isActive ? "rgba(201,168,76,0.35)" : "rgba(255,255,255,0.05)"}`,
                                  boxShadow: dragOverCategoryId === cat.id ? "0 0 0 3px rgba(201,168,76,0.15)" : "none",
                                  opacity: draggedCategoryId === cat.id ? 0.4 : 1,
                                  transition: "border-color 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease",
                                }}>
                                {reorderLocked
                                  ? <Lock size={12} color="#444" style={{ flexShrink: 0 }} />
                                  : <GripVertical size={13} color="#555" style={{ flexShrink: 0, cursor: "grab" }} />}
                                <div style={{
                                  width: 40, height: 40, borderRadius: "50%", flexShrink: 0, overflow: "hidden",
                                  border: `2px solid ${isActive ? "#c9a84c" : "rgba(255,255,255,0.1)"}`,
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  background: cat.images?.[0] ? "transparent" : "rgba(201,168,76,0.1)", fontSize: 17,
                                }}>
                                  {cat.images?.[0] ? <img src={cat.images[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : cat.icon}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: 12.5, fontWeight: 700, color: isActive ? "#e8c96d" : "#ddd", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cat.label}</div>
                                  <div style={{ fontSize: 10.5, color: "#555" }}>{count} service{count !== 1 ? "s" : ""} · {cat.gender}</div>
                                </div>
                                <button className="btn bv" onClick={e => { e.stopPropagation(); setSvcCatForm(cat); }} style={{ padding: 5 }}><Pencil size={11} /></button>
                                <button className="btn bx" onClick={e => { e.stopPropagation(); deleteCategory(cat); }} style={{ padding: 5 }}><Trash2 size={11} /></button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Services within selected category — image-card grid, matching the live site */}
                    <div className="card">
                      {!svcActiveCatId || !activeCat ? (
                        <div style={{ color: "#444", fontSize: 13, padding: "40px 0", textAlign: "center" }}>
                          <Layers size={22} color="#333" style={{ marginBottom: 10 }} />
                          <div>Select a category on the left to view and edit its services.</div>
                        </div>
                      ) : (
                        <>
                          <div className="card-title" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: 17 }}>{activeCat.icon}</span>
                              {activeCat.label}
                              <span style={{ fontSize: 11, fontWeight: 500, color: "#666" }}>({activeCatServices.length})</span>
                            </span>
                            <button className="btn bg" onClick={() => setSvcForm({ category_id: svcActiveCatId, popular: false, images: [] })} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                              <Plus size={12} />Add Service
                            </button>
                          </div>
                          {activeCatServices.length === 0 ? (
                            <div style={{ color: "#444", fontSize: 12.5, padding: "10px 0" }}>
                              {q ? `No services match "${svcSearch}" in this category.` : "No services in this category yet — click \"Add Service\" to create one."}
                            </div>
                          ) : (
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14 }}>
                              {activeCatServices.map(svc => (
                                <div key={svc.id}
                                  draggable={!reorderLocked}
                                  onDragStart={() => setDraggedServiceId(svc.id)}
                                  onDragOver={e => { e.preventDefault(); if (dragOverServiceId !== svc.id) setDragOverServiceId(svc.id); }}
                                  onDragLeave={() => setDragOverServiceId(id => id === svc.id ? null : id)}
                                  onDrop={e => {
                                    e.preventDefault();
                                    setDragOverServiceId(null);
                                    if (draggedServiceId != null) reorderServiceByDrag(activeCatServices, draggedServiceId, svc.id);
                                    setDraggedServiceId(null);
                                  }}
                                  onDragEnd={() => { setDraggedServiceId(null); setDragOverServiceId(null); }}
                                  style={{
                                    borderRadius: 12, overflow: "hidden", background: "rgba(255,255,255,0.02)",
                                    border: dragOverServiceId === svc.id ? "1px solid #c9a84c" : "1px solid rgba(255,255,255,0.06)",
                                    boxShadow: dragOverServiceId === svc.id ? "0 0 0 3px rgba(201,168,76,0.15)" : "none",
                                    opacity: draggedServiceId === svc.id ? 0.4 : 1,
                                    cursor: reorderLocked ? "default" : "grab", transition: "border-color 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease",
                                  }}>
                                  <div style={{ position: "relative", width: "100%", aspectRatio: "4 / 3", background: "rgba(255,255,255,0.04)" }}>
                                    {svc.images?.[0] && <img src={svc.images[0]} alt={svc.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                                    <span title={reorderLocked ? "Order locked — unlock to reorder" : "Drag to reorder"} style={{ position: "absolute", top: 8, left: 8, display: "flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: 7, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", color: "rgba(255,255,255,0.75)", cursor: reorderLocked ? "default" : "grab" }}>
                                      {reorderLocked ? <Lock size={11} /> : <GripVertical size={12} />}
                                    </span>
                                    {svc.group_name && (
                                      <span style={{ position: "absolute", top: 8, left: 36, background: "rgba(0,0,0,0.65)", color: "#fff", fontSize: 9.5, fontWeight: 700, padding: "3px 8px", borderRadius: 20, maxWidth: "calc(100% - 44px)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                        {svc.group_name}
                                      </span>
                                    )}
                                    {svc.popular && (
                                      <span style={{ position: "absolute", top: 8, right: 8, display: "flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: "50%", background: "rgba(201,168,76,0.9)" }}>
                                        <Star size={11} color="#080808" fill="#080808" />
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ padding: "10px 11px" }}>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: "#ddd", lineHeight: 1.3, marginBottom: 4, minHeight: 30 }}>{svc.name}</div>
                                    <div style={{ fontSize: 12.5, fontWeight: 700, color: "#c9a84c", marginBottom: 8 }}>
                                      ₹{svc.price.toLocaleString()}{svc.duration ? <span style={{ fontSize: 10.5, color: "#555", fontWeight: 500 }}> · {svc.duration}</span> : ""}
                                    </div>
                                    <div style={{ display: "flex", gap: 6 }}>
                                      <button className="btn bv" onClick={() => setSvcForm(svc)} style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 4, padding: "6px 0" }}><Pencil size={11} />Edit</button>
                                      <button className="btn bx" onClick={() => deleteService(svc)} style={{ padding: "6px 9px" }}><Trash2 size={11} /></button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* ── Category add/edit modal ── */}
            {svcCatForm && (
              <Modal title={dbCategories.some(c => c.id === svcCatForm.id) ? "Edit Category" : "Add Category"} onClose={() => setSvcCatForm(null)}>
                    <div>
                      <label style={{ display: "block", fontSize: 10.5, color: "#666", marginBottom: 4 }}>Category ID (slug, e.g. "bridal-makeup") *</label>
                      <input type="text" value={svcCatForm.id ?? ""} disabled={dbCategories.some(c => c.id === svcCatForm.id)}
                        onChange={e => setSvcCatForm(f => ({ ...f, id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") }))}
                        style={{ width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "9px 12px", color: "#eee", fontSize: 13 }} />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 10.5, color: "#666", marginBottom: 4 }}>Label *</label>
                      <input type="text" value={svcCatForm.label ?? ""} onChange={e => setSvcCatForm(f => ({ ...f, label: e.target.value }))}
                        style={{ width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "9px 12px", color: "#eee", fontSize: 13 }} />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 10.5, color: "#666", marginBottom: 4 }}>Description</label>
                      <textarea value={svcCatForm.description ?? ""} onChange={e => setSvcCatForm(f => ({ ...f, description: e.target.value }))} rows={2}
                        style={{ width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "9px 12px", color: "#eee", fontSize: 13, fontFamily: "inherit", resize: "vertical" }} />
                    </div>
                    <div style={{ display: "flex", gap: 10 }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: "block", fontSize: 10.5, color: "#666", marginBottom: 4 }}>Icon (emoji)</label>
                        <input type="text" value={svcCatForm.icon ?? ""} onChange={e => setSvcCatForm(f => ({ ...f, icon: e.target.value }))}
                          style={{ width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "9px 12px", color: "#eee", fontSize: 13 }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: "block", fontSize: 10.5, color: "#666", marginBottom: 4 }}>Accent color</label>
                        <input type="text" value={svcCatForm.color ?? ""} placeholder="#f5f5f5" onChange={e => setSvcCatForm(f => ({ ...f, color: e.target.value }))}
                          style={{ width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "9px 12px", color: "#eee", fontSize: 13 }} />
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: "block", fontSize: 10.5, color: "#666", marginBottom: 4 }}>Gender</label>
                        <select value={svcCatForm.gender ?? "both"} onChange={e => setSvcCatForm(f => ({ ...f, gender: e.target.value as any }))}
                          style={{ width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "9px 12px", color: "#eee", fontSize: 13 }}>
                          <option value="both">Both</option>
                          <option value="female">Female</option>
                          <option value="male">Male</option>
                        </select>
                      </div>
                      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#aaa", marginTop: 18 }}>
                        <input type="checkbox" checked={svcCatForm.home_service ?? true} onChange={e => setSvcCatForm(f => ({ ...f, home_service: e.target.checked }))} />
                        Home service
                      </label>
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 10.5, color: "#666", marginBottom: 4 }}>Images</label>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                        {(svcCatForm.images ?? []).map((url, i) => (
                          <div key={i} style={{ position: "relative" }}>
                            <img src={url} alt="" style={{ width: 56, height: 56, borderRadius: 8, objectFit: "cover" }} />
                            <button onClick={() => setSvcCatForm(f => ({ ...f, images: (f?.images ?? []).filter((_, j) => j !== i) }))}
                              style={{ position: "absolute", top: -6, right: -6, width: 18, height: 18, borderRadius: "50%", background: "#f56565", border: "none", color: "#fff", cursor: "pointer", fontSize: 10 }}>×</button>
                          </div>
                        ))}
                      </div>
                      <label className="btn bg" style={{ display: "inline-flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
                        <ImagePlus size={12} />{svcUploading ? "Uploading…" : "Upload Images"}
                        <input type="file" accept="image/*" multiple hidden disabled={svcUploading} onChange={e => handleSvcImageUpload(e.target.files, "category")} />
                      </label>
                    </div>
                    {svcError && <div style={{ color: "#f56565", fontSize: 12 }}>{svcError}</div>}
                    <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                      <button className="btn bg" disabled={svcSaving} onClick={saveCategory} style={{ flex: 1, padding: "9px 0" }}>{svcSaving ? "Saving…" : "Save"}</button>
                      <button className="cm-cancel" onClick={() => { setSvcCatForm(null); setSvcError(""); }}>Cancel</button>
                    </div>
              </Modal>
            )}

            {/* ── Service add/edit modal ── */}
            {svcForm && (
              <Modal title={svcForm.id ? "Edit Service" : "Add Service"} onClose={() => setSvcForm(null)}>
                    <div>
                      <label style={{ display: "block", fontSize: 10.5, color: "#666", marginBottom: 4 }}>Category *</label>
                      <select value={svcForm.category_id ?? ""} onChange={e => setSvcForm(f => ({ ...f, category_id: e.target.value }))}
                        style={{ width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "9px 12px", color: "#eee", fontSize: 13 }}>
                        {dbCategories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 10.5, color: "#666", marginBottom: 4 }}>Service Name *</label>
                      <input type="text" value={svcForm.name ?? ""} onChange={e => setSvcForm(f => ({ ...f, name: e.target.value }))}
                        style={{ width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "9px 12px", color: "#eee", fontSize: 13 }} />
                    </div>
                    <div style={{ display: "flex", gap: 10 }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: "block", fontSize: 10.5, color: "#666", marginBottom: 4 }}>Price (₹) *</label>
                        <input type="number" value={svcForm.price ?? ""}
                          onChange={e => { const v = e.target.value; setSvcForm(f => ({ ...f, price: v === "" ? undefined : Number(v) })); }}
                          style={{ width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "9px 12px", color: "#eee", fontSize: 13 }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: "block", fontSize: 10.5, color: "#666", marginBottom: 4 }}>Duration</label>
                        <input type="text" placeholder="45 mins" value={svcForm.duration ?? ""} onChange={e => setSvcForm(f => ({ ...f, duration: e.target.value }))}
                          style={{ width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "9px 12px", color: "#eee", fontSize: 13 }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: "block", fontSize: 10.5, color: "#666", marginBottom: 4 }}>Discount %</label>
                        <input type="number" min={0} max={100} placeholder="0" value={svcForm.discount_percent ?? ""}
                          onChange={e => { const v = e.target.value; setSvcForm(f => ({ ...f, discount_percent: v === "" ? undefined : Number(v) })); }}
                          style={{ width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "9px 12px", color: "#eee", fontSize: 13 }} />
                      </div>
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 10.5, color: "#666", marginBottom: 4 }}>Sub-group / brand (optional, e.g. "Kanpeki Pura Labs")</label>
                      <input type="text" value={svcForm.group_name ?? ""} onChange={e => setSvcForm(f => ({ ...f, group_name: e.target.value }))}
                        style={{ width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "9px 12px", color: "#eee", fontSize: 13 }} />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 10.5, color: "#666", marginBottom: 4 }}>Section heading (optional, e.g. "Japanese Rituals" — groups several brands under one heading in the grid)</label>
                      <input type="text" value={svcForm.section ?? ""} onChange={e => setSvcForm(f => ({ ...f, section: e.target.value }))}
                        style={{ width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "9px 12px", color: "#eee", fontSize: 13 }} />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 10.5, color: "#666", marginBottom: 4 }}>Description (short, shown on cards)</label>
                      <textarea value={svcForm.description ?? ""} onChange={e => setSvcForm(f => ({ ...f, description: e.target.value }))} rows={2}
                        style={{ width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "9px 12px", color: "#eee", fontSize: 13, fontFamily: "inherit", resize: "vertical" }} />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 10.5, color: "#666", marginBottom: 4 }}>Long Description (shown on the service's own page)</label>
                      <textarea value={svcForm.long_description ?? ""} onChange={e => setSvcForm(f => ({ ...f, long_description: e.target.value }))} rows={3}
                        style={{ width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "9px 12px", color: "#eee", fontSize: 13, fontFamily: "inherit", resize: "vertical" }} />
                    </div>
                    <div style={{ display: "flex", gap: 16 }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#aaa" }}>
                        <input type="checkbox" checked={svcForm.popular ?? false} onChange={e => setSvcForm(f => ({ ...f, popular: e.target.checked }))} />
                        Mark as "Popular"
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#aaa" }}>
                        <input type="checkbox" checked={svcForm.trending ?? false} onChange={e => setSvcForm(f => ({ ...f, trending: e.target.checked }))} />
                        Mark as "Trending"
                      </label>
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 10.5, color: "#666", marginBottom: 4 }}>What's Included (steps, shown as a checklist)</label>
                      <RepeatableList items={svcForm.included_steps ?? []} placeholder="e.g. Cleansing" onChange={v => setSvcForm(f => ({ ...f, included_steps: v }))} />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 10.5, color: "#666", marginBottom: 4 }}>Benefits</label>
                      <RepeatableList items={svcForm.benefits ?? []} placeholder="e.g. Deep hydration" onChange={v => setSvcForm(f => ({ ...f, benefits: v }))} />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 10.5, color: "#666", marginBottom: 4 }}>Service FAQs</label>
                      <RepeatableFaqs items={svcForm.faqs ?? []} onChange={v => setSvcForm(f => ({ ...f, faqs: v }))} />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 10.5, color: "#666", marginBottom: 4 }}>Images (first one is the card thumbnail)</label>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                        {(svcForm.images ?? []).map((url, i) => (
                          <div key={i} style={{ position: "relative" }}>
                            <img src={url} alt="" style={{ width: 56, height: 56, borderRadius: 8, objectFit: "cover" }} />
                            <button onClick={() => setSvcForm(f => ({ ...f, images: (f?.images ?? []).filter((_, j) => j !== i) }))}
                              style={{ position: "absolute", top: -6, right: -6, width: 18, height: 18, borderRadius: "50%", background: "#f56565", border: "none", color: "#fff", cursor: "pointer", fontSize: 10 }}>×</button>
                          </div>
                        ))}
                      </div>
                      <label className="btn bg" style={{ display: "inline-flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
                        <ImagePlus size={12} />{svcUploading ? "Uploading…" : "Upload Images"}
                        <input type="file" accept="image/*" multiple hidden disabled={svcUploading} onChange={e => handleSvcImageUpload(e.target.files, "service")} />
                      </label>
                    </div>
                    <div style={{ display: "flex", gap: 10 }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: "block", fontSize: 10.5, color: "#666", marginBottom: 4 }}>Before Photos</label>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                          {(svcForm.before_images ?? []).map((url, i) => (
                            <div key={i} style={{ position: "relative" }}>
                              <img src={url} alt="" style={{ width: 56, height: 56, borderRadius: 8, objectFit: "cover" }} />
                              <button onClick={() => setSvcForm(f => ({ ...f, before_images: (f?.before_images ?? []).filter((_, j) => j !== i) }))}
                                style={{ position: "absolute", top: -6, right: -6, width: 18, height: 18, borderRadius: "50%", background: "#f56565", border: "none", color: "#fff", cursor: "pointer", fontSize: 10 }}>×</button>
                            </div>
                          ))}
                        </div>
                        <label className="btn bg" style={{ display: "inline-flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
                          <ImagePlus size={12} />Upload
                          <input type="file" accept="image/*" multiple hidden disabled={svcUploading} onChange={e => handleSvcImageUpload(e.target.files, "before")} />
                        </label>
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: "block", fontSize: 10.5, color: "#666", marginBottom: 4 }}>After Photos</label>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                          {(svcForm.after_images ?? []).map((url, i) => (
                            <div key={i} style={{ position: "relative" }}>
                              <img src={url} alt="" style={{ width: 56, height: 56, borderRadius: 8, objectFit: "cover" }} />
                              <button onClick={() => setSvcForm(f => ({ ...f, after_images: (f?.after_images ?? []).filter((_, j) => j !== i) }))}
                                style={{ position: "absolute", top: -6, right: -6, width: 18, height: 18, borderRadius: "50%", background: "#f56565", border: "none", color: "#fff", cursor: "pointer", fontSize: 10 }}>×</button>
                            </div>
                          ))}
                        </div>
                        <label className="btn bg" style={{ display: "inline-flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
                          <ImagePlus size={12} />Upload
                          <input type="file" accept="image/*" multiple hidden disabled={svcUploading} onChange={e => handleSvcImageUpload(e.target.files, "after")} />
                        </label>
                      </div>
                    </div>
                    {svcError && <div style={{ color: "#f56565", fontSize: 12 }}>{svcError}</div>}
                    <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                      <button className="btn bg" disabled={svcSaving} onClick={saveService} style={{ flex: 1, padding: "9px 0" }}>{svcSaving ? "Saving…" : "Save"}</button>
                      <button className="cm-cancel" onClick={() => { setSvcForm(null); setSvcError(""); }}>Cancel</button>
                    </div>
              </Modal>
            )}

            {/* ── HOMEPAGE TAB ── */}
            {activeTab === "homepage" && (() => {
              if (homeTablesMissing) {
                return (
                  <div className="card" style={{ background: "rgba(245,101,101,0.07)", border: "1px solid rgba(245,101,101,0.3)", maxWidth: 640 }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                      <AlertTriangle size={20} color="#f87171" style={{ flexShrink: 0, marginTop: 1 }} />
                      <div>
                        <div style={{ fontSize: 14.5, fontWeight: 700, color: "#f87171", marginBottom: 6 }}>
                          Database setup required — that's why nothing shows here
                        </div>
                        <div style={{ fontSize: 12.5, color: "#bbb", lineHeight: 1.7 }}>
                          This screen reads from database tables that don't exist in your Supabase project yet.
                        </div>
                        <ol style={{ fontSize: 12.5, color: "#ccc", lineHeight: 2, margin: "12px 0", paddingLeft: 18 }}>
                          <li>Open your <strong style={{ color: "#e8c96d" }}>Supabase dashboard</strong> → left sidebar → <strong style={{ color: "#e8c96d" }}>SQL Editor</strong></li>
                          <li>Click <strong style={{ color: "#e8c96d" }}>New query</strong></li>
                          <li>In this project's code, open the file <strong style={{ color: "#e8c96d" }}>supabase/homepage.sql</strong>, select all, copy it</li>
                          <li>Paste it into the SQL Editor and click <strong style={{ color: "#e8c96d" }}>Run</strong></li>
                          <li>Come back here and click the button below</li>
                        </ol>
                        <button className="btn bg" disabled={homeChecking} onClick={loadHomepageRaw} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                          {homeChecking ? <><Loader2 size={13} className="spin" />Checking…</> : <><RefreshCw size={13} />I've run it — check again</>}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }

              const SECTIONS: { key: typeof homeSection; label: string; count: number }[] = [
                { key: "features",     label: "Why Choose Us", count: dbFeatures.length },
                { key: "testimonials", label: "Testimonials",  count: dbTestimonials.length },
                { key: "gallery",      label: "Gallery",       count: dbGalleryImages.length },
                { key: "faqs",         label: "FAQ",           count: dbFaqs.length },
              ];

              const notYetImportedHome = dbTestimonials.length === 0 || dbGalleryImages.length === 0 || dbFaqs.length === 0;

              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {notYetImportedHome && (
                    <div className="card" style={{ background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.25)" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
                        <div>
                          <div style={{ fontSize: 13.5, fontWeight: 700, color: "#e8c96d", marginBottom: 3 }}>
                            What's already live on your homepage isn't here yet
                          </div>
                          <div style={{ fontSize: 12, color: "#999" }}>
                            One click copies your current testimonials, gallery photos and FAQs into this screen, so you can edit or replace any of them — nothing on the live site changes until you edit here. (Why Choose Us cards stay as they are — their icons are custom-drawn and would look worse imported as emoji. Use "Add Card" if you want extra ones.)
                          </div>
                        </div>
                        <button className="btn bg" disabled={homeImporting} onClick={importHomepageDefaults} style={{ display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
                          {homeImporting ? <><Loader2 size={13} className="spin" />Importing…</> : <><Download size={13} />Bring in what's live now</>}
                        </button>
                      </div>
                      {homeImportMsg && <div style={{ fontSize: 12, color: "#8ce0a8", marginTop: 10 }}>{homeImportMsg}</div>}
                    </div>
                  )}

                  {homeError && (
                    <div style={{ background: "rgba(245,101,101,0.1)", border: "1px solid rgba(245,101,101,0.3)", borderRadius: 10, padding: "10px 14px", fontSize: 12.5, color: "#f87171" }}>
                      {homeError}
                    </div>
                  )}

                  <div className="fb-btns">
                    {SECTIONS.map(sec => (
                      <button key={sec.key} className={`fb-btn ${homeSection === sec.key ? "on" : ""}`} onClick={() => setHomeSection(sec.key)}>
                        {sec.label} ({sec.count})
                      </button>
                    ))}
                  </div>

                  {homeSection === "features" && (
                    <div className="card">
                      <div className="card-title" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span>Why Choose Us Cards</span>
                        <button className="btn bg" onClick={() => setFeatureForm({ icon: "✨", visible: true })} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Plus size={12} />Add Card</button>
                      </div>
                      {dbFeatures.length === 0 ? (
                        <div style={{ color: "#444", fontSize: 12.5, padding: "10px 0" }}>No cards yet — the live site shows its built-in defaults until you add some here.</div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {dbFeatures.map(f => (
                            <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 10px", borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                              <span style={{ fontSize: 20, width: 28, textAlign: "center", flexShrink: 0 }}>{f.icon}</span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 12.5, fontWeight: 700, color: "#ddd" }}>{f.title}{!f.visible && <span style={{ marginLeft: 8, fontSize: 9.5, color: "#f87171", fontWeight: 700 }}>HIDDEN</span>}</div>
                                <div style={{ fontSize: 11, color: "#666", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.description}</div>
                              </div>
                              <HomeRowActions visible={f.visible} onMoveUp={() => moveHomeRow("homepage_features", dbFeatures, f.id, -1)} onMoveDown={() => moveHomeRow("homepage_features", dbFeatures, f.id, 1)} onToggleVisible={() => toggleHomeVisible("homepage_features", f.id, !f.visible)} />
                              <button className="btn bv" onClick={() => setFeatureForm(f)} style={{ padding: 5 }}><Pencil size={11} /></button>
                              <button className="btn bx" onClick={() => deleteHomeRow("homepage_features", f.id, f.title)} style={{ padding: 5 }}><Trash2 size={11} /></button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {homeSection === "testimonials" && (
                    <div className="card">
                      <div className="card-title" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span>Testimonials</span>
                        <button className="btn bg" onClick={() => setTestimonialForm({ rating: 5, visible: true })} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Plus size={12} />Add Testimonial</button>
                      </div>
                      {dbTestimonials.length === 0 ? (
                        <div style={{ color: "#444", fontSize: 12.5, padding: "10px 0" }}>No testimonials yet — the live site shows its built-in defaults until you add some here.</div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {dbTestimonials.map(t => (
                            <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 10px", borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                              <div style={{ width: 34, height: 34, borderRadius: "50%", flexShrink: 0, overflow: "hidden", background: "rgba(201,168,76,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#c9a84c" }}>
                                {t.photo ? <img src={t.photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (t.initials || t.name.slice(0, 2).toUpperCase())}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 12.5, fontWeight: 700, color: "#ddd" }}>{t.name} <span style={{ color: "#c9a84c" }}>{"★".repeat(t.rating)}</span>{!t.visible && <span style={{ marginLeft: 8, fontSize: 9.5, color: "#f87171", fontWeight: 700 }}>HIDDEN</span>}</div>
                                <div style={{ fontSize: 11, color: "#666", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.review}</div>
                              </div>
                              <HomeRowActions visible={t.visible} onMoveUp={() => moveHomeRow("testimonials", dbTestimonials, t.id, -1)} onMoveDown={() => moveHomeRow("testimonials", dbTestimonials, t.id, 1)} onToggleVisible={() => toggleHomeVisible("testimonials", t.id, !t.visible)} />
                              <button className="btn bv" onClick={() => setTestimonialForm(t)} style={{ padding: 5 }}><Pencil size={11} /></button>
                              <button className="btn bx" onClick={() => deleteHomeRow("testimonials", t.id, t.name)} style={{ padding: 5 }}><Trash2 size={11} /></button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {homeSection === "gallery" && (
                    <div className="card">
                      <div className="card-title" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                        <span>Gallery Photos</span>
                        <div style={{ display: "flex", gap: 8 }}>
                          <label className="btn bg" style={{ display: "inline-flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
                            <ImagePlus size={12} />{homeUploading ? "Uploading…" : "Upload Multiple"}
                            <input type="file" accept="image/*" multiple hidden disabled={homeUploading} onChange={e => handleBulkGalleryUpload(e.target.files)} />
                          </label>
                          <button className="btn bg" onClick={() => setGalleryForm({ visible: true })} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Plus size={12} />Add Photo</button>
                        </div>
                      </div>
                      {dbGalleryImages.length === 0 ? (
                        <div style={{ color: "#444", fontSize: 12.5, padding: "10px 0" }}>No photos yet — the live site shows its built-in defaults until you add some here.</div>
                      ) : (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14 }}>
                          {dbGalleryImages.map(g => (
                            <div key={g.id} style={{ borderRadius: 12, overflow: "hidden", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                              <div style={{ position: "relative", width: "100%", aspectRatio: "4 / 3", background: "rgba(255,255,255,0.04)" }}>
                                {g.src && <img src={g.src} alt={g.label ?? ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                                {!g.visible && <span style={{ position: "absolute", top: 8, left: 8, background: "rgba(245,101,101,0.85)", color: "#fff", fontSize: 9.5, fontWeight: 700, padding: "3px 8px", borderRadius: 20 }}>HIDDEN</span>}
                              </div>
                              <div style={{ padding: "10px 11px" }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: "#ddd", marginBottom: 6 }}>{g.label || "Untitled"}</div>
                                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                  <HomeRowActions visible={g.visible} onMoveUp={() => moveHomeRow("gallery_images", dbGalleryImages, g.id, -1)} onMoveDown={() => moveHomeRow("gallery_images", dbGalleryImages, g.id, 1)} onToggleVisible={() => toggleHomeVisible("gallery_images", g.id, !g.visible)} />
                                  <button className="btn bv" onClick={() => setGalleryForm(g)} style={{ flex: 1, padding: "6px 0" }}><Pencil size={11} /></button>
                                  <button className="btn bx" onClick={() => deleteHomeRow("gallery_images", g.id, g.label || "photo")} style={{ padding: "6px 9px" }}><Trash2 size={11} /></button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {homeSection === "faqs" && (
                    <div className="card">
                      <div className="card-title" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span>FAQs</span>
                        <button className="btn bg" onClick={() => setFaqForm({ visible: true })} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Plus size={12} />Add FAQ</button>
                      </div>
                      {dbFaqs.length === 0 ? (
                        <div style={{ color: "#444", fontSize: 12.5, padding: "10px 0" }}>No FAQs yet — the live site shows its built-in defaults until you add some here.</div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {dbFaqs.map(q => (
                            <div key={q.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 10px", borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 12.5, fontWeight: 700, color: "#ddd" }}>{q.question}{!q.visible && <span style={{ marginLeft: 8, fontSize: 9.5, color: "#f87171", fontWeight: 700 }}>HIDDEN</span>}</div>
                                <div style={{ fontSize: 11, color: "#666", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{q.answer}</div>
                              </div>
                              <HomeRowActions visible={q.visible} onMoveUp={() => moveHomeRow("faqs", dbFaqs, q.id, -1)} onMoveDown={() => moveHomeRow("faqs", dbFaqs, q.id, 1)} onToggleVisible={() => toggleHomeVisible("faqs", q.id, !q.visible)} />
                              <button className="btn bv" onClick={() => setFaqForm(q)} style={{ padding: 5 }}><Pencil size={11} /></button>
                              <button className="btn bx" onClick={() => deleteHomeRow("faqs", q.id, q.question)} style={{ padding: 5 }}><Trash2 size={11} /></button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* ── Why Choose Us card add/edit modal ── */}
            {featureForm && (
              <Modal title={featureForm.id ? "Edit Card" : "Add Card"} onClose={() => setFeatureForm(null)}>
                    <div>
                      <label style={{ display: "block", fontSize: 10.5, color: "#666", marginBottom: 4 }}>Icon (emoji)</label>
                      <input type="text" value={featureForm.icon ?? ""} onChange={e => setFeatureForm(f => ({ ...f, icon: e.target.value }))}
                        style={{ width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "9px 12px", color: "#eee", fontSize: 13 }} />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 10.5, color: "#666", marginBottom: 4 }}>Title *</label>
                      <input type="text" value={featureForm.title ?? ""} onChange={e => setFeatureForm(f => ({ ...f, title: e.target.value }))}
                        style={{ width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "9px 12px", color: "#eee", fontSize: 13 }} />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 10.5, color: "#666", marginBottom: 4 }}>Description</label>
                      <textarea value={featureForm.description ?? ""} onChange={e => setFeatureForm(f => ({ ...f, description: e.target.value }))} rows={2}
                        style={{ width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "9px 12px", color: "#eee", fontSize: 13, fontFamily: "inherit", resize: "vertical" }} />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 10.5, color: "#666", marginBottom: 4 }}>Small badge (optional)</label>
                      <input type="text" placeholder="15+ on staff" value={featureForm.badge ?? ""} onChange={e => setFeatureForm(f => ({ ...f, badge: e.target.value }))}
                        style={{ width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "9px 12px", color: "#eee", fontSize: 13 }} />
                    </div>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#aaa" }}>
                      <input type="checkbox" checked={featureForm.visible ?? true} onChange={e => setFeatureForm(f => ({ ...f, visible: e.target.checked }))} />
                      Visible on site
                    </label>
                    {homeError && <div style={{ color: "#f56565", fontSize: 12 }}>{homeError}</div>}
                    <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                      <button className="btn bg" disabled={homeSaving} onClick={async () => {
                        if (!featureForm.title) { setHomeError("Title is required."); return; }
                        if (await saveHomeRow("homepage_features", featureForm, featureForm.title!)) setFeatureForm(null);
                      }} style={{ flex: 1, padding: "9px 0" }}>{homeSaving ? "Saving…" : "Save"}</button>
                      <button className="cm-cancel" onClick={() => { setFeatureForm(null); setHomeError(""); }}>Cancel</button>
                    </div>
              </Modal>
            )}

            {/* ── Testimonial add/edit modal ── */}
            {testimonialForm && (
              <Modal title={testimonialForm.id ? "Edit Testimonial" : "Add Testimonial"} onClose={() => setTestimonialForm(null)}>
                    <div>
                      <label style={{ display: "block", fontSize: 10.5, color: "#666", marginBottom: 4 }}>Customer Name *</label>
                      <input type="text" value={testimonialForm.name ?? ""} onChange={e => setTestimonialForm(f => ({ ...f, name: e.target.value }))}
                        style={{ width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "9px 12px", color: "#eee", fontSize: 13 }} />
                    </div>
                    <div style={{ display: "flex", gap: 10 }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: "block", fontSize: 10.5, color: "#666", marginBottom: 4 }}>Location</label>
                        <input type="text" placeholder="2 weeks ago" value={testimonialForm.location ?? ""} onChange={e => setTestimonialForm(f => ({ ...f, location: e.target.value }))}
                          style={{ width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "9px 12px", color: "#eee", fontSize: 13 }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: "block", fontSize: 10.5, color: "#666", marginBottom: 4 }}>Service</label>
                        <input type="text" placeholder="Bridal Makeup" value={testimonialForm.service ?? ""} onChange={e => setTestimonialForm(f => ({ ...f, service: e.target.value }))}
                          style={{ width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "9px 12px", color: "#eee", fontSize: 13 }} />
                      </div>
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 10.5, color: "#666", marginBottom: 4 }}>Review *</label>
                      <textarea value={testimonialForm.review ?? ""} onChange={e => setTestimonialForm(f => ({ ...f, review: e.target.value }))} rows={3}
                        style={{ width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "9px 12px", color: "#eee", fontSize: 13, fontFamily: "inherit", resize: "vertical" }} />
                    </div>
                    <div style={{ display: "flex", gap: 10 }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: "block", fontSize: 10.5, color: "#666", marginBottom: 4 }}>Rating (1-5)</label>
                        <select value={testimonialForm.rating ?? 5} onChange={e => setTestimonialForm(f => ({ ...f, rating: Number(e.target.value) }))}
                          style={{ width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "9px 12px", color: "#eee", fontSize: 13 }}>
                          {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} ★</option>)}
                        </select>
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: "block", fontSize: 10.5, color: "#666", marginBottom: 4 }}>Initials (if no photo)</label>
                        <input type="text" placeholder="PS" maxLength={2} value={testimonialForm.initials ?? ""} onChange={e => setTestimonialForm(f => ({ ...f, initials: e.target.value.toUpperCase() }))}
                          style={{ width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "9px 12px", color: "#eee", fontSize: 13 }} />
                      </div>
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 10.5, color: "#666", marginBottom: 4 }}>Photo (optional)</label>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        {testimonialForm.photo && <img src={testimonialForm.photo} alt="" style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover" }} />}
                        <label className="btn bg" style={{ display: "inline-flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
                          <ImagePlus size={12} />{homeUploading ? "Uploading…" : "Upload Photo"}
                          <input type="file" accept="image/*" hidden disabled={homeUploading} onChange={e => handleTestimonialPhotoUpload(e.target.files)} />
                        </label>
                      </div>
                    </div>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#aaa" }}>
                      <input type="checkbox" checked={testimonialForm.visible ?? true} onChange={e => setTestimonialForm(f => ({ ...f, visible: e.target.checked }))} />
                      Visible on site
                    </label>
                    {homeError && <div style={{ color: "#f56565", fontSize: 12 }}>{homeError}</div>}
                    <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                      <button className="btn bg" disabled={homeSaving} onClick={async () => {
                        if (!testimonialForm.name || !testimonialForm.review) { setHomeError("Name and review are required."); return; }
                        if (await saveHomeRow("testimonials", testimonialForm, testimonialForm.name!)) setTestimonialForm(null);
                      }} style={{ flex: 1, padding: "9px 0" }}>{homeSaving ? "Saving…" : "Save"}</button>
                      <button className="cm-cancel" onClick={() => { setTestimonialForm(null); setHomeError(""); }}>Cancel</button>
                    </div>
              </Modal>
            )}

            {/* ── Gallery photo add/edit modal ── */}
            {galleryForm && (
              <Modal title={galleryForm.id ? "Edit Photo" : "Add Photo"} onClose={() => setGalleryForm(null)}>
                    <div>
                      <label style={{ display: "block", fontSize: 10.5, color: "#666", marginBottom: 4 }}>Photo *</label>
                      {galleryForm.src && <img src={galleryForm.src} alt="" style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", borderRadius: 8, marginBottom: 8 }} />}
                      <label className="btn bg" style={{ display: "inline-flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
                        <ImagePlus size={12} />{homeUploading ? "Uploading…" : galleryForm.src ? "Replace Photo" : "Upload Photo"}
                        <input type="file" accept="image/*" multiple hidden disabled={homeUploading} onChange={e => handleGalleryImageUpload(e.target.files)} />
                      </label>
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 10.5, color: "#666", marginBottom: 4 }}>Label</label>
                      <input type="text" placeholder="Styling Area" value={galleryForm.label ?? ""} onChange={e => setGalleryForm(f => ({ ...f, label: e.target.value }))}
                        style={{ width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "9px 12px", color: "#eee", fontSize: 13 }} />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 10.5, color: "#666", marginBottom: 4 }}>Subtext</label>
                      <input type="text" placeholder="Premium chairs & modern ambiance" value={galleryForm.sub ?? ""} onChange={e => setGalleryForm(f => ({ ...f, sub: e.target.value }))}
                        style={{ width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "9px 12px", color: "#eee", fontSize: 13 }} />
                    </div>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#aaa" }}>
                      <input type="checkbox" checked={galleryForm.visible ?? true} onChange={e => setGalleryForm(f => ({ ...f, visible: e.target.checked }))} />
                      Visible on site
                    </label>
                    {homeError && <div style={{ color: "#f56565", fontSize: 12 }}>{homeError}</div>}
                    <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                      <button className="btn bg" disabled={homeSaving} onClick={async () => {
                        if (!galleryForm.src) { setHomeError("Please upload a photo first."); return; }
                        if (await saveHomeRow("gallery_images", galleryForm, galleryForm.label || "photo")) setGalleryForm(null);
                      }} style={{ flex: 1, padding: "9px 0" }}>{homeSaving ? "Saving…" : "Save"}</button>
                      <button className="cm-cancel" onClick={() => { setGalleryForm(null); setHomeError(""); }}>Cancel</button>
                    </div>
              </Modal>
            )}

            {/* ── FAQ add/edit modal ── */}
            {faqForm && (
              <Modal title={faqForm.id ? "Edit FAQ" : "Add FAQ"} onClose={() => setFaqForm(null)}>
                    <div>
                      <label style={{ display: "block", fontSize: 10.5, color: "#666", marginBottom: 4 }}>Question *</label>
                      <input type="text" value={faqForm.question ?? ""} onChange={e => setFaqForm(f => ({ ...f, question: e.target.value }))}
                        style={{ width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "9px 12px", color: "#eee", fontSize: 13 }} />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 10.5, color: "#666", marginBottom: 4 }}>Answer *</label>
                      <textarea value={faqForm.answer ?? ""} onChange={e => setFaqForm(f => ({ ...f, answer: e.target.value }))} rows={3}
                        style={{ width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "9px 12px", color: "#eee", fontSize: 13, fontFamily: "inherit", resize: "vertical" }} />
                    </div>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#aaa" }}>
                      <input type="checkbox" checked={faqForm.visible ?? true} onChange={e => setFaqForm(f => ({ ...f, visible: e.target.checked }))} />
                      Visible on site
                    </label>
                    {homeError && <div style={{ color: "#f56565", fontSize: 12 }}>{homeError}</div>}
                    <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                      <button className="btn bg" disabled={homeSaving} onClick={async () => {
                        if (!faqForm.question || !faqForm.answer) { setHomeError("Question and answer are required."); return; }
                        if (await saveHomeRow("faqs", faqForm, faqForm.question!)) setFaqForm(null);
                      }} style={{ flex: 1, padding: "9px 0" }}>{homeSaving ? "Saving…" : "Save"}</button>
                      <button className="cm-cancel" onClick={() => { setFaqForm(null); setHomeError(""); }}>Cancel</button>
                    </div>
              </Modal>
            )}

            {/* ── SETTINGS TAB ── */}
            {activeTab === "settings" && (
              <div style={{ maxWidth: 640, display: "flex", flexDirection: "column", gap: 16 }}>
                {settingsError && (
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 8, background: "rgba(245,101,101,0.1)", border: "1px solid rgba(245,101,101,0.3)", borderRadius: 10, padding: "12px 14px", fontSize: 12.5, color: "#f56565" }}>
                    <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                    <span>{settingsError}</span>
                  </div>
                )}
                {SETTING_GROUPS.map(group => (
                  <div key={group.title} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, overflow: "hidden" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      <group.icon size={15} color="#c9a84c" />
                      <span style={{ fontSize: 13.5, fontWeight: 700, color: "#ddd" }}>{group.title}</span>
                    </div>
                    <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
                      {group.keys.map(field => field.key === "hero_bg_image" ? (
                        <div key={field.key}>
                          <label style={{ display: "block", fontSize: 10.5, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#666", marginBottom: 8 }}>
                            Background Images {getHeroImages().length > 1 && <span style={{ color: "#c9a84c" }}>({getHeroImages().length} — slides automatically on the site)</span>}
                          </label>
                          {getHeroImages().length > 0 && (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
                              {getHeroImages().map((url, i) => (
                                <div key={url} style={{ position: "relative", width: 110 }}>
                                  <div style={{ width: 110, height: 74, borderRadius: 8, overflow: "hidden", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                                    <img src={url} alt={`Hero background ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                  </div>
                                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                                    <a href={url} target="_blank" rel="noreferrer" title="View full size" style={{ fontSize: 10, color: "#7ba8ff", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 3 }}>
                                      <Eye size={10} />View
                                    </a>
                                    <button onClick={() => removeHeroImage(url)} title="Remove" style={{ background: "none", border: "none", color: "#f56565", cursor: "pointer", fontSize: 10, padding: 0, display: "inline-flex", alignItems: "center", gap: 3 }}>
                                      <Trash2 size={10} />Remove
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          <label className="btn bg" style={{ display: "inline-flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
                            <ImagePlus size={12} />{heroImgUploading ? "Uploading…" : "Upload Image(s)"}
                            <input type="file" accept="image/*" multiple hidden disabled={heroImgUploading} onChange={e => handleHeroImageUpload(e.target.files)} />
                          </label>
                          <p style={{ fontSize: 11, color: "#555", marginTop: 6 }}>
                            Each image here shows exactly as it will on the live homepage banner — add more than one and they'll auto-rotate.
                          </p>
                        </div>
                      ) : (
                        <div key={field.key} style={{ display: "flex", alignItems: "flex-end", gap: 10 }}>
                          <div style={{ flex: 1 }}>
                            <label style={{ display: "block", fontSize: 10.5, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#666", marginBottom: 6 }}>
                              {field.label}
                            </label>
                            {field.multiline ? (
                              <textarea
                                placeholder={field.placeholder}
                                value={settings[field.key] ?? ""}
                                onChange={e => setSettings(p => ({ ...p, [field.key]: e.target.value }))}
                                rows={2}
                                style={{ width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "9px 12px", color: "#eee", fontSize: 13, fontFamily: "inherit", resize: "vertical" }}
                              />
                            ) : (
                              <input
                                type="text"
                                placeholder={field.placeholder}
                                value={settings[field.key] ?? ""}
                                onChange={e => setSettings(p => ({ ...p, [field.key]: e.target.value }))}
                                style={{ width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "9px 12px", color: "#eee", fontSize: 13, fontFamily: "inherit" }}
                              />
                            )}
                          </div>
                          <button
                            className="btn bg"
                            disabled={savingKey === field.key}
                            onClick={() => saveSetting(field.key)}
                            style={{ display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}
                          >
                            {savedKey === field.key ? <CheckCircle size={12} /> : <Save size={12} />}
                            {savedKey === field.key ? "Saved" : savingKey === field.key ? "Saving…" : "Save"}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <p style={{ fontSize: 11.5, color: "#555" }}>
                  Each field saves independently — click "Save" next to a field after changing it.
                </p>
              </div>
            )}

            {/* ── BACKUP TAB ── */}
            {activeTab === "backup" && (<>
              {/* Status bar */}
              {(() => {
                const lastBk = typeof window !== "undefined" ? localStorage.getItem("bg_last_backup") : null;
                const isToday = lastBk === new Date().toDateString();
                return (
                  <div style={{ display:"flex", alignItems:"center", gap:12, background: isToday ? "rgba(79,208,128,0.06)" : "rgba(245,180,50,0.07)", border:`1px solid ${isToday?"rgba(79,208,128,0.2)":"rgba(245,180,50,0.2)"}`, borderRadius:12, padding:"12px 16px", marginBottom:18 }}>
                    <span style={{ display:"flex",alignItems:"center" }}>{isToday ? <CheckCircle size={20} color="#4fd080"/> : <AlertTriangle size={20} color="#f5b432"/>}</span>
                    <div>
                      <div style={{ fontSize:13, fontWeight:600, color: isToday ? "#4fd080" : "#f5b432" }}>
                        {isToday ? "All data backed up today" : lastBk ? `Last backup: ${new Date(lastBk).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" })} — backup recommended` : "No backup found — back up now"}
                      </div>
                      <div style={{ fontSize:11, color:"#383838", marginTop:2 }}>
                        {bookings.length} appointments · {contacts.length} messages · {staffs.length} staff members
                      </div>
                    </div>
                    <div style={{ marginLeft:"auto", fontSize:11, color:"#2a2a2a" }}>
                      {autoBackup ? <span style={{display:"inline-flex",alignItems:"center",gap:4}}><RefreshCw size={11}/>Auto ON</span> : "Auto OFF"}
                    </div>
                  </div>
                );
              })()}

              <div className="bk-grid">
                {/* Left — Backup actions */}
                <div>
                  <div className="bk-card" style={{ marginBottom:16 }}>
                    <div className="bk-card-title"><span className="bk-status-dot" style={{ background:"#c9a84c" }} /> Database Backup</div>

                    <button className="bk-btn bk-btn-primary" onClick={backupFull} disabled={backingUp}>
                      <span className="bk-btn-icon">{backingUp ? <Database size={18} strokeWidth={1.5} style={{opacity:0.5}}/> : <Database size={18} strokeWidth={1.5}/>}</span>
                      <span className="bk-btn-info">
                        <span className="bk-btn-label">{backingUp ? "Backing up…" : "Full Backup"}</span>
                        <span className="bk-btn-sub">All tables — appointments, contacts, staff</span>
                      </span>
                    </button>

                    <button className="bk-btn" onClick={() => backupTable("appointments", "Appointments Backup")} disabled={backingUp}>
                      <span className="bk-btn-icon"><CalendarDays size={18} strokeWidth={1.5}/></span>
                      <span className="bk-btn-info">
                        <span className="bk-btn-label">Appointments Only</span>
                        <span className="bk-btn-sub">{bookings.length} records</span>
                      </span>
                    </button>

                    <button className="bk-btn" onClick={() => backupTable("contacts", "Contacts Backup")} disabled={backingUp}>
                      <span className="bk-btn-icon"><MessageSquare size={18} strokeWidth={1.5}/></span>
                      <span className="bk-btn-info">
                        <span className="bk-btn-label">Messages Only</span>
                        <span className="bk-btn-sub">{contacts.length} messages</span>
                      </span>
                    </button>

                    <button className="bk-btn" onClick={() => backupTable("staff", "Staff Backup")} disabled={backingUp}>
                      <span className="bk-btn-icon"><Users size={18} strokeWidth={1.5}/></span>
                      <span className="bk-btn-info">
                        <span className="bk-btn-label">Staff Data Only</span>
                        <span className="bk-btn-sub">{staffs.length} staff members</span>
                      </span>
                    </button>

                    <div className="bk-toggle">
                      <span className="bk-toggle-label" style={{display:"flex",alignItems:"flex-start",gap:8}}><RefreshCw size={14} style={{marginTop:2,flexShrink:0}}/><span>Daily Auto-Backup <span style={{ fontSize:11, color:"#2a2a2a", display:"block" }}>Runs automatically when you open admin panel</span></span></span>
                      <label className="bk-switch">
                        <input type="checkbox" checked={autoBackup} onChange={e => toggleAutoBackup(e.target.checked)} />
                        <span className="bk-slider" />
                      </label>
                    </div>
                  </div>

                  {/* Media info */}
                  <div className="bk-card">
                    <div className="bk-card-title"><span className="bk-status-dot" style={{ background:"#5ab4f5" }} /> Media & Assets</div>
                    {[
                      { icon:<Users size={17} strokeWidth={1.5}/>, name:"Team Photos", path:"/images/team/", info:"8 photos" },
                      { icon:<Database size={17} strokeWidth={1.5}/>, name:"Salon Photos", path:"/images/", info:"Interior & front" },
                      { icon:<Shield size={17} strokeWidth={1.5}/>, name:"Logo", path:"/images/logo.png", info:"Brand asset" },
                    ].map(m => (
                      <div key={m.name} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 0", borderBottom:"1px solid rgba(255,255,255,0.03)" }}>
                        <span style={{ display:"flex", alignItems:"center", color:"#666" }}>{m.icon}</span>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:12, fontWeight:600, color:"#888" }}>{m.name}</div>
                          <div style={{ fontSize:11, color:"#333" }}>{m.path} · {m.info}</div>
                        </div>
                        <span style={{ fontSize:10, background:"rgba(90,180,245,0.07)", border:"1px solid rgba(90,180,245,0.12)", padding:"2px 8px", borderRadius:6, color:"#5ab4f5" }}>Static</span>
                      </div>
                    ))}
                    <div style={{ marginTop:12, padding:"10px 12px", background:"rgba(90,180,245,0.04)", border:"1px solid rgba(90,180,245,0.08)", borderRadius:8, fontSize:11, color:"#383838", lineHeight:1.6 }}>
                      <span style={{display:"inline-flex",alignItems:"center",gap:6,verticalAlign:"middle"}}><Info size={12} color="#5ab4f5"/>Static media files are part of your deployment. To backup, download the project folder or use GitHub.</span>
                    </div>
                  </div>
                </div>

                {/* Right — Backup history */}
                <div className="bk-card" style={{ alignSelf:"start" }}>
                  <div className="bk-card-title" style={{ justifyContent:"space-between" }}>
                    <span><span className="bk-status-dot" style={{ background:"#4fd080" }} /> Backup History</span>
                    {backupHistory.length > 0 && (
                      <button onClick={() => { setBackupHistory([]); try { localStorage.removeItem("bg_backup_history"); } catch {} }} style={{ background:"none", border:"none", color:"#2a2a2a", cursor:"pointer", fontSize:11, fontFamily:"'Inter',sans-serif" }}>Clear</button>
                    )}
                  </div>
                  {backupHistory.length === 0
                    ? <div className="bk-empty">No backups yet<br /><span style={{ fontSize:11, color:"#222" }}>Click any backup button above</span></div>
                    : backupHistory.map((h, i) => (
                        <div key={i} className="bk-hist-row">
                          <span className="bk-hist-icon" style={{display:"flex",alignItems:"center"}}><Database size={15} strokeWidth={1.5}/></span>
                          <div className="bk-hist-info">
                            <div className="bk-hist-type">{h.type}</div>
                            <div className="bk-hist-date">{new Date(h.date).toLocaleString("en-IN", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" })}</div>
                          </div>
                          <span className="bk-hist-size">{h.size}</span>
                        </div>
                      ))
                  }
                </div>
              </div>
            </>)}

            {/* ── LOGS TAB ── */}
            {activeTab === "logs" && (<>
              <div className="log-header">
                <span className="log-title" style={{display:"inline-flex",alignItems:"center",gap:6}}><Activity size={14}/>Activity Log</span>
                <span className="log-count">{activityLogs.length} events</span>
              </div>

              {activityLogs.length === 0 ? (
                <div className="log-empty">
                  <div className="log-empty-icon" style={{display:"flex",justifyContent:"center"}}><Activity size={28} color="#333"/></div>
                  <div className="log-empty-text">No activity recorded yet</div>
                  <div className="log-empty-sub">Actions like status changes, deletions, and backups will appear here</div>
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table className="log-table">
                    <thead>
                      <tr>
                        <th>Time</th>
                        <th>By</th>
                        <th>Action</th>
                        <th>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activityLogs.map((log: any, i: number) => {
                        const action: string = log.action || "";
                        const badgeClass =
                          action === "STATUS_CHANGED"   ? "log-badge-status"  :
                          action === "BOOKING_CANCELLED"? "log-badge-cancel"  :
                          action === "BOOKING_DELETED"  ? "log-badge-delete"  :
                          action === "CONTACT_DELETED"  ? "log-badge-delete"  :
                          action === "STAFF_ASSIGNED"   ? "log-badge-assign"  :
                          action.startsWith("BACKUP")   ? "log-badge-backup"  :
                          action === "LOGIN"            ? "log-badge-login"   :
                          "log-badge-default";
                        const actionLabel =
                          action === "STATUS_CHANGED"   ? "Status Changed"   :
                          action === "BOOKING_CANCELLED"? "Cancelled"        :
                          action === "BOOKING_DELETED"  ? "Deleted"          :
                          action === "CONTACT_DELETED"  ? "Msg Deleted"      :
                          action === "STAFF_ASSIGNED"   ? "Staff Assigned"   :
                          action === "BACKUP_FULL"      ? "Full Backup"      :
                          action === "BACKUP_TABLE"     ? "Table Backup"     :
                          action === "LOGIN"            ? "Login"            :
                          action.replace(/_/g, " ");
                        return (
                          <tr key={i}>
                            <td className="log-time">
                              {log.created_at
                                ? new Date(log.created_at).toLocaleString("en-IN", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" })
                                : "—"}
                            </td>
                            <td className="log-actor">{log.actor || "System"}</td>
                            <td><span className={`log-badge ${badgeClass}`}>{actionLabel}</span></td>
                            <td className="log-detail">{log.details || "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>)}

          </div>
        </div>

        {/* BOOKING DETAIL MODAL */}
        {selectedBooking && (
          <div className="mb" onClick={()=>setSelectedBooking(null)}>
            <div className="mbox" onClick={e=>e.stopPropagation()}>
              <div className="mt" style={{display:"flex",alignItems:"center",gap:7}}><CalendarDays size={15}/>Appointment #{selectedBooking.id}
                <button onClick={()=>setSelectedBooking(null)} style={{ marginLeft:"auto",background:"none",border:"none",color:"#484848",cursor:"pointer",display:"flex",alignItems:"center" }}><X size={18}/></button>
              </div>

              {[
                ["Client",   selectedBooking.full_name],
                ["Phone",    selectedBooking.phone],
                ["Email",    selectedBooking.email || "—"],
                ["Service",  selectedBooking.service],
                ["Date",     selectedBooking.booking_date],
                ["Time",     selectedBooking.booking_time],
                ["Type",     selectedBooking.address ? "Home Service" : "Salon Visit"],
                ["Address",  selectedBooking.address || "N/A"],
                ["Status",   selectedBooking.status],
                ["Staff",    selectedBooking.staff || "Not assigned"],
                ["Price",    price(selectedBooking) ? `₹${price(selectedBooking).toLocaleString()}` : "—"],
              ].map(([k,v]) => (
                <div className="mr" key={k}>
                  <span className="mk">{k}</span>
                  {k === "Email" && selectedBooking.email
                    ? <a href={`mailto:${selectedBooking.email}`} className="mv" style={{ color:"#c9a84c", textDecoration:"none" }}>{v}</a>
                    : <span className="mv" style={{ color: k==="Price"?"#4fd080":k==="Status"?(STATUS_CONFIG[v]?.text||"#ddd"):"#ddd" }}>{v}</span>
                  }
                </div>
              ))}

              <div className="hb">
                <div>
                  <div className="hs">Total Visits</div>
                  <div className="hv" style={{ color:"#c9a84c" }}>{custHistory.length}</div>
                </div>
                <div>
                  <div className="hs">Total Spent</div>
                  <div className="hv" style={{ color:"#4fd080" }}>₹{custSpent.toLocaleString()}</div>
                </div>
                <div>
                  <div className="hs">Last Visit</div>
                  <div style={{ fontSize:13,color:"#bbb",marginTop:3 }}>{custHistory[0]?.booking_date || "—"}</div>
                </div>
                <div>
                  <div className="hs">Fav Service</div>
                  <div style={{ fontSize:11,color:"#5ab4f5",marginTop:3 }}>
                    {Object.entries(custHistory.reduce((a,b)=>{a[b.service]=(a[b.service]||0)+1;return a;},{}as Record<string,number>)).sort((a,b)=>b[1]-a[1])[0]?.[0] || "—"}
                  </div>
                </div>
              </div>

              <div className="ma">
                <button className="btn bw" onClick={()=>sendWA(selectedBooking.phone,"")} style={{display:"inline-flex",alignItems:"center",gap:5}}><MessageCircle size={13}/>WhatsApp</button>
                <button className="btn bc" onClick={()=>{updateStatus(selectedBooking.id,"Confirmed");sendWA(selectedBooking.phone,`Hello ${selectedBooking.full_name}, your appointment is confirmed ✅\nService: ${selectedBooking.service}\n📅 ${selectedBooking.booking_date} at ${selectedBooking.booking_time}\nBella & Guy Salon`);}} style={{display:"inline-flex",alignItems:"center",gap:5}}><Check size={13}/>Confirm</button>
                <button className="btn bg" onClick={()=>sendWA(selectedBooking.phone, `Hello ${selectedBooking.full_name}, thank you for visiting Bella & Guy Salon!\n\nWe'd love your feedback!\nLeave a review on Google:\nhttps://g.page/r/bella-guy-salon/review\n\nThank you!\nBella & Guy Salon`)} style={{display:"inline-flex",alignItems:"center",gap:5}}><Star size={13}/>Request Review</button>
                <button className="btn bx" onClick={()=>showConfirm("Cancel Booking",`Mark ${selectedBooking.full_name}'s ${selectedBooking.service} on ${selectedBooking.booking_date} as Cancelled?`,async()=>{setConfirmModal(null);await updateStatus(selectedBooking.id,"Cancelled");sendWA(selectedBooking.phone,`Hello ${selectedBooking.full_name}, unfortunately we couldn't confirm your appointment.\nService: ${selectedBooking.service} on ${selectedBooking.booking_date}.\nPlease contact us for another slot.\nBella & Guy Salon`);setSelectedBooking(null);},{confirmLabel:"Yes, Cancel It",icon:<Ban size={22}/>})} style={{display:"inline-flex",alignItems:"center",gap:5}}><Ban size={13}/>Cancel</button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ── Custom Confirm Modal ── */}
      {confirmModal && (
        <>
          <style>{`
            .cm-overlay {
              position: fixed; inset: 0; z-index: 9999;
              background: rgba(0,0,0,0.6);
              backdrop-filter: blur(6px);
              display: flex; align-items: center; justify-content: center;
              animation: cmFadeIn 0.2s ease;
            }
            @keyframes cmFadeIn { from{opacity:0} to{opacity:1} }
            .cm-box {
              background: rgba(18,14,10,0.92);
              backdrop-filter: blur(40px) saturate(180%);
              border: 1px solid rgba(255,255,255,0.1);
              border-top: 1px solid rgba(255,255,255,0.18);
              border-radius: 20px;
              padding: 32px 28px 24px;
              width: 100%; max-width: 360px; margin: 16px;
              box-shadow:
                inset 0 1.5px 0 rgba(255,255,255,0.12),
                0 32px 64px rgba(0,0,0,0.6),
                0 4px 16px rgba(0,0,0,0.3);
              animation: cmSlideUp 0.25s cubic-bezier(0.22,1,0.36,1);
            }
            @keyframes cmSlideUp { from{opacity:0;transform:translateY(16px) scale(0.97)} to{opacity:1;transform:translateY(0) scale(1)} }
            .cm-icon {
              width: 44px; height: 44px; border-radius: 12px;
              background: rgba(245,101,101,0.1); border: 1px solid rgba(245,101,101,0.2);
              display: flex; align-items: center; justify-content: center;
              font-size: 18px; margin-bottom: 16px;
            }
            .cm-title {
              font-size: 16px; font-weight: 700; color: #fff;
              margin-bottom: 8px; font-family: 'Inter', sans-serif;
            }
            .cm-msg {
              font-size: 13px; color: rgba(255,255,255,0.45);
              line-height: 1.6; margin-bottom: 24px;
            }
            .cm-btns { display: flex; gap: 10px; }
            .cm-cancel {
              flex: 1; padding: 11px;
              background: rgba(255,255,255,0.05);
              border: 1px solid rgba(255,255,255,0.1);
              border-radius: 10px; color: rgba(255,255,255,0.6);
              font-size: 13px; font-weight: 600; cursor: pointer;
              font-family: 'Inter', sans-serif;
              transition: all 0.2s ease;
            }
            .cm-cancel:hover { background: rgba(255,255,255,0.09); color: #fff; }
            .cm-confirm {
              flex: 1; padding: 11px;
              background: rgba(245,101,101,0.15);
              border: 1px solid rgba(245,101,101,0.3);
              border-radius: 10px; color: #f87171;
              font-size: 13px; font-weight: 700; cursor: pointer;
              font-family: 'Inter', sans-serif;
              transition: all 0.2s ease;
            }
            .cm-confirm:hover { background: rgba(245,101,101,0.25); border-color: rgba(245,101,101,0.5); }
            .cm-confirm.warn {
              background: rgba(245,180,50,0.12);
              border-color: rgba(245,180,50,0.3);
              color: #f5b432;
            }
            .cm-confirm.warn:hover { background: rgba(245,180,50,0.22); border-color: rgba(245,180,50,0.5); }
          `}</style>
          <div className="cm-overlay" onClick={() => setConfirmModal(null)}>
            <div className="cm-box" onClick={e => e.stopPropagation()}>
              <div className="cm-icon">{confirmModal.icon || <AlertTriangle size={22}/>}</div>
              <div className="cm-title">{confirmModal.title}</div>
              <div className="cm-msg">{confirmModal.message}</div>
              <div className="cm-btns">
                <button className="cm-cancel" onClick={() => setConfirmModal(null)}>Keep</button>
                <button className={`cm-confirm${confirmModal.danger === false ? " warn" : ""}`} onClick={confirmModal.onConfirm}>{confirmModal.confirmLabel || "Confirm"}</button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── WhatsApp Reminder Modal ── */}
      {showReminderModal && (
        <div style={{ position:"fixed",inset:0,zIndex:10000,background:"rgba(0,0,0,0.72)",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",padding:20 }}
          onClick={() => setShowReminderModal(false)}>
          <div style={{ background:"rgba(14,11,7,0.97)",border:"1px solid rgba(201,168,76,0.2)",borderRadius:18,padding:"28px 24px",width:"100%",maxWidth:460,maxHeight:"80vh",overflowY:"auto" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20 }}>
              <div style={{ color:"#f5c75a",fontWeight:700,fontSize:15,display:"flex",alignItems:"center",gap:8 }}>
                <CalendarDays size={16}/> Tomorrow's Reminders ({tmrBookings.length})
              </div>
              <button onClick={() => setShowReminderModal(false)} style={{ background:"none",border:"none",color:"rgba(255,255,255,0.35)",cursor:"pointer",padding:4 }}><X size={16}/></button>
            </div>
            <p style={{ fontSize:12,color:"rgba(255,255,255,0.35)",marginBottom:18 }}>Click each button to send WhatsApp reminder individually</p>
            <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
              {tmrBookings.map(b => (
                <div key={b.id} style={{ background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:10,padding:"12px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12 }}>
                  <div>
                    <div style={{ color:"#eee",fontWeight:600,fontSize:13 }}>{b.full_name}</div>
                    <div style={{ color:"rgba(201,168,76,0.7)",fontSize:11,marginTop:2 }}>{b.service} · {b.booking_time}</div>
                  </div>
                  <button className="btn bw" style={{ flexShrink:0,display:"inline-flex",alignItems:"center",gap:5 }}
                    onClick={() => sendWA(b.phone, `Hello ${b.full_name}! 👋\n\nThis is a reminder from *Bella & Guy Salon* 💇‍♀️\n\nYour appointment is *tomorrow*:\n📅 ${b.booking_date}\n⏰ ${b.booking_time}\n✂️ ${b.service}\n\nWe look forward to seeing you! Please let us know if you need to reschedule.\n\n— Bella & Guy Team`)}>
                    <MessageCircle size={12}/> Send WA
                  </button>
                </div>
              ))}
            </div>
            <div style={{ marginTop:18,textAlign:"center" }}>
              <button className="btn bv" onClick={() => setShowReminderModal(false)}>Done</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
