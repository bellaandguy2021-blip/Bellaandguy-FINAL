/**
 * Renders one or more JSON-LD blocks. Server component — zero client JS.
 * `<` is escaped so admin-managed text (FAQ answers, reviews…) can never
 * break out of the script tag.
 */
export default function JsonLd({ data }: { data: (Record<string, unknown> | null)[] | Record<string, unknown> }) {
  const items = (Array.isArray(data) ? data : [data]).filter(Boolean) as Record<string, unknown>[];
  if (!items.length) return null;
  return (
    <>
      {items.map((item, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(item).replace(/</g, "\\u003c") }}
        />
      ))}
    </>
  );
}
