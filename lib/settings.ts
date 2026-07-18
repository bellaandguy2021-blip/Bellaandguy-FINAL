import { supabase } from "./supabase";

const CACHE_TTL_MS = 60_000; // 1 minute — enough to cover a single page's mount burst without going stale for long
let cache: { data: Record<string, string>; fetchedAt: number } | null = null;
let inFlight: Promise<Record<string, string>> | null = null;

/**
 * Public site settings, keyed the same way as the admin panel's Settings tab.
 * Falls back to {} on any error (missing table, RLS not yet updated, offline) —
 * callers should always provide a hardcoded default alongside each lookup.
 *
 * Cached + de-duped: a single page often mounts several components (Footer, Contact,
 * Faq, WhatsAppButton, …) that each need settings — without this they'd each fire their
 * own identical Supabase request on every load. Concurrent calls share one in-flight
 * request; the result is then reused for CACHE_TTL_MS.
 */
export async function getPublicSettings(): Promise<Record<string, string>> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) return cache.data;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const { data, error } = await supabase.from("settings").select("key, value");
      const map: Record<string, string> = {};
      if (!error && data) {
        (data as { key: string; value: string }[]).forEach(s => { map[s.key] = s.value; });
      }
      cache = { data: map, fetchedAt: Date.now() };
      return map;
    } catch {
      cache = { data: {}, fetchedAt: Date.now() };
      return {};
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}
