export interface CartItem {
  key: string;
  name: string;
  categoryId: string;
  categoryLabel: string;
  group?: string;
  price: number;
  duration?: string;
  image?: string;
  quantity: number;
}

export function cartItemKey(categoryId: string, name: string, group?: string): string {
  return `${categoryId}::${group ?? ""}::${name}`;
}

/** Format a cart item the same way the booking page's `services` array expects: "Name — Category". */
export function cartItemToServiceString(item: CartItem): string {
  const key = item.group ? `${item.group} – ${item.name}` : item.name;
  return `${key} — ${item.categoryLabel}`;
}

/** Expands each cart item into `quantity` repeated entries, matching the booking page's flat services[] shape. */
export function cartItemsToServiceStrings(items: CartItem[]): string[] {
  return items.flatMap(item => Array(item.quantity).fill(cartItemToServiceString(item)));
}

export function parseDurationMinutes(duration?: string): number {
  if (!duration) return 0;
  const hrMatch = duration.match(/(\d+)\s*hr/);
  const minMatch = duration.match(/(\d+)\s*min/);
  return (hrMatch ? parseInt(hrMatch[1]) * 60 : 0) + (minMatch ? parseInt(minMatch[1]) : 0);
}

export function formatMinutes(total: number): string {
  if (total <= 0) return "—";
  const h = Math.floor(total / 60);
  const m = total % 60;
  return [h > 0 ? `${h} hr` : "", m > 0 ? `${m} mins` : ""].filter(Boolean).join(" ");
}

export const CART_STORAGE_KEY = "bg_cart";
export const CART_CHECKOUT_KEY = "bg_cart_checkout";
