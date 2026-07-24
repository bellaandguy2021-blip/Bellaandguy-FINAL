"use client";

/**
 * Admin SEO Manager — rendered inside the admin panel's "SEO" tab.
 *
 * Sub-sections:
 *  • Pages       — per-page metadata editor (page_seo table) with live Google /
 *                  Open Graph / Twitter previews. Zero code changes needed to
 *                  update any page's SEO.
 *  • Redirects   — 301/302 redirect manager (redirects table, applied by proxy.ts).
 *  • Images      — gallery image alt-text editor (Image SEO).
 *  • Tracking    — GA4 / GTM / Clarity / Meta Pixel IDs + Google & Bing
 *                  site-verification codes (settings table).
 *  • Health      — live SEO audit: missing/duplicate/overlong titles &
 *                  descriptions, missing alt text, redirect issues, health score.
 */

import React, { useEffect, useMemo, useState } from "react";
import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin";
import { allCategories, slugifyService } from "@/lib/servicesData";
import { getDynamicCategories, mergeCategories } from "@/lib/dynamicServices";
import type { PageSeoRow } from "@/lib/seo";
import type { DBGalleryImage } from "@/lib/homepageContent";
import {
  Search, Globe, ArrowRightLeft, Image as ImageIcon, BarChart2, HeartPulse,
  Save, Trash2, Plus, CheckCircle, AlertTriangle, AlertCircle, Pencil, X, RefreshCw, ExternalLink,
} from "lucide-react";

/* ── Constants ──────────────────────────────────────────────────────────── */

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://bellaandguy.in").replace(/\/+$/, "");

/** Static pages + their code-level default SEO (mirrors each page's buildMetadata call). */
const STATIC_PAGES: { path: string; label: string; defaultTitle: string; defaultDescription: string }[] = [
  { path: "/",      label: "Homepage",         defaultTitle: "Bella & Guy Salon | Premium Unisex Salon & Home Beauty Service — Wave City, Ghaziabad", defaultDescription: "Premium unisex salon in Wave City, Ghaziabad. Expert facials, waxing, hair spa, hair color, manicure & men's grooming — at the salon or at your doorstep. Book your home service today!" },
  { path: "/about", label: "About Us",         defaultTitle: "About Us — Our Story, Promise & Terms | Bella & Guy Salon", defaultDescription: "Founded in 2020, Bella & Guy Unisex Salon delivers premium beauty & grooming at affordable prices in Wave City, Ghaziabad — 100% genuine products, transparent service, and home beauty services you can trust." },
  { path: "/book",  label: "Book Appointment", defaultTitle: "Book an Appointment — Salon & Home Beauty Services | Bella & Guy Salon", defaultDescription: "Book your salon or home beauty appointment in Wave City, Ghaziabad. Facials, waxing, hair spa, hair color, manicure, men's grooming & more — choose your service, date and time in minutes." },
];

const TRACKING_FIELDS: { key: string; label: string; placeholder: string; help: string }[] = [
  { key: "seo_google_verification", label: "Google Search Console Verification", placeholder: "abc123…", help: "The content value of the google-site-verification meta tag." },
  { key: "seo_bing_verification",   label: "Bing Webmaster Verification",        placeholder: "ABC123…", help: "The content value of the msvalidate.01 meta tag." },
  { key: "seo_ga4_id",              label: "Google Analytics 4 ID",              placeholder: "G-XXXXXXXXXX", help: "Loads gtag.js only when set." },
  { key: "seo_gtm_id",              label: "Google Tag Manager ID",              placeholder: "GTM-XXXXXXX", help: "Loads GTM only when set." },
  { key: "seo_clarity_id",          label: "Microsoft Clarity ID",               placeholder: "abcdefghij", help: "Loads Clarity only when set." },
  { key: "seo_meta_pixel_id",       label: "Meta (Facebook) Pixel ID",           placeholder: "1234567890", help: "Loads the pixel only when set." },
];

type SubTab = "pages" | "redirects" | "images" | "tracking" | "health";

interface SitePage {
  path: string;
  label: string;
  defaultTitle: string;
  defaultDescription: string;
  group: string;
}

interface RedirectRow {
  id: number;
  from_path: string;
  to_path: string;
  status_code: number;
  enabled: boolean;
}

const emptySeoForm = (path: string): PageSeoRow => ({
  path,
  title: null, description: null, focus_keyword: null, canonical_url: null,
  robots_index: true, robots_follow: true,
  og_title: null, og_description: null, og_image: null,
  twitter_card: "summary_large_image", twitter_title: null, twitter_description: null,
});

/* ── Component ──────────────────────────────────────────────────────────── */

export default function SeoManager({ notify }: { notify: (msg: string) => void }) {
  const [subTab, setSubTab] = useState<SubTab>("pages");
  const [pages, setPages] = useState<SitePage[]>([]);
  const [seoRows, setSeoRows] = useState<Map<string, PageSeoRow>>(new Map());
  const [redirects, setRedirects] = useState<RedirectRow[]>([]);
  const [galleryImages, setGalleryImages] = useState<DBGalleryImage[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [tableMissing, setTableMissing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pageFilter, setPageFilter] = useState("");
  const [editingPath, setEditingPath] = useState<string | null>(null);
  const [form, setForm] = useState<PageSeoRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [newRedirect, setNewRedirect] = useState({ from_path: "", to_path: "", status_code: 301 });
  const [altDrafts, setAltDrafts] = useState<Record<number, string>>({});

  /* ── Load everything ── */
  // Note: doesn't set loading itself — `loading` starts true, and the Refresh
  // button sets it from its event handler (keeps effects setState-free).
  const loadAll = async () => {
    try {
      const dynamicCats = await getDynamicCategories();
      const cats = mergeCategories(allCategories, dynamicCats);
      const servicePages: SitePage[] = cats.flatMap(cat =>
        cat.services.map(svc => ({
          path: `/services/${cat.id}/${slugifyService(svc.name)}`,
          label: `${svc.name} (${cat.label})`,
          defaultTitle: `${svc.name} — ${cat.label} | Bella & Guy Salon`,
          defaultDescription: svc.desc ?? cat.desc,
          group: cat.label,
        }))
      );
      // de-dupe identical slugs within a category
      const seen = new Set<string>();
      setPages([
        ...STATIC_PAGES.map(p => ({ ...p, group: "Site Pages" })),
        ...servicePages.filter(p => !seen.has(p.path) && seen.add(p.path)),
      ]);

      const [seoRes, redirectRes, galleryRes, settingsRes] = await Promise.all([
        supabase.from("page_seo").select("*"),
        supabase.from("redirects").select("*").order("id"),
        supabase.from("gallery_images").select("*").order("sort_order"),
        supabase.from("settings").select("key, value"),
      ]);

      if (seoRes.error?.message?.includes("page_seo")) setTableMissing(true);
      const map = new Map<string, PageSeoRow>();
      (seoRes.data as PageSeoRow[] | null)?.forEach(r => map.set(r.path, r));
      setSeoRows(map);
      setRedirects((redirectRes.data as RedirectRow[] | null) ?? []);
      setGalleryImages((galleryRes.data as DBGalleryImage[] | null) ?? []);
      const s: Record<string, string> = {};
      (settingsRes.data as { key: string; value: string }[] | null)?.forEach(r => { s[r.key] = r.value; });
      setSettings(s);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []); // load once on mount

  const refresh = () => { setLoading(true); loadAll(); };

  /* ── Page SEO editing ── */
  const openEditor = (page: SitePage) => {
    setEditingPath(page.path);
    setForm(seoRows.get(page.path) ?? emptySeoForm(page.path));
  };

  const savePageSeo = async () => {
    if (!form || !editingPath) return;
    setSaving(true);
    const { error } = await supabase.from("page_seo").upsert({ ...form, path: editingPath, updated_at: new Date().toISOString() });
    setSaving(false);
    if (error) { notify("❌ " + (error.message.includes("page_seo") ? "Run supabase/seo.sql in the Supabase SQL Editor first." : error.message)); return; }
    setSeoRows(prev => new Map(prev).set(editingPath, { ...form, path: editingPath }));
    notify("✅ SEO saved for " + editingPath);
    setEditingPath(null); setForm(null);
  };

  const resetPageSeo = async () => {
    if (!editingPath) return;
    await supabase.from("page_seo").delete().eq("path", editingPath);
    setSeoRows(prev => { const m = new Map(prev); m.delete(editingPath); return m; });
    notify("↩️ Reverted " + editingPath + " to automatic SEO");
    setEditingPath(null); setForm(null);
  };

  /* ── Redirects ── */
  const addRedirect = async () => {
    const from = newRedirect.from_path.trim();
    const to = newRedirect.to_path.trim();
    if (!from || !to) { notify("⚠️ Both paths are required"); return; }
    if (from === to) { notify("⚠️ From and To can't be the same"); return; }
    const { data, error } = await supabase.from("redirects")
      .insert({ from_path: from.startsWith("/") ? from : "/" + from, to_path: to, status_code: newRedirect.status_code, enabled: true })
      .select().single();
    if (error) { notify("❌ " + (error.message.includes("redirects") ? "Run supabase/seo.sql in the Supabase SQL Editor first." : error.message)); return; }
    setRedirects(prev => [...prev, data as RedirectRow]);
    setNewRedirect({ from_path: "", to_path: "", status_code: 301 });
    notify("✅ Redirect added");
  };

  const toggleRedirect = async (r: RedirectRow) => {
    await supabase.from("redirects").update({ enabled: !r.enabled }).eq("id", r.id);
    setRedirects(prev => prev.map(x => x.id === r.id ? { ...x, enabled: !x.enabled } : x));
  };

  const deleteRedirect = async (id: number) => {
    await supabase.from("redirects").delete().eq("id", id);
    setRedirects(prev => prev.filter(x => x.id !== id));
    notify("🗑️ Redirect deleted");
  };

  /* ── Image alt text ── */
  const saveAlt = async (img: DBGalleryImage) => {
    const alt = altDrafts[img.id] ?? img.alt_text ?? "";
    const { error } = await supabase.from("gallery_images").update({ alt_text: alt }).eq("id", img.id);
    if (error) { notify("❌ " + (error.message.includes("alt_text") ? "Run supabase/seo.sql to add the alt_text column first." : error.message)); return; }
    setGalleryImages(prev => prev.map(g => g.id === img.id ? { ...g, alt_text: alt } : g));
    notify("✅ Alt text saved");
  };

  /* ── Tracking settings ── */
  const saveSetting = async (key: string) => {
    setSavingKey(key);
    const { error } = await supabase.from("settings").upsert({ key, value: settings[key] ?? "", updated_at: new Date().toISOString() });
    setSavingKey(null);
    if (error) { notify("❌ " + error.message); return; }
    notify("✅ Saved");
  };

  /* ── Health audit (computed live from the same data the site uses) ── */
  const audit = useMemo(() => {
    const issues: { severity: "error" | "warn"; area: string; message: string }[] = [];
    const titles = new Map<string, string[]>();
    const descriptions = new Map<string, string[]>();

    for (const p of pages) {
      const row = seoRows.get(p.path);
      const title = row?.title || p.defaultTitle;
      const desc = row?.description || p.defaultDescription;

      if (!title) issues.push({ severity: "error", area: p.path, message: "Missing meta title" });
      else {
        if (title.length > 65) issues.push({ severity: "warn", area: p.path, message: `Title too long (${title.length} chars — aim ≤ 60)` });
        titles.set(title, [...(titles.get(title) ?? []), p.path]);
      }
      if (!desc) issues.push({ severity: "error", area: p.path, message: "Missing meta description" });
      else {
        if (desc.length > 165) issues.push({ severity: "warn", area: p.path, message: `Description too long (${desc.length} chars — aim ≤ 160)` });
        if (desc.length < 50) issues.push({ severity: "warn", area: p.path, message: `Description too short (${desc.length} chars — aim ≥ 50)` });
        descriptions.set(desc, [...(descriptions.get(desc) ?? []), p.path]);
      }
      if (row && !row.robots_index) issues.push({ severity: "warn", area: p.path, message: "Set to NOINDEX — page will drop out of Google" });
      if (row?.canonical_url && !/^(\/|https?:\/\/)/.test(row.canonical_url)) issues.push({ severity: "error", area: p.path, message: "Canonical URL must start with / or https://" });
    }
    for (const [t, paths] of titles) if (paths.length > 1) issues.push({ severity: "error", area: paths.join(", "), message: `Duplicate title used on ${paths.length} pages: “${t.slice(0, 60)}…”` });
    for (const [, paths] of descriptions) if (paths.length > 1) issues.push({ severity: "warn", area: paths.join(", "), message: `Duplicate description on ${paths.length} pages` });

    for (const g of galleryImages) {
      if (!g.alt_text?.trim() && !g.label?.trim()) issues.push({ severity: "warn", area: "Gallery", message: `Image #${g.id} has no alt text or label` });
    }

    const redirectTargets = new Set(redirects.filter(r => r.enabled).map(r => r.from_path));
    for (const r of redirects.filter(r => r.enabled)) {
      if (redirectTargets.has(r.to_path)) issues.push({ severity: "warn", area: r.from_path, message: `Redirect chain: ${r.from_path} → ${r.to_path} → …` });
      if (r.from_path === r.to_path) issues.push({ severity: "error", area: r.from_path, message: "Redirect loops to itself" });
      if (!pages.some(p => p.path === r.to_path) && !/^https?:\/\//.test(r.to_path) && !["/","/about","/book"].includes(r.to_path)) {
        issues.push({ severity: "warn", area: r.from_path, message: `Redirect target ${r.to_path} is not a known page` });
      }
    }

    const errors = issues.filter(i => i.severity === "error").length;
    const warns = issues.filter(i => i.severity === "warn").length;
    const score = Math.max(0, Math.min(100, 100 - errors * 8 - warns * 2));
    return { issues, errors, warns, score };
  }, [pages, seoRows, galleryImages, redirects]);

  /* ── Derived ── */
  const filteredPages = useMemo(() => {
    const q = pageFilter.trim().toLowerCase();
    if (!q) return pages;
    return pages.filter(p => p.path.toLowerCase().includes(q) || p.label.toLowerCase().includes(q));
  }, [pages, pageFilter]);

  const editingPage = editingPath ? pages.find(p => p.path === editingPath) : null;

  /* ── Styles (matches the admin panel's dark language) ── */
  const card: React.CSSProperties = { background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: 18 };
  const label: React.CSSProperties = { display: "block", fontSize: 10.5, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#666", marginBottom: 6 };
  const input: React.CSSProperties = { width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "9px 12px", color: "#eee", fontSize: 13, fontFamily: "inherit" };
  const btn: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, background: "linear-gradient(135deg,#C9A84C,#E8C96D)", color: "#080808", border: "none", borderRadius: 8, padding: "9px 16px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" };
  const btnGhost: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.04)", color: "#bbb", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "9px 16px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" };

  const SUB_TABS: { id: SubTab; icon: React.ReactNode; label: string }[] = [
    { id: "pages",     icon: <Globe size={13} />,          label: "Pages" },
    { id: "redirects", icon: <ArrowRightLeft size={13} />, label: "Redirects" },
    { id: "images",    icon: <ImageIcon size={13} />,      label: "Image SEO" },
    { id: "tracking",  icon: <BarChart2 size={13} />,      label: "Tracking" },
    { id: "health",    icon: <HeartPulse size={13} />,     label: "Health" },
  ];

  if (loading) return <div style={{ color: "#666", fontSize: 13, padding: 30 }}>Loading SEO data…</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {tableMissing && (
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: "rgba(245,175,50,0.08)", border: "1px solid rgba(245,175,50,0.3)", borderRadius: 10, padding: "12px 14px", fontSize: 12.5, color: "#F5AF32" }}>
          <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>SEO tables not found. Run <b>supabase/seo.sql</b> in the Supabase Dashboard → SQL Editor, then reload. Until then, pages use their built-in automatic SEO.</span>
        </div>
      )}

      {/* Health score + sub-tab bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", flex: 1 }}>
          {SUB_TABS.map(t => (
            <button key={t.id} onClick={() => setSubTab(t.id)}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: "pointer", border: "1px solid " + (subTab === t.id ? "rgba(201,168,76,0.5)" : "rgba(255,255,255,0.08)"), background: subTab === t.id ? "rgba(201,168,76,0.12)" : "rgba(255,255,255,0.02)", color: subTab === t.id ? "#E8C96D" : "#888" }}>
              {t.icon}{t.label}
              {t.id === "health" && audit.issues.length > 0 && (
                <span style={{ background: audit.errors ? "rgba(245,101,101,0.2)" : "rgba(245,175,50,0.2)", color: audit.errors ? "#f56565" : "#F5AF32", borderRadius: 10, padding: "1px 7px", fontSize: 10.5 }}>{audit.issues.length}</span>
              )}
            </button>
          ))}
        </div>
        <div title="SEO health score" style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 20, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}>
          <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.08em", color: "#666", textTransform: "uppercase" }}>Health</span>
          <span style={{ fontSize: 16, fontWeight: 800, color: audit.score >= 90 ? "#48BB78" : audit.score >= 70 ? "#F5AF32" : "#f56565" }}>{audit.score}</span>
        </div>
        <button onClick={refresh} style={btnGhost} title="Reload SEO data"><RefreshCw size={13} />Refresh</button>
      </div>

      {/* ── PAGES ── */}
      {subTab === "pages" && !editingPath && (
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <Search size={14} color="#666" />
            <input placeholder="Filter pages… (e.g. facial, /about)" value={pageFilter} onChange={e => setPageFilter(e.target.value)} style={{ ...input, maxWidth: 340 }} />
            <span style={{ fontSize: 11.5, color: "#555" }}>{filteredPages.length} pages · {seoRows.size} customized</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {filteredPages.slice(0, 200).map(p => {
              const row = seoRows.get(p.path);
              const title = row?.title || p.defaultTitle;
              return (
                <div key={p.path} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 4px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#ddd", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.label}</span>
                      {row && <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: "0.06em", background: "rgba(201,168,76,0.15)", color: "#E8C96D", borderRadius: 8, padding: "2px 8px" }}>CUSTOM</span>}
                      {row && !row.robots_index && <span style={{ fontSize: 9.5, fontWeight: 800, background: "rgba(245,101,101,0.15)", color: "#f56565", borderRadius: 8, padding: "2px 8px" }}>NOINDEX</span>}
                    </div>
                    <div style={{ fontSize: 11.5, color: "#555", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.path} · {title}</div>
                  </div>
                  <a href={p.path} target="_blank" rel="noreferrer" title="Open page" style={{ color: "#7ba8ff", display: "flex" }}><ExternalLink size={14} /></a>
                  <button onClick={() => openEditor(p)} style={{ ...btnGhost, padding: "7px 12px" }}><Pencil size={12} />Edit SEO</button>
                </div>
              );
            })}
            {filteredPages.length > 200 && <div style={{ fontSize: 11.5, color: "#555", padding: 10 }}>Showing first 200 — refine the filter to see more.</div>}
          </div>
        </div>
      )}

      {/* ── PAGE EDITOR ── */}
      {subTab === "pages" && editingPath && form && editingPage && (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,380px)", gap: 16, alignItems: "start" }}>
          <div style={{ ...card, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 14.5, fontWeight: 700, color: "#eee" }}>{editingPage.label}</div>
                <div style={{ fontSize: 11.5, color: "#666" }}>{editingPath}</div>
              </div>
              <button onClick={() => { setEditingPath(null); setForm(null); }} style={{ background: "none", border: "none", color: "#888", cursor: "pointer" }}><X size={17} /></button>
            </div>

            <div>
              <label style={label}>Meta Title <span style={{ color: (form.title ?? "").length > 65 ? "#f56565" : "#555", textTransform: "none" }}>({(form.title ?? "").length || "auto"}/60)</span></label>
              <input style={input} value={form.title ?? ""} placeholder={editingPage.defaultTitle} onChange={e => setForm({ ...form, title: e.target.value || null })} />
            </div>
            <div>
              <label style={label}>Meta Description <span style={{ color: (form.description ?? "").length > 165 ? "#f56565" : "#555", textTransform: "none" }}>({(form.description ?? "").length || "auto"}/160)</span></label>
              <textarea style={{ ...input, resize: "vertical" }} rows={3} value={form.description ?? ""} placeholder={editingPage.defaultDescription} onChange={e => setForm({ ...form, description: e.target.value || null })} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={label}>Focus Keyword</label>
                <input style={input} value={form.focus_keyword ?? ""} placeholder="e.g. facial Wave City" onChange={e => setForm({ ...form, focus_keyword: e.target.value || null })} />
              </div>
              <div>
                <label style={label}>Canonical URL (blank = automatic)</label>
                <input style={input} value={form.canonical_url ?? ""} placeholder={SITE_URL + editingPath} onChange={e => setForm({ ...form, canonical_url: e.target.value || null })} />
              </div>
            </div>

            <div style={{ display: "flex", gap: 18 }}>
              {([["robots_index", "Index", "Allow Google to index this page"], ["robots_follow", "Follow", "Allow crawling of links on this page"]] as const).map(([key, lbl, help]) => (
                <label key={key} title={help} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: form[key] ? "#48BB78" : "#f56565", cursor: "pointer", fontWeight: 700 }}>
                  <input type="checkbox" checked={form[key]} onChange={e => setForm({ ...form, [key]: e.target.checked })} />
                  {form[key] ? lbl : `No ${lbl}`}
                </label>
              ))}
            </div>

            <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 14, display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", color: "#888", textTransform: "uppercase" }}>Social Sharing (Open Graph / Twitter)</div>
              <div>
                <label style={label}>OG Title (blank = meta title)</label>
                <input style={input} value={form.og_title ?? ""} onChange={e => setForm({ ...form, og_title: e.target.value || null })} />
              </div>
              <div>
                <label style={label}>OG Description (blank = meta description)</label>
                <textarea style={{ ...input, resize: "vertical" }} rows={2} value={form.og_description ?? ""} onChange={e => setForm({ ...form, og_description: e.target.value || null })} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={label}>OG Image URL</label>
                  <input style={input} value={form.og_image ?? ""} placeholder="/images/salon-front.jpg" onChange={e => setForm({ ...form, og_image: e.target.value || null })} />
                </div>
                <div>
                  <label style={label}>Twitter Card</label>
                  <select style={{ ...input, cursor: "pointer" }} value={form.twitter_card} onChange={e => setForm({ ...form, twitter_card: e.target.value })}>
                    <option value="summary_large_image">Large image</option>
                    <option value="summary">Summary</option>
                  </select>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 14 }}>
              {seoRows.has(editingPath) && <button onClick={resetPageSeo} style={{ ...btnGhost, color: "#f56565", borderColor: "rgba(245,101,101,0.3)" }}><Trash2 size={13} />Revert to automatic</button>}
              <button onClick={savePageSeo} disabled={saving} style={btn}><Save size={13} />{saving ? "Saving…" : "Save SEO"}</button>
            </div>
          </div>

          {/* Live previews */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ ...card, background: "#fff" }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", color: "#999", textTransform: "uppercase", marginBottom: 10 }}>Google Preview</div>
              <div style={{ fontSize: 12, color: "#202124" }}>{SITE_URL.replace(/^https?:\/\//, "")}{editingPath === "/" ? "" : editingPath}</div>
              <div style={{ fontSize: 17, color: "#1a0dab", lineHeight: 1.3, margin: "3px 0 4px", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                {(form.title || editingPage.defaultTitle).slice(0, 65)}
              </div>
              <div style={{ fontSize: 13, color: "#4d5156", lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" }}>
                {(form.description || editingPage.defaultDescription).slice(0, 165)}
              </div>
            </div>

            <div style={{ ...card, padding: 0, overflow: "hidden" }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", color: "#888", textTransform: "uppercase", padding: "12px 16px 8px" }}>Social Preview (WhatsApp / Facebook / LinkedIn)</div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={form.og_image || "/images/salon-front.jpg"} alt="Open Graph preview" style={{ width: "100%", height: 160, objectFit: "cover", background: "#111" }} />
              <div style={{ padding: "10px 16px 14px", background: "rgba(255,255,255,0.03)" }}>
                <div style={{ fontSize: 10.5, color: "#777", textTransform: "uppercase" }}>{SITE_URL.replace(/^https?:\/\//, "")}</div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: "#ddd", margin: "2px 0" }}>{(form.og_title || form.title || editingPage.defaultTitle).slice(0, 70)}</div>
                <div style={{ fontSize: 12, color: "#888", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{(form.og_description || form.description || editingPage.defaultDescription).slice(0, 150)}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── REDIRECTS ── */}
      {subTab === "redirects" && (
        <div style={{ ...card, display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: "#ddd" }}>Redirect Manager</div>
          <p style={{ fontSize: 12, color: "#666", margin: 0 }}>Send old or broken URLs to their new home. 301 = permanent (passes SEO value), 302 = temporary.</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 130px auto", gap: 10, alignItems: "end" }}>
            <div><label style={label}>From Path</label><input style={input} placeholder="/old-page" value={newRedirect.from_path} onChange={e => setNewRedirect({ ...newRedirect, from_path: e.target.value })} /></div>
            <div><label style={label}>To Path or URL</label><input style={input} placeholder="/book" value={newRedirect.to_path} onChange={e => setNewRedirect({ ...newRedirect, to_path: e.target.value })} /></div>
            <div><label style={label}>Type</label>
              <select style={{ ...input, cursor: "pointer" }} value={newRedirect.status_code} onChange={e => setNewRedirect({ ...newRedirect, status_code: Number(e.target.value) })}>
                <option value={301}>301 Permanent</option>
                <option value={302}>302 Temporary</option>
              </select>
            </div>
            <button onClick={addRedirect} style={btn}><Plus size={13} />Add</button>
          </div>
          {redirects.length === 0
            ? <div style={{ fontSize: 12.5, color: "#555", padding: "16px 0" }}>No redirects yet.</div>
            : redirects.map(r => (
              <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 4px", borderTop: "1px solid rgba(255,255,255,0.04)", opacity: r.enabled ? 1 : 0.45 }}>
                <span style={{ fontSize: 10.5, fontWeight: 800, borderRadius: 8, padding: "3px 8px", background: r.status_code === 301 ? "rgba(72,187,120,0.15)" : "rgba(245,175,50,0.15)", color: r.status_code === 301 ? "#48BB78" : "#F5AF32" }}>{r.status_code}</span>
                <span style={{ fontSize: 12.5, color: "#ccc", fontFamily: "monospace" }}>{r.from_path}</span>
                <ArrowRightLeft size={12} color="#555" />
                <span style={{ fontSize: 12.5, color: "#ccc", fontFamily: "monospace", flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>{r.to_path}</span>
                <button onClick={() => toggleRedirect(r)} style={{ ...btnGhost, padding: "6px 10px", fontSize: 11 }}>{r.enabled ? "Disable" : "Enable"}</button>
                <button onClick={() => deleteRedirect(r.id)} style={{ background: "none", border: "none", color: "#f56565", cursor: "pointer", display: "flex" }} title="Delete"><Trash2 size={14} /></button>
              </div>
            ))}
        </div>
      )}

      {/* ── IMAGE SEO ── */}
      {subTab === "images" && (
        <div style={{ ...card, display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: "#ddd", marginBottom: 4 }}>Gallery Image Alt Text</div>
          <p style={{ fontSize: 12, color: "#666", marginBottom: 12 }}>Alt text tells Google (and screen readers) what each image shows. Aim for a short, specific description — e.g. “Bridal makeup at Bella &amp; Guy salon, Wave City”.</p>
          {galleryImages.length === 0
            ? <div style={{ fontSize: 12.5, color: "#555" }}>No gallery images found. Upload some in the Homepage tab first.</div>
            : galleryImages.map(img => (
              <div key={img.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.src} alt={img.alt_text || img.label || "Gallery image"} style={{ width: 72, height: 48, objectFit: "cover", borderRadius: 8, background: "#111", flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: "#666", marginBottom: 4 }}>{img.label || "(no label)"} {!((altDrafts[img.id] ?? img.alt_text)?.trim()) && <span style={{ color: "#F5AF32" }}>· missing alt text</span>}</div>
                  <input style={input} placeholder={img.label ? `e.g. ${img.label} at Bella & Guy Salon` : "Describe this image…"} value={altDrafts[img.id] ?? img.alt_text ?? ""} onChange={e => setAltDrafts(p => ({ ...p, [img.id]: e.target.value }))} />
                </div>
                <button onClick={() => saveAlt(img)} style={{ ...btnGhost, padding: "7px 12px" }}><Save size={12} />Save</button>
              </div>
            ))}
        </div>
      )}

      {/* ── TRACKING ── */}
      {subTab === "tracking" && (
        <div style={{ ...card, display: "flex", flexDirection: "column", gap: 14, maxWidth: 640 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: "#ddd" }}>Analytics &amp; Search Verification</div>
          <p style={{ fontSize: 12, color: "#666", margin: 0 }}>Each tool loads on the website only after its ID is saved here — leave blank to keep the site tracker-free and fast.</p>
          {TRACKING_FIELDS.map(f => (
            <div key={f.key} style={{ display: "flex", alignItems: "flex-end", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={label}>{f.label}</label>
                <input style={input} placeholder={f.placeholder} value={settings[f.key] ?? ""} onChange={e => setSettings(p => ({ ...p, [f.key]: e.target.value }))} />
                <div style={{ fontSize: 10.5, color: "#555", marginTop: 4 }}>{f.help}</div>
              </div>
              <button onClick={() => saveSetting(f.key)} disabled={savingKey === f.key} style={{ ...btnGhost, marginBottom: 18 }}><Save size={12} />{savingKey === f.key ? "…" : "Save"}</button>
            </div>
          ))}
        </div>
      )}

      {/* ── HEALTH ── */}
      {subTab === "health" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
            {[
              { label: "SEO Health Score", value: `${audit.score}/100`, color: audit.score >= 90 ? "#48BB78" : audit.score >= 70 ? "#F5AF32" : "#f56565" },
              { label: "Pages Tracked", value: String(pages.length), color: "#7ba8ff" },
              { label: "Errors", value: String(audit.errors), color: audit.errors ? "#f56565" : "#48BB78" },
              { label: "Warnings", value: String(audit.warns), color: audit.warns ? "#F5AF32" : "#48BB78" },
            ].map(stat => (
              <div key={stat.label} style={{ ...card, textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: stat.color }}>{stat.value}</div>
                <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#666", marginTop: 4 }}>{stat.label}</div>
              </div>
            ))}
          </div>

          <div style={card}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: "#ddd", marginBottom: 10 }}>Issues &amp; Recommendations</div>
            {audit.issues.length === 0 ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#48BB78", fontSize: 13, padding: "14px 0" }}>
                <CheckCircle size={16} /> No SEO issues found — everything looks healthy.
              </div>
            ) : (
              audit.issues.map((issue, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "9px 0", borderTop: i ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                  {issue.severity === "error"
                    ? <AlertCircle size={14} color="#f56565" style={{ flexShrink: 0, marginTop: 2 }} />
                    : <AlertTriangle size={14} color="#F5AF32" style={{ flexShrink: 0, marginTop: 2 }} />}
                  <div>
                    <div style={{ fontSize: 12.5, color: "#ccc" }}>{issue.message}</div>
                    <div style={{ fontSize: 11, color: "#555" }}>{issue.area}</div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div style={{ ...card, fontSize: 12, color: "#666", lineHeight: 1.7 }}>
            <b style={{ color: "#999" }}>Also automatic (no action needed):</b> XML sitemaps (<code>/sitemap.xml</code>, <code>/services-sitemap.xml</code>, <code>/image-sitemap.xml</code>) regenerate from live content · robots.txt blocks private pages · canonical URLs are self-generated · JSON-LD structured data (LocalBusiness, Services, FAQs, Reviews, Breadcrumbs) stays in sync with your content and settings.
          </div>
        </div>
      )}
    </div>
  );
}
