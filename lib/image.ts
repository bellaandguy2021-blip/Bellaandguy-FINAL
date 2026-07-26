/**
 * Next's built-in image optimizer proxy fetches remote images (Supabase
 * Storage, Unsplash, Pexels) through its own SSRF guard, which rejects some
 * of those hosts in certain network environments (see next.config.ts).
 * Local /public assets never go through that fetch — only remote URLs need
 * to skip optimization; keeping it scoped (instead of disabling it globally)
 * means local images still get automatic resize/AVIF/WebP conversion.
 */
export function isUnoptimizableSrc(src: string): boolean {
  return /^https?:\/\//i.test(src);
}
