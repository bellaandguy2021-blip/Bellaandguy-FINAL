// Approximate centroid of the salon's pincode (201003, Wave City, Ghaziabad) — geocoded
// once from the address shown in Contact.tsx. Good enough for a 15km service-area radius;
// swap for the exact shop coordinates (e.g. from Google Maps "share location") if available.
export const SALON_LAT = 28.7142;
export const SALON_LNG = 77.3775;

export const SERVICE_RADIUS_KM = 15;

/** Great-circle distance in km between two lat/lng points (defaults second point to the salon). */
export function distanceKm(lat1: number, lng1: number, lat2 = SALON_LAT, lng2 = SALON_LNG): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
