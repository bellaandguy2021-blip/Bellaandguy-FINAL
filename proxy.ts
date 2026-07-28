import { NextRequest, NextResponse } from "next/server";

/* ── Admin-managed redirects (SEO tab → redirects table) ─────────────────────
 * Fetched via plain REST (edge-safe, no supabase-js) and cached in memory so
 * the lookup adds ~zero latency to normal navigation. Fails open: if the
 * table is missing or the fetch errors, requests pass through untouched.
 * ──────────────────────────────────────────────────────────────────────────── */

interface RedirectRule { from_path: string; to_path: string; status_code: number; enabled: boolean }

const REDIRECT_TTL_MS = 60_000;
let redirectCache: { rules: Map<string, RedirectRule>; fetchedAt: number } | null = null;

async function getRedirects(): Promise<Map<string, RedirectRule>> {
  if (redirectCache && Date.now() - redirectCache.fetchedAt < REDIRECT_TTL_MS) return redirectCache.rules;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const rules = new Map<string, RedirectRule>();
  if (url && key) {
    try {
      // Hard 1.2s cap — a slow Supabase must never delay page loads. On any
      // failure, keep serving the previous cache instead of an empty set.
      const res = await fetch(`${url}/rest/v1/redirects?enabled=eq.true&select=from_path,to_path,status_code,enabled`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(1200),
      });
      if (res.ok) {
        const data = (await res.json()) as RedirectRule[];
        data.forEach(r => rules.set(normalize(r.from_path), r));
      }
    } catch {
      if (redirectCache) {
        redirectCache = { rules: redirectCache.rules, fetchedAt: Date.now() };
        return redirectCache.rules;
      }
    }
  }
  redirectCache = { rules, fetchedAt: Date.now() };
  return rules;
}

function normalize(p: string): string {
  let out = (p || "/").trim();
  if (!out.startsWith("/")) out = "/" + out;
  if (out.length > 1) out = out.replace(/\/+$/, "");
  return out.toLowerCase();
}

/** Follow chains (A→B, B→C ⇒ A→C) with a hop cap so a cycle can't loop forever. */
function resolveChain(rules: Map<string, RedirectRule>, start: string): RedirectRule | null {
  let current = rules.get(start) ?? null;
  if (!current) return null;
  let status = current.status_code;
  const seen = new Set<string>([start]);
  for (let hop = 0; hop < 5; hop++) {
    const nextKey = normalize(current.to_path);
    if (/^https?:\/\//i.test(current.to_path) || seen.has(nextKey)) break;
    const next = rules.get(nextKey);
    if (!next) break;
    seen.add(nextKey);
    // A 302 anywhere in the chain makes the whole hop temporary.
    if (next.status_code === 302) status = 302;
    current = next;
  }
  return { ...current, status_code: status };
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const role = request.cookies.get("bg_role")?.value;

  // Canonicalize www → apex. Serving the same content on both hosts reads as
  // duplicate content to search engines (flagged by an SEO audit) and splits
  // ranking signals between two URLs instead of one.
  const host = request.headers.get("host") || "";
  if (host.startsWith("www.")) {
    const canonicalUrl = new URL(request.nextUrl);
    canonicalUrl.hostname = host.slice(4);
    return NextResponse.redirect(canonicalUrl, 301);
  }

  if (pathname.startsWith("/bg-secure-4x9k")) {
    if (!role || role !== "admin") {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/staff")) {
    if (!role || (role !== "staff" && role !== "admin")) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }

  // Admin-managed 301/302 redirects for everything else.
  const rules = await getRedirects();
  if (rules.size) {
    const hit = resolveChain(rules, normalize(pathname));
    if (hit) {
      const target = /^https?:\/\//i.test(hit.to_path)
        ? hit.to_path
        : new URL(hit.to_path, request.url);
      return NextResponse.redirect(target, hit.status_code === 302 ? 302 : 301);
    }
  }

  return NextResponse.next();
}

export const config = {
  // Run on page routes only — skip static assets, images and Next internals so
  // the redirect lookup never touches asset requests.
  matcher: ["/((?!_next/|api/|images/|favicon.ico|robots.txt|sitemap.xml|services-sitemap.xml|image-sitemap.xml|manifest.webmanifest|notification.mp3).*)"],
};
