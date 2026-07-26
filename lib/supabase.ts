import { createClient } from "@supabase/supabase-js";

// createClient() throws synchronously if the URL is missing/invalid, which
// would crash the whole module (and anything that imports it, transitively)
// the instant this file loads — including during `next build`'s static
// page-data collection, before any request-level try/catch can run. Every
// caller in this codebase already treats Supabase calls as fail-soft, so a
// build-time-missing env var should degrade to failed requests, not a
// build-time crash.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

export const supabase = createClient(supabaseUrl, supabaseKey);
