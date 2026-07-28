"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../lib/supabase";
import { allCategories as staticCategories, Category } from "../../lib/servicesData";
import { getDynamicCategories, mergeCategories } from "@/lib/dynamicServices";
import {
  Store, Home, Check, User, Phone, Mail, MapPin,
  Clock, Star, X, Sparkles, Calendar, Edit2, ChevronRight,
  MessageCircle, Navigation, Loader2, CreditCard, ShieldCheck
} from "lucide-react";
import ReactCalendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import InquiryButton from "@/components/InquiryButton";
import { getPublicSettings } from "@/lib/settings";
import { CART_CHECKOUT_KEY, parseDurationMinutes, formatMinutes } from "@/lib/cart";
import { useCart } from "@/components/CartProvider";
import { distanceKm, SERVICE_RADIUS_KM } from "@/lib/geo";
import { loadRazorpayScript, openRazorpayCheckout } from "@/lib/razorpay";

/* ── Time slots ────────────────────────────────────────────── */
// Default window is 10 AM – 7 PM; admin-editable via Settings → Advanced
// Settings ("Booking Slots Start/End Hour").
const DEFAULT_BOOKING_START_HOUR = 10;
const DEFAULT_BOOKING_END_HOUR = 19;

function buildTimeSlots(startHour: number, endHour: number) {
  const slots = [];
  for (let totalMins = startHour * 60; totalMins <= endHour * 60; totalMins += 30) {
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    slots.push({
      label: `${h12}:${m.toString().padStart(2, "0")} ${ampm}`,
      value: `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`,
    });
  }
  return slots;
}

function formatDate(d: string) {
  if (!d) return "";
  return new Date(d + "T00:00:00").toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

const PROGRESS = ["Location", "Gender", "Category", "Service", "Date", "Time", "Details", "Review"];

/* ── Step Card ──────────────────────────────────────────────── */
// Defined at module scope (not inside BookPage) so its identity is stable across
// renders — declaring it inline in the component body created a brand-new component
// type on every keystroke, which made React unmount/remount the whole step (including
// whatever input was focused) and jump the page's scroll position while typing.
function StepCard({
  num, title, children, step, fromCart, editStep, summary, setStepRef,
  readOnly, expanded, onToggle,
}: {
  num: number; title: string; children: React.ReactNode;
  step: number; fromCart: boolean; editStep: (n: number) => void;
  summary: string; setStepRef: (num: number, el: HTMLDivElement | null) => void;
  // Gender/Category/Service steps don't apply to a cart checkout (services can
  // span multiple categories/genders) — instead of the normal wizard behavior
  // they're shown as done and, on click, expand a read-only summary of what
  // the cart implies (rather than re-opening the pickers, which would wipe
  // the cart-provided service list).
  readOnly?: boolean; expanded?: boolean; onToggle?: () => void;
}) {
  const isCompleted = readOnly ? true : step > num && !(fromCart && [2, 3, 4].includes(num));
  const isActive     = readOnly ? !!expanded : step === num;
  const isLocked     = !readOnly && step < num;
  return (
    <div
      ref={el => setStepRef(num, el)}
      style={{
        background: "#fff",
        border: `1.5px solid ${isActive ? "rgba(201,168,76,0.4)" : "rgba(0,0,0,0.07)"}`,
        borderRadius: 16,
        marginBottom: 12,
        overflow: "hidden",
        transition: "border-color 0.3s ease, box-shadow 0.3s ease",
        boxShadow: isActive ? "0 4px 24px rgba(201,168,76,0.1)" : "none",
        opacity: isLocked ? 0.5 : 1,
      }}
    >
      {/* Header */}
      <div
        onClick={() => { if (!isCompleted) return; readOnly ? onToggle?.() : editStep(num); }}
        style={{
          display: "flex", alignItems: "center", gap: 14,
          padding: "16px 20px",
          cursor: isCompleted ? "pointer" : "default",
        }}
      >
        {/* Step circle */}
        <div style={{
          width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13, fontWeight: 700,
          background: isCompleted ? "rgba(45,143,94,0.12)" : isActive ? "#C9A84C" : "rgba(0,0,0,0.06)",
          color: isCompleted ? "#2d8f5e" : isActive ? "#080808" : "rgba(0,0,0,0.3)",
          border: `2px solid ${isCompleted ? "rgba(45,143,94,0.3)" : isActive ? "#C9A84C" : "transparent"}`,
        }}>
          {isCompleted ? <Check size={15} /> : num}
        </div>

        {/* Title + summary */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 13, fontWeight: 700, color: isLocked ? "rgba(0,0,0,0.3)" : "#080808",
            letterSpacing: "0.01em",
          }}>
            {title}
          </div>
          {isCompleted && summary && (
            <div style={{ fontSize: 12, color: "#6b4f10", marginTop: 2, fontWeight: 500 }}>
              {summary}
            </div>
          )}
        </div>

        {/* Edit / View chip */}
        {isCompleted && (
          <div style={{
            display: "flex", alignItems: "center", gap: 4,
            fontSize: 11, color: "rgba(0,0,0,0.35)", fontWeight: 600,
            background: "rgba(0,0,0,0.04)", borderRadius: 20, padding: "4px 10px",
            letterSpacing: "0.04em",
          }}>
            {readOnly ? <ChevronRight size={11} style={{ transform: isActive ? "rotate(90deg)" : "none", transition: "transform 0.2s" }} /> : <Edit2 size={11} />}
            {readOnly ? "View" : "Edit"}
          </div>
        )}
      </div>

      {/* Body */}
      <AnimatePresence initial={false}>
        {isActive && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
            style={{ overflow: "hidden" }}
          >
            <div style={{ padding: "0 20px 24px" }}>
              <div style={{ height: 1, background: "rgba(0,0,0,0.05)", marginBottom: 20 }} />
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Main Component ─────────────────────────────────────────── */
export default function BookPage() {
  const { clearCart } = useCart();
  const [allCategories, setAllCategories] = useState<Category[]>(staticCategories);
  useEffect(() => {
    getDynamicCategories().then(dynamic => {
      if (dynamic.length) setAllCategories(mergeCategories(staticCategories, dynamic));
    });
  }, []);
  const [step, setStep]               = useState(1);
  const [isHome, setIsHome]           = useState<boolean | null>(null);
  const [gender, setGender]           = useState<"female" | "male" | "">("");
  const [selCat, setSelCat]           = useState("");
  const [services, setServices]       = useState<string[]>([]);
  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("");
  const [fullName, setFullName]       = useState("");
  const [phone, setPhone]             = useState("");
  const [email, setEmail]             = useState("");
  const [flatNo, setFlatNo]           = useState("");
  const [street, setStreet]           = useState("");
  const [landmark, setLandmark]       = useState("");
  const [city, setCity]               = useState("Ghaziabad");
  const [pincode, setPincode]         = useState("");
  const [geoLoading, setGeoLoading]   = useState(false);
  const [geoError, setGeoError]       = useState("");
  const [addressDistanceKm, setAddressDistanceKm] = useState<number | null>(null);
  const [checkingArea, setCheckingArea] = useState(false);
  const [geoCheckFailed, setGeoCheckFailed] = useState(false);
  const skipNextPincodeCheck = useRef(false);
  const [notes, setNotes]             = useState("");
  const [honeypot, setHoneypot]       = useState("");
  const [spamError, setSpamError]     = useState("");
  const [loading, setLoading]         = useState(false);
  const [booked, setBooked]           = useState<any>(null);
  const [waConfirmed, setWaConfirmed] = useState(false);
  const [modalShake, setModalShake]   = useState(false);
  const [closeWarning, setCloseWarning] = useState(false);
  const [detailsError, setDetailsError] = useState("");
  const [fromCart, setFromCart]       = useState(false);
  const [openInfoStep, setOpenInfoStep] = useState<number | null>(null);
  const [minBookingValue, setMinBookingValue] = useState(1100);
  const [maxPerSlot, setMaxPerSlot]   = useState(3);
  // Online payment (Razorpay) — off unless the admin has both enabled it and
  // filled in a key ID. While off, booking behaves exactly as before (no
  // payment step, confirmed via WhatsApp only).
  const [paymentEnabled, setPaymentEnabled] = useState(false);
  const [razorpayKeyId, setRazorpayKeyId]   = useState("");
  const [minPaymentPercent, setMinPaymentPercent] = useState(50);
  const [payAmountMode, setPayAmountMode] = useState<"full" | "min" | "custom">("full");
  const [payCustomAmount, setPayCustomAmount] = useState<number | "">("");
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [bookingStartHour, setBookingStartHour] = useState(DEFAULT_BOOKING_START_HOUR);
  const [bookingEndHour, setBookingEndHour]     = useState(DEFAULT_BOOKING_END_HOUR);
  const [bookedTimesForDate, setBookedTimesForDate] = useState<Record<string, number>>({});
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotCheckFailed, setSlotCheckFailed] = useState(false);
  const [slotCheckRetry, setSlotCheckRetry] = useState(0);

  const stepRefs = useRef<(HTMLDivElement | null)[]>(Array(8).fill(null));
  const todayStr = new Date().toISOString().split("T")[0];
  const maxBookableDate = new Date();
  maxBookableDate.setDate(maxBookableDate.getDate() + 7);

  const TIME_SLOTS = useMemo(
    () => buildTimeSlots(bookingStartHour, bookingEndHour),
    [bookingStartHour, bookingEndHour]
  );

  const MIN_LEAD_MINUTES = 60;
  const availableTimeSlots = TIME_SLOTS.filter(slot => {
    if (slotCheckFailed) return false;
    if ((bookedTimesForDate[slot.value] ?? 0) >= maxPerSlot) return false;
    if (bookingDate !== todayStr) return true;
    const now = new Date();
    const cutoff = new Date(now.getTime() + MIN_LEAD_MINUTES * 60000);
    const [h, m] = slot.value.split(":").map(Number);
    const slotTime = new Date();
    slotTime.setHours(h, m, 0, 0);
    return slotTime >= cutoff;
  });

  useEffect(() => {
    getPublicSettings().then(s => {
      const v = parseInt(s.min_booking_value ?? "", 10);
      if (!isNaN(v) && v > 0) setMinBookingValue(v);
      const mp = parseInt(s.max_bookings_per_slot ?? "", 10);
      if (!isNaN(mp) && mp > 0) setMaxPerSlot(mp);
      const sh = parseInt(s.booking_start_hour ?? "", 10);
      if (!isNaN(sh) && sh >= 0 && sh < 24) setBookingStartHour(sh);
      const eh = parseInt(s.booking_end_hour ?? "", 10);
      if (!isNaN(eh) && eh >= 0 && eh < 24) setBookingEndHour(eh);
      if (s.payment_enabled === "true" && s.razorpay_key_id) {
        setPaymentEnabled(true);
        setRazorpayKeyId(s.razorpay_key_id);
      }
      const pct = parseInt(s.min_payment_percent ?? "", 10);
      if (!isNaN(pct) && pct > 0 && pct <= 100) setMinPaymentPercent(pct);
    });
  }, []);

  // Prevent double-booking: count existing (non-cancelled) appointments per
  // time slot on the chosen date, so a slot already at capacity can't be picked.
  // Fails closed: if this check can't be verified, no slot is treated as safe
  // to pick rather than silently showing everything as open.
  useEffect(() => {
    if (!bookingDate) { setBookedTimesForDate({}); setSlotCheckFailed(false); return; }
    let cancelled = false;
    setSlotsLoading(true);
    supabase
      .from("appointments")
      .select("booking_time")
      .eq("booking_date", bookingDate)
      .neq("status", "Cancelled")
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setSlotCheckFailed(true);
          setBookedTimesForDate({});
          setSlotsLoading(false);
          return;
        }
        setSlotCheckFailed(false);
        const counts: Record<string, number> = {};
        (data ?? []).forEach((row: any) => {
          if (row.booking_time) counts[row.booking_time] = (counts[row.booking_time] ?? 0) + 1;
        });
        setBookedTimesForDate(counts);
        setSlotsLoading(false);
      });
    return () => { cancelled = true; };
  }, [bookingDate, slotCheckRetry]);

  /* ── Pre-fill ─────────────────────────────────────── */
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        const m = session.user.user_metadata;
        if (m?.full_name) setFullName(m.full_name);
        if (m?.phone)     setPhone(m.phone);
        if (m?.email)     setEmail(session.user.email || "");
      }
    });
    // Coming from the cart's "Proceed to Checkout" — services may span multiple
    // categories/genders, so skip straight to Date selection with them pre-filled.
    const cartCheckoutRaw = sessionStorage.getItem(CART_CHECKOUT_KEY);
    if (cartCheckoutRaw) {
      sessionStorage.removeItem(CART_CHECKOUT_KEY);
      try {
        const cartServices: string[] = JSON.parse(cartCheckoutRaw);
        if (cartServices.length > 0) {
          setServices(cartServices);
          setIsHome(true);
          setFromCart(true);
          setStep(5);
          return;
        }
      } catch {}
    }

    // Coming from a "Book Home Service" button — skip the location step
    const homeFlag = sessionStorage.getItem("bookingType");
    let homeSelected = homeFlag === "home";
    if (homeSelected) {
      setIsHome(true);
      sessionStorage.removeItem("bookingType");
    }

    const preGender = localStorage.getItem("preselectGender");
    let genderSelected = false;
    if (preGender === "female" || preGender === "male") {
      setGender(preGender);
      genderSelected = true;
      localStorage.removeItem("preselectGender");
    }
    const pre = localStorage.getItem("preselectService");
    let serviceSelected = false;
    let catFound = false;
    if (pre) {
      setServices([pre]);
      const preParts = pre.split(" — ");
      const preLabel = preParts[preParts.length - 1];
      const preKey   = preParts.slice(0, -1).join(" — ");
      const cat = allCategories.find(c =>
        c.label === preLabel &&
        c.services.some(s => {
          const key = s.group ? `${s.group} – ${s.name}` : s.name;
          return key === preKey || s.name === preKey;
        })
      );
      if (cat) { setSelCat(cat.id); catFound = true; }
      localStorage.removeItem("preselectService");
      serviceSelected = true;
      // Service selection only happens from home-service categories
      homeSelected = true;
      setIsHome(true);
    }

    if (serviceSelected && catFound && genderSelected) setStep(5);
    else if (genderSelected && homeSelected)           setStep(3);
    else if (homeSelected)                             setStep(2);
  }, []);

  /* ── Scroll ───────────────────────────────────────── */
  function scrollToStep(n: number) {
    setTimeout(() => {
      const el = stepRefs.current[n - 1];
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY - 130;
      window.scrollTo({ top, behavior: "smooth" });
    }, 120);
  }

  function advance(n: number) {
    setStep(n);
    scrollToStep(n);
  }

  function editStep(n: number) {
    // Reset everything after n — except when arriving from the cart, where
    // steps 2-4 (gender/category/service) are skipped entirely and `services`
    // holds the cart's selection, not something re-derived from those steps.
    if (n <= 1) { setIsHome(null); }
    if (!fromCart) {
      if (n <= 2) { setGender(""); }
      if (n <= 3) { setSelCat(""); }
      if (n <= 4) { setServices([]); }
    }
    if (n <= 5) { setBookingDate(""); }
    if (n <= 6) { setBookingTime(""); }
    advance(n);
  }

  /* ── Derived ──────────────────────────────────────── */
  const visibleCats = allCategories.filter(c => {
    const gMatch = !gender || c.gender === gender || c.gender === "both";
    const hMatch = isHome === null || (isHome ? c.homeService : true);
    return gMatch && hMatch;
  });

  const selectedCat = allCategories.find(c => c.id === selCat);

  const totalPrice = (() => {
    if (services.length === 0) return null;
    let sum = 0;
    for (const svc of services) {
      const parts = svc.split(" — ");
      if (parts.length < 2) continue;
      const sKey = parts.slice(0, -1).join(" — ");
      for (const cat of allCategories) {
        const found = cat.services.find(s => {
          const key = s.group ? `${s.group} – ${s.name}` : s.name;
          return key === sKey || s.name === sKey;
        });
        if (found) { sum += found.discountPercent ? Math.round(found.price * (1 - found.discountPercent / 100)) : found.price; break; }
      }
    }
    return sum > 0 ? sum : null;
  })();
  const service = services.join(", ");

  // Grouped, quantity-aware breakdown for the cart-checkout "Booking Summary" card.
  const bookingSummary = (() => {
    const map = new Map<string, { name: string; price: number; duration?: string; qty: number }>();
    let totalMins = 0;
    for (const svc of services) {
      const parts = svc.split(" — ");
      const sKey = parts.length >= 2 ? parts.slice(0, -1).join(" — ") : svc;
      let found: { price: number; duration?: string } | null = null;
      for (const cat of allCategories) {
        const f = cat.services.find(s => {
          const key = s.group ? `${s.group} – ${s.name}` : s.name;
          return key === sKey || s.name === sKey;
        });
        if (f) { found = { price: f.discountPercent ? Math.round(f.price * (1 - f.discountPercent / 100)) : f.price, duration: f.duration }; break; }
      }
      if (!found) continue;
      const existing = map.get(sKey);
      if (existing) existing.qty += 1;
      else map.set(sKey, { name: sKey, price: found.price, duration: found.duration, qty: 1 });
      totalMins += parseDurationMinutes(found.duration);
    }
    return { rows: [...map.values()], totalMins };
  })();

  // For a cart checkout, gender/category aren't picked via steps 2-3 — services
  // can span multiple categories and both genders. Derive what those steps would
  // otherwise show from the categories the cart's services actually belong to.
  const cartCategoryInfo = (() => {
    const labels: string[] = [];
    const genders = new Set<"female" | "male" | "both">();
    for (const svc of services) {
      const parts = svc.split(" — ");
      const label = parts[parts.length - 1];
      const cat = allCategories.find(c => c.label === label);
      if (cat) {
        if (!labels.includes(cat.label)) labels.push(cat.label);
        genders.add(cat.gender);
      }
    }
    return { labels, genders };
  })();
  const cartGenderInfo = (() => {
    const g = cartCategoryInfo.genders;
    // A "both" (unisex) category applies to either gender, so it lights up
    // both pills — matching whichever specific genders are also present.
    const showFemale = g.has("female") || g.has("both");
    const showMale = g.has("male") || g.has("both");
    const summary = showFemale && showMale ? "Both — Male & Female" : showFemale ? "Female" : showMale ? "Male" : "Unisex";
    return { showFemale, showMale, summary };
  })();

  const fullAddress = [flatNo, street, landmark, city, pincode].filter(Boolean).join(", ");

  /* ── GPS "use my current location" address autofill ─── */
  function handleUseCurrentLocation() {
    if (!navigator.geolocation) {
      setGeoError("Location access isn't supported on this device.");
      return;
    }
    setGeoError("");
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          setAddressDistanceKm(distanceKm(latitude, longitude));
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&addressdetails=1`
          );
          const data = await res.json();
          const a = data?.address ?? {};
          const streetParts = [a.road, a.suburb || a.neighbourhood].filter(Boolean);
          if (streetParts.length) setStreet(streetParts.join(", "));
          if (a.postcode) {
            // GPS already gives us an accurate verified distance above — skip the
            // pincode-triggered re-check so it doesn't get overwritten with the
            // coarser pincode-centroid estimate.
            skipNextPincodeCheck.current = true;
            setPincode(a.postcode.replace(/\D/g, "").slice(0, 6));
          }
          const cityName = a.city || a.town || a.village || a.city_district;
          if (cityName) setCity(cityName);
          if (!streetParts.length && !a.postcode) {
            setGeoError("Couldn't determine your exact address — please fill it in manually.");
          }
        } catch {
          setGeoError("Couldn't fetch your address. Please fill it in manually.");
        } finally {
          setGeoLoading(false);
        }
      },
      (err) => {
        setGeoLoading(false);
        setGeoError(
          err.code === err.PERMISSION_DENIED
            ? "Location permission denied. Please fill in your address manually."
            : "Couldn't get your location. Please fill it in manually."
        );
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  /* ── Service-area check for manually typed pincodes ──
     Geocodes the pincode (debounced) so a typed address gets the same 15km
     radius check as one filled via "Use My Current Location". Fails closed —
     home service can only be booked once we've actually confirmed the address
     is within range; an unverified or failed lookup blocks booking too. */
  useEffect(() => {
    if (!isHome) return;
    if (skipNextPincodeCheck.current) { skipNextPincodeCheck.current = false; return; }
    setAddressDistanceKm(null);
    setGeoCheckFailed(false);
    const clean = pincode.replace(/\D/g, "");
    if (clean.length !== 6) return;
    setCheckingArea(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`https://photon.komoot.io/api/?q=${clean}%20India&limit=1`);
        const data = await res.json();
        const coords = data?.features?.[0]?.geometry?.coordinates as [number, number] | undefined;
        if (coords) setAddressDistanceKm(distanceKm(coords[1], coords[0]));
        else setGeoCheckFailed(true);
      } catch {
        setGeoCheckFailed(true);
      } finally {
        setCheckingArea(false);
      }
    }, 700);
    return () => { clearTimeout(t); setCheckingArea(false); };
  }, [pincode, isHome]);

  const addressVerified   = addressDistanceKm !== null;
  const addressOutOfRange = isHome === true && addressVerified && addressDistanceKm! > SERVICE_RADIUS_KM;

  /* ── Success modal close guard ─────────────────────── */
  function attemptCloseModal(then?: () => void) {
    if (!waConfirmed) {
      setModalShake(true);
      setCloseWarning(true);
      setTimeout(() => setModalShake(false), 500);
      setTimeout(() => setCloseWarning(false), 4000);
      return;
    }
    setBooked(null);
    then?.();
  }

  /* ── Payment (Razorpay) ──────────────────────────────
     Only reachable when the admin has turned payment_enabled on and set a
     Razorpay Key ID — see the settings fetch above. Amount must be between
     minPaymentPercent% and 100% of the total. */
  const payAmount = (() => {
    const total = totalPrice ?? 0;
    if (payAmountMode === "full") return total;
    if (payAmountMode === "min") return Math.round(total * minPaymentPercent / 100);
    return typeof payCustomAmount === "number" ? payCustomAmount : 0;
  })();

  async function finalizeBooking(paymentInfo?: {
    payment_status: "partial" | "full";
    amount_paid: number;
    razorpay_order_id: string;
    razorpay_payment_id: string;
  }) {
    const cleaned = phone.replace(/\D/g, "").replace(/^91/, "");
    const { data: inserted, error } = await supabase
      .from("appointments")
      .insert([{
        full_name: fullName, phone: cleaned, email: email || null,
        service, booking_date: bookingDate, booking_time: bookingTime,
        is_home_service: isHome, address: isHome ? fullAddress : null,
        ...(paymentInfo ?? {}),
      }])
      .select("id").single();
    if (error) throw error;

    const bookingPayload = {
      id: inserted?.id,
      full_name: fullName, email, phone: cleaned,
      service, booking_date: bookingDate, booking_time: bookingTime,
      is_home_service: isHome, address: isHome ? fullAddress : null,
    };

    // Email notification
    try {
      await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "created", booking: bookingPayload }),
      });
    } catch {}

    // WhatsApp notification to salon owner
    try {
      await fetch("/api/send-whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking: bookingPayload }),
      });
    } catch {}

    if (fromCart) clearCart();
    setWaConfirmed(false);
    setBooked({ id: inserted?.id, fullName, phone: cleaned, email, service, bookingDate, bookingTime, isHome, address: fullAddress });
  }

  async function initiatePayment() {
    setPaymentError("");
    const total = totalPrice ?? 0;
    const minAllowed = Math.round(total * minPaymentPercent / 100);
    if (payAmount < minAllowed || payAmount > total) {
      setPaymentError(`Enter an amount between ₹${minAllowed.toLocaleString()} and ₹${total.toLocaleString()}.`);
      return;
    }

    setPaymentProcessing(true);
    try {
      const scriptOk = await loadRazorpayScript();
      if (!scriptOk) {
        setPaymentError("Could not load the payment gateway. Please check your connection and try again.");
        return;
      }

      const res = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: payAmount }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPaymentError(data.error || "Could not start the payment. Please try again.");
        return;
      }

      const cleanedForPrefill = phone.replace(/\D/g, "").replace(/^91/, "");
      openRazorpayCheckout({
        keyId: data.keyId,
        orderId: data.orderId,
        amountPaise: data.amount,
        name: "Bella & Guy Salon",
        description: payAmount >= total ? "Full payment for booking" : "Advance payment for booking",
        prefill: { name: fullName, contact: cleanedForPrefill, email: email || undefined },
        onSuccess: async (result) => {
          setLoading(true);
          try {
            const verifyRes = await fetch("/api/razorpay/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(result),
            });
            const verifyData = await verifyRes.json();
            if (!verifyData.verified) {
              setPaymentError("Payment could not be verified. If money was deducted, please contact us with this reference: " + result.razorpay_payment_id);
              return;
            }
            await finalizeBooking({
              payment_status: payAmount >= total ? "full" : "partial",
              amount_paid: payAmount,
              razorpay_order_id: result.razorpay_order_id,
              razorpay_payment_id: result.razorpay_payment_id,
            });
          } catch (err: any) {
            setPaymentError("Payment succeeded but the booking couldn't be saved. Please contact us with this reference: " + result.razorpay_payment_id);
          } finally {
            setLoading(false);
            setPaymentProcessing(false);
          }
        },
        onDismiss: () => setPaymentProcessing(false),
      });
    } catch {
      setPaymentError("Something went wrong starting the payment. Please try again.");
      setPaymentProcessing(false);
    }
  }

  /* ── Submit ───────────────────────────────────────── */
  async function handleSubmit() {
    setSpamError(""); setDetailsError(""); setPaymentError("");
    if (honeypot) return;
    if (!fullName.trim()) { setDetailsError("Full name is required."); return; }
    const cleaned = phone.replace(/\D/g, "").replace(/^91/, "");
    if (!/^[6-9]\d{9}$/.test(cleaned)) {
      setDetailsError("Please enter a valid 10-digit Indian mobile number.");
      return;
    }
    if (isHome && !fullAddress) { setSpamError("Please enter your address for home service."); return; }
    if (isHome && addressOutOfRange) {
      setSpamError(`This address is approximately ${addressDistanceKm?.toFixed(1)} km away, outside our ${SERVICE_RADIUS_KM} km home service area. Please contact us directly to check availability.`);
      return;
    }
    if (isHome && !addressVerified) {
      setSpamError("We couldn't confirm your address is within our service area yet. Please enter a valid pincode, or use “Use My Current Location”.");
      return;
    }
    if (services.length === 0) { setSpamError("Please select at least one service."); return; }
    if ((totalPrice ?? 0) < minBookingValue) {
      setSpamError(`Minimum booking value of ₹${minBookingValue.toLocaleString()} required. Current total: ₹${totalPrice?.toLocaleString() ?? 0}. Please go back and add more services.`);
      return;
    }

    const twoHrsAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("phone", cleaned)
      .gte("created_at", twoHrsAgo);
    if ((count ?? 0) >= 3) { setSpamError("Max 3 bookings per 2 hours from the same number."); return; }

    // Final double-booking guard: someone else may have taken this exact
    // slot while this customer was filling in their details. Fails closed —
    // if this check can't be verified, don't let the booking through.
    const { count: slotCount, error: slotCountError } = await supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("booking_date", bookingDate)
      .eq("booking_time", bookingTime)
      .neq("status", "Cancelled");
    if (slotCountError) {
      setSpamError("Couldn't confirm this time slot is still available. Please try again.");
      return;
    }
    if ((slotCount ?? 0) >= maxPerSlot) {
      setSpamError("Sorry, this time slot was just taken by another booking. Please go back and pick a different time.");
      return;
    }

    if (paymentEnabled) {
      await initiatePayment();
      return;
    }

    setLoading(true);
    try {
      await finalizeBooking();
    } catch (err: any) {
      alert("Booking failed: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  /* ── Step summaries ────────────────────────────────── */
  const summaries: Record<number, string> = {
    1: isHome !== null ? "Home Service" : "",
    2: gender === "female" ? "Female" : gender === "male" ? "Male" : "",
    3: selectedCat?.label ?? "",
    4: services.length > 0
      ? (services.length === 1
          ? `${services[0].split(" — ")[0]}  ·  ₹${totalPrice?.toLocaleString() ?? ""}`
          : `${services.length} services  ·  ₹${totalPrice?.toLocaleString() ?? ""}`)
      : "",
    5: bookingDate ? formatDate(bookingDate) : "",
    6: bookingTime ? (TIME_SLOTS.find(s => s.value === bookingTime)?.label ?? bookingTime) : "",
    7: fullName ? `${fullName}  ·  ${phone}` : "",
  };

  function setStepRef(num: number, el: HTMLDivElement | null) {
    stepRefs.current[num - 1] = el;
  }

  /* ══════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════ */
  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        body { background: #FAF7F0; }

        /* Progress bar */
        .pbk-bar {
          position: sticky; top: 0; z-index: 90;
          background: rgba(255,255,255,0.95);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(0,0,0,0.07);
          padding: 14px 20px 10px;
        }
        .pbk-inner {
          max-width: 720px; margin: 0 auto;
          display: flex; align-items: flex-start; gap: 0;
        }
        .pbk-item {
          flex: 1; display: flex; flex-direction: column; align-items: center;
          gap: 5px; position: relative;
        }
        .pbk-item:not(:last-child)::after {
          content: ""; position: absolute;
          top: 13px; left: calc(50% + 14px);
          right: calc(-50% + 14px);
          height: 2px;
          background: rgba(0,0,0,0.08);
          transition: background 0.4s;
        }
        .pbk-item.done:not(:last-child)::after { background: #2d8f5e; }
        .pbk-dot {
          width: 26px; height: 26px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 700;
          border: 2px solid rgba(0,0,0,0.1);
          background: transparent; color: rgba(0,0,0,0.3);
          transition: all 0.3s;
        }
        .pbk-item.active .pbk-dot { border-color: #C9A84C; background: #C9A84C; color: #080808; }
        .pbk-item.done .pbk-dot { border-color: #2d8f5e; background: rgba(45,143,94,0.12); color: #2d8f5e; }
        .pbk-lbl {
          font-size: 9px; font-weight: 600; letter-spacing: 0.05em;
          text-transform: uppercase; color: rgba(0,0,0,0.28);
          text-align: center; line-height: 1.2;
        }
        .pbk-item.active .pbk-lbl { color: #C9A84C; }
        .pbk-item.done .pbk-lbl { color: #2d8f5e; }

        /* Hero */
        .bk2-hero {
          background: linear-gradient(135deg, #080808 0%, #1a1200 50%, #080808 100%);
          padding: 56px 20px 40px;
          text-align: center; position: relative;
        }
        .bk2-hero::before {
          content: ""; position: absolute; inset: 0;
          background: radial-gradient(ellipse 60% 70% at 50% 110%, rgba(201,168,76,0.2), transparent);
          pointer-events: none;
        }

        /* Location cards */
        .loc-card {
          flex: 1; border: 2px solid rgba(0,0,0,0.08); border-radius: 14px;
          padding: 22px 16px; text-align: center; cursor: pointer;
          transition: all 0.22s; background: #FAFAF8;
          display: flex; flex-direction: column; align-items: center; gap: 10px;
        }
        .loc-card:hover { border-color: rgba(201,168,76,0.4); transform: translateY(-2px); }
        .loc-card.sel { border-color: #C9A84C; background: rgba(201,168,76,0.06); }
        .loc-icon {
          width: 52px; height: 52px; border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          font-size: 24px;
        }

        /* Gender cards */
        .gen-card {
          flex: 1; border: 2px solid rgba(0,0,0,0.08); border-radius: 14px;
          padding: 26px 16px; text-align: center; cursor: pointer;
          transition: all 0.22s; background: #FAFAF8;
          display: flex; flex-direction: column; align-items: center; gap: 12px;
        }
        .gen-card:hover { border-color: rgba(201,168,76,0.4); transform: translateY(-2px); }
        .gen-card.sel { border-color: #C9A84C; background: rgba(201,168,76,0.06); }

        /* Category grid */
        .cat-grid {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 9px;
        }
        .cat-btn {
          border: 1.5px solid rgba(0,0,0,0.08); border-radius: 11px;
          padding: 13px 8px; text-align: center; cursor: pointer;
          font-family: 'Inter', sans-serif; transition: all 0.2s;
          background: #FAFAF8; font-size: 11px; font-weight: 600;
          color: rgba(0,0,0,0.5);
        }
        .cat-btn:hover { border-color: rgba(201,168,76,0.4); color: #8a6a1a; }
        .cat-btn.sel { border-color: #C9A84C; background: rgba(201,168,76,0.07); color: #8a6a1a; }
        .cat-icon-ring {
          width: 42px; height: 42px; border-radius: 50%; overflow: hidden;
          margin: 0 auto 6px; border: 1.5px solid rgba(0,0,0,0.08);
        }
        .cat-btn.sel .cat-icon-ring { border-color: #C9A84C; }
        .cat-icon-img { width: 100%; height: 100%; object-fit: cover; display: block; }

        /* Service cards */
        .svc-card {
          border: 1.5px solid rgba(0,0,0,0.07); border-radius: 12px;
          padding: 14px 16px; cursor: pointer; transition: all 0.2s;
          background: #FAFAF8; display: flex; align-items: center; gap: 12px;
        }
        .svc-card:hover { border-color: rgba(201,168,76,0.35); background: rgba(201,168,76,0.03); }
        .svc-card.sel { border-color: #C9A84C; background: rgba(201,168,76,0.07); }

        /* Payment amount option cards */
        .pay-opt {
          flex: 1; border: 1.5px solid rgba(0,0,0,0.08); border-radius: 10px;
          padding: 10px 12px; cursor: pointer; transition: all 0.2s; background: #fff;
        }
        .pay-opt:hover { border-color: rgba(201,168,76,0.4); }
        .pay-opt.sel { border-color: #C9A84C; background: rgba(201,168,76,0.07); }

        /* Time slots */
        .time-grid {
          display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;
        }
        .time-btn {
          padding: 10px 6px; border-radius: 9px;
          border: 1.5px solid rgba(0,0,0,0.08);
          text-align: center; cursor: pointer; font-family: 'Inter', sans-serif;
          font-size: 12px; font-weight: 600; transition: all 0.18s;
          color: rgba(0,0,0,0.5); background: #FAFAF8;
        }
        .time-btn:hover { border-color: rgba(201,168,76,0.5); color: #8a6a1a; }
        .time-btn.sel { border-color: #C9A84C; background: #C9A84C; color: #080808; }

        /* Calendar (date step) */
        .bk2-cal-wrap {
          background: #FAFAF8; border: 1.5px solid rgba(0,0,0,0.08);
          border-radius: 14px; padding: 14px 10px;
        }
        .bk2-cal-wrap .react-calendar { background: transparent !important; border: none !important; font-family: 'Inter', sans-serif !important; width: 100% !important; line-height: 1.4 !important; }
        .bk2-cal-wrap .react-calendar__navigation { margin-bottom: 8px !important; height: auto !important; }
        .bk2-cal-wrap .react-calendar__navigation button { color: #8a6a1a !important; background: transparent !important; font-size: 14px !important; font-weight: 700 !important; border-radius: 8px !important; min-width: 32px !important; }
        .bk2-cal-wrap .react-calendar__navigation button:enabled:hover,
        .bk2-cal-wrap .react-calendar__navigation button:enabled:focus { background: rgba(201,168,76,0.12) !important; }
        .bk2-cal-wrap .react-calendar__navigation button:disabled { color: rgba(0,0,0,0.15) !important; }
        .bk2-cal-wrap .react-calendar__navigation__label { font-weight: 700 !important; color: #080808 !important; text-transform: uppercase; letter-spacing: 0.05em; font-size: 12px !important; }
        .bk2-cal-wrap .react-calendar__month-view__weekdays { font-size: 10px !important; }
        .bk2-cal-wrap .react-calendar__month-view__weekdays abbr { text-decoration: none !important; color: rgba(0,0,0,0.32) !important; font-weight: 700 !important; letter-spacing: 0.05em; }
        .bk2-cal-wrap .react-calendar__tile { padding: 9px 4px !important; border-radius: 9px !important; font-size: 12.5px !important; font-weight: 600 !important; color: #080808 !important; background: transparent !important; }
        .bk2-cal-wrap .react-calendar__tile:enabled:hover,
        .bk2-cal-wrap .react-calendar__tile:enabled:focus { background: rgba(201,168,76,0.14) !important; }
        .bk2-cal-wrap .react-calendar__tile--now { background: rgba(201,168,76,0.09) !important; color: #8a6a1a !important; }
        .bk2-cal-wrap .react-calendar__tile--active { background: linear-gradient(135deg,#E8C96D,#C9A84C) !important; color: #080808 !important; font-weight: 700 !important; }
        .bk2-cal-wrap .react-calendar__tile:disabled { color: rgba(0,0,0,0.16) !important; background: transparent !important; }
        .bk2-cal-wrap .react-calendar__month-view__days__day--neighboringMonth { color: rgba(0,0,0,0.18) !important; }
        .bk2-cal-wrap .react-calendar__month-view__days__day--weekend:not(.react-calendar__tile--active) { color: #b5442e !important; }

        /* Inputs */
        .bk2-input {
          width: 100%; border: 1.5px solid rgba(0,0,0,0.1); padding: 13px 16px;
          border-radius: 10px; font-size: 14px; color: #080808;
          background: #FAFAF8; outline: none; transition: all 0.22s;
          font-family: 'Inter', sans-serif;
        }
        .bk2-input:focus { border-color: #C9A84C; background: rgba(201,168,76,0.03); box-shadow: 0 0 0 3px rgba(201,168,76,0.08); }
        .bk2-input::placeholder { color: rgba(0,0,0,0.2); }
        .bk2-label {
          display: block; font-size: 10px; font-weight: 700;
          letter-spacing: 0.12em; text-transform: uppercase;
          color: rgba(0,0,0,0.35); margin-bottom: 7px;
        }
        .bk2-field { margin-bottom: 16px; }
        .bk2-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

        /* Review rows */
        .rv-row {
          display: flex; align-items: flex-start; gap: 12px;
          padding: 11px 0; border-bottom: 1px solid rgba(0,0,0,0.05);
        }
        .rv-row:last-child { border-bottom: none; }
        .rv-icon {
          width: 28px; height: 28px; border-radius: 8px;
          background: rgba(201,168,76,0.1); color: #C9A84C;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .rv-key { font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(0,0,0,0.28); width: 70px; flex-shrink: 0; padding-top: 4px; }
        .rv-val { color: #080808; font-weight: 500; font-size: 13px; padding-top: 3px; flex: 1; }
        .rv-edit { font-size: 11px; color: #C9A84C; font-weight: 600; cursor: pointer; text-decoration: underline; flex-shrink: 0; padding-top: 4px; }

        /* Submit button */
        .bk2-submit {
          width: 100%; padding: 16px;
          background: linear-gradient(135deg, #E8C96D, #C9A84C);
          color: #080808; border: none; border-radius: 12px;
          font-size: 14px; font-weight: 700; letter-spacing: 0.1em;
          text-transform: uppercase; cursor: pointer; font-family: 'Inter', sans-serif;
          transition: all 0.3s; margin-top: 20px;
        }
        .bk2-submit:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(201,168,76,0.35); }
        .bk2-submit:disabled { opacity: 0.6; cursor: not-allowed; }

        /* CTA next button */
        .bk2-next {
          display: inline-flex; align-items: center; gap: 6px;
          background: #080808; color: #fff; border: none;
          padding: 12px 24px; border-radius: 10px;
          font-size: 12px; font-weight: 700; letter-spacing: 0.1em;
          text-transform: uppercase; cursor: pointer; font-family: 'Inter', sans-serif;
          transition: all 0.25s;
        }
        .bk2-next:hover { background: #C9A84C; color: #080808; }

        /* Success modal */
        .bk2-overlay {
          position: fixed; inset: 0; z-index: 9999;
          background: rgba(4,4,8,0.78); backdrop-filter: blur(12px);
          display: flex; align-items: center; justify-content: center; padding: 20px;
          animation: bkFIn 0.25s ease;
        }
        @keyframes bkFIn { from{opacity:0} to{opacity:1} }
        .bk2-spin { animation: bk2Spin 0.8s linear infinite; }
        @keyframes bk2Spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        .bk2-modal {
          background: #FFFDF8; border-radius: 20px;
          border: 1px solid rgba(201,168,76,0.2);
          box-shadow: 0 40px 100px rgba(0,0,0,0.4);
          width: 100%; max-width: 460px;
          animation: bkSUp 0.35s cubic-bezier(0.22,1,0.36,1);
          overflow: hidden;
        }
        @keyframes bkSUp { from{opacity:0;transform:translateY(30px)} to{opacity:1;transform:translateY(0)} }
        .bk2-modal.bk2-shake { animation: bkShake 0.45s cubic-bezier(.36,.07,.19,.97) both; }
        @keyframes bkShake {
          10%, 90% { transform: translateX(-1px); }
          20%, 80% { transform: translateX(3px); }
          30%, 50%, 70% { transform: translateX(-6px); }
          40%, 60% { transform: translateX(6px); }
        }

        /* Modal success top */
        .bk2-modal-top {
          background: linear-gradient(135deg, #1a1200, #2e1f00);
          padding: 36px 28px 28px; text-align: center; position: relative;
        }
        .bk2-modal-check {
          width: 64px; height: 64px; border-radius: 50%;
          background: rgba(201,168,76,0.15); border: 2px solid rgba(201,168,76,0.4);
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 14px; color: #C9A84C;
        }

        /* Responsive */
        @media (max-width: 600px) {
          .bk2-2col { grid-template-columns: 1fr; }
          .cat-grid { grid-template-columns: repeat(3, 1fr); }
          .time-grid { grid-template-columns: repeat(3, 1fr); }
          .pbk-lbl { display: none; }
          .pbk-dot { width: 22px; height: 22px; font-size: 10px; }
          .gen-card { padding: 16px 8px; gap: 6px; }
          .gen-card > div:first-child { font-size: 26px !important; }
        }
        @media (max-width: 400px) {
          .cat-grid { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>

      {/* ── Progress Bar ── */}
      <div className="pbk-bar">
        <div className="pbk-inner">
          {PROGRESS.map((label, i) => {
            const n = i + 1;
            const cls = step > n ? "done" : step === n ? "active" : "";
            return (
              <div key={i} className={`pbk-item ${cls}`}>
                <div className="pbk-dot">
                  {step > n ? <Check size={12} /> : n}
                </div>
                <div className="pbk-lbl">{label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Hero ── */}
      <div className="bk2-hero">
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: "#C9A84C", marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <span style={{ width: 20, height: 1, background: "#C9A84C", display: "inline-block" }} />
            Bella & Guy Salon
            <span style={{ width: 20, height: 1, background: "#C9A84C", display: "inline-block" }} />
          </div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(28px,5vw,48px)", fontWeight: 400, color: "#fff", margin: 0, lineHeight: 1.1 }}>
            Book an Appointment
          </h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.38)", marginTop: 10, marginBottom: 0 }}>
            Home service — we confirm within 30 minutes
          </p>
          <div style={{ marginTop: 18 }}>
            <InquiryButton label="Have a question? Ask before booking" gender={gender || undefined} />
          </div>
        </div>
      </div>

      {/* ── Steps ── */}
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "28px 16px 80px" }}>

        {/* ─ Booking Summary (cart checkout only) ─ */}
        {fromCart && bookingSummary.rows.length > 0 && (
          <div style={{
            background: "#fff", border: "1.5px solid rgba(201,168,76,0.25)", borderRadius: 16,
            marginBottom: 20, overflow: "hidden", boxShadow: "0 4px 24px rgba(201,168,76,0.08)",
          }}>
            <div style={{
              background: "linear-gradient(135deg,#080808,#1a1200)", padding: "14px 20px",
              display: "flex", alignItems: "center", gap: 9,
            }}>
              <Sparkles size={15} color="#C9A84C" />
              <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 17, fontWeight: 600, color: "#fff" }}>
                Booking Summary
              </span>
            </div>
            <div style={{ padding: "6px 20px" }}>
              {bookingSummary.rows.map((row, i) => (
                <div key={i} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "10px 0", borderBottom: i < bookingSummary.rows.length - 1 ? "1px solid rgba(0,0,0,0.06)" : "none",
                }}>
                  <span style={{ fontSize: 13, color: "#080808", fontWeight: 600 }}>
                    {row.name}{row.qty > 1 ? ` ×${row.qty}` : ""}
                  </span>
                  <span style={{ fontSize: 13, color: "#8a6a1a", fontWeight: 700 }}>
                    ₹{(row.price * row.qty).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "12px 20px", background: "rgba(201,168,76,0.06)",
            }}>
              <span style={{ fontSize: 12, color: "#666" }}>Total Duration: {formatMinutes(bookingSummary.totalMins)}</span>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.06em", color: "#999", fontWeight: 700 }}>Estimated Cost</div>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 700, color: "#080808" }}>
                  ₹{(totalPrice ?? 0).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─ STEP 1: LOCATION ─ */}
        <StepCard num={1} title="Where would you like your service?" step={step} fromCart={fromCart} editStep={editStep} summary={summaries[1]} setStepRef={setStepRef}>
          <div style={{ display: "flex", gap: 12 }}>
            <div className="loc-card" onClick={() => { window.location.href = "/#contact"; }}>
              <div className="loc-icon" style={{ background: "rgba(201,168,76,0.1)" }}>
                <Store size={26} color="#C9A84C" />
              </div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#080808" }}>At Salon</div>
              <div style={{ fontSize: 11, color: "#888", lineHeight: 1.4 }}>Contact us to visit the salon</div>
            </div>
            <div className={`loc-card ${isHome === true ? "sel" : ""}`} onClick={() => { setIsHome(true); advance(2); }}>
              <div className="loc-icon" style={{ background: "rgba(45,143,94,0.1)" }}>
                <Home size={26} color="#2d8f5e" />
              </div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#080808" }}>Home Service</div>
              <div style={{ fontSize: 11, color: "#888", lineHeight: 1.4 }}>We come to your doorstep</div>
              {isHome === true && <div style={{ fontSize: 11, fontWeight: 700, color: "#2d8f5e" }}><Check size={11} style={{ display: "inline" }} /> Selected</div>}
            </div>
          </div>
        </StepCard>

        {/* ─ STEP 2: GENDER ─ */}
        <StepCard num={2} title="Select your preference" step={step} fromCart={fromCart} editStep={editStep}
          summary={fromCart ? cartGenderInfo.summary : summaries[2]} setStepRef={setStepRef}
          readOnly={fromCart} expanded={openInfoStep === 2} onToggle={() => setOpenInfoStep(s => s === 2 ? null : 2)}>
          {fromCart ? (
            <div style={{ display: "flex", gap: 12 }}>
              <div className={`gen-card ${cartGenderInfo.showFemale ? "sel" : ""}`} style={{ cursor: "default" }}>
                <div style={{ fontSize: 38 }}>♀</div>
                <div style={{ fontWeight: 700, fontSize: 16, color: "#080808" }}>Female</div>
                {cartGenderInfo.showFemale && <div style={{ fontSize: 11, fontWeight: 700, color: "#2d8f5e" }}><Check size={11} style={{ display: "inline" }} /> In your cart</div>}
              </div>
              <div className={`gen-card ${cartGenderInfo.showMale ? "sel" : ""}`} style={{ cursor: "default" }}>
                <div style={{ fontSize: 38 }}>♂</div>
                <div style={{ fontWeight: 700, fontSize: 16, color: "#080808" }}>Male</div>
                {cartGenderInfo.showMale && <div style={{ fontSize: 11, fontWeight: 700, color: "#2d8f5e" }}><Check size={11} style={{ display: "inline" }} /> In your cart</div>}
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 12 }}>
              <div className={`gen-card ${gender === "female" ? "sel" : ""}`} onClick={() => { setGender("female"); advance(3); }}>
                <div style={{ fontSize: 38 }}>♀</div>
                <div style={{ fontWeight: 700, fontSize: 16, color: "#080808" }}>Female</div>
                <div style={{ fontSize: 11, color: "#888" }}>Facials, waxing, makeup & more</div>
                {gender === "female" && <div style={{ fontSize: 11, fontWeight: 700, color: "#2d8f5e" }}><Check size={11} style={{ display: "inline" }} /> Selected</div>}
              </div>
              <div className={`gen-card ${gender === "male" ? "sel" : ""}`} onClick={() => { setGender("male"); advance(3); }}>
                <div style={{ fontSize: 38 }}>♂</div>
                <div style={{ fontWeight: 700, fontSize: 16, color: "#080808" }}>Male</div>
                <div style={{ fontSize: 11, color: "#888" }}>Haircut, beard, grooming & more</div>
                {gender === "male" && <div style={{ fontSize: 11, fontWeight: 700, color: "#2d8f5e" }}><Check size={11} style={{ display: "inline" }} /> Selected</div>}
              </div>
            </div>
          )}
        </StepCard>

        {/* ─ STEP 3: CATEGORY ─ */}
        <StepCard num={3} title="Choose a service category" step={step} fromCart={fromCart} editStep={editStep}
          summary={fromCart ? cartCategoryInfo.labels.join(", ") : summaries[3]} setStepRef={setStepRef}
          readOnly={fromCart} expanded={openInfoStep === 3} onToggle={() => setOpenInfoStep(s => s === 3 ? null : 3)}>
          {fromCart ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {cartCategoryInfo.labels.map(label => (
                <div key={label} style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  border: "1.5px solid #C9A84C", background: "rgba(201,168,76,0.07)",
                  borderRadius: 20, padding: "7px 14px", fontSize: 12.5, fontWeight: 700, color: "#8a6a1a",
                }}>
                  <Check size={12} color="#2d8f5e" /> {label}
                </div>
              ))}
            </div>
          ) : (
            <div className="cat-grid">
              {visibleCats.map(cat => (
                <div key={cat.id} className={`cat-btn ${selCat === cat.id ? "sel" : ""}`}
                  onClick={() => { setSelCat(cat.id); advance(4); }}>
                  <div className="cat-icon-ring">
                    <img src={gender === "male" && cat.imgsMale?.[0] ? cat.imgsMale[0] : cat.imgs[0]} alt={cat.label} className="cat-icon-img" loading="lazy" />
                  </div>
                  {cat.label}
                </div>
              ))}
            </div>
          )}
        </StepCard>

        {/* ─ STEP 4: SERVICE ─ */}
        <StepCard num={4} title="Select a service" step={step} fromCart={fromCart} editStep={editStep}
          summary={summaries[4]} setStepRef={setStepRef}
          readOnly={fromCart} expanded={openInfoStep === 4} onToggle={() => setOpenInfoStep(s => s === 4 ? null : 4)}>
          {fromCart ? (
            <div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {bookingSummary.rows.map((row, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
                    border: "1.5px solid rgba(0,0,0,0.07)", borderRadius: 10, padding: "10px 14px", background: "#FAFAF8",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                      <Check size={14} color="#2d8f5e" style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#080808" }}>
                        {row.name}{row.qty > 1 ? ` ×${row.qty}` : ""}
                      </span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#8a6a1a", flexShrink: 0 }}>
                      ₹{(row.price * row.qty).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
              <div style={{
                marginTop: 14, paddingTop: 14, borderTop: "1px dashed rgba(0,0,0,0.12)",
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap",
              }}>
                <span style={{ fontSize: 12.5, color: "#888" }}>Forgot something? No problem.</span>
                <a href="/#services" style={{ fontSize: 12.5, fontWeight: 700, color: "#C9A84C", textDecoration: "underline" }}>
                  + Add More Services
                </a>
              </div>
            </div>
          ) : selectedCat ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {selectedCat.services.map(svc => {
                const val = svc.group
                  ? `${svc.group} – ${svc.name} — ${selectedCat.label}`
                  : `${svc.name} — ${selectedCat.label}`;
                const isSel = services.includes(val);
                return (
                  <div key={`${svc.group ?? ""}-${svc.name}`} className={`svc-card ${isSel ? "sel" : ""}`}
                    onClick={() => setServices(prev => prev.includes(val) ? prev.filter(s => s !== val) : [...prev, val])}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#080808" }}>{svc.name}</span>
                        {svc.popular && (
                          <span style={{ fontSize: 9, fontWeight: 700, background: "rgba(201,168,76,0.15)", color: "#8a6a1a", border: "1px solid rgba(201,168,76,0.3)", borderRadius: 20, padding: "1px 7px", letterSpacing: "0.06em", textTransform: "uppercase" }}>Popular</span>
                        )}
                      </div>
                      {svc.group && <div style={{ fontSize: 10, color: "#C9A84C", fontWeight: 600, marginTop: 2, letterSpacing: "0.04em" }}>{svc.group}</div>}
                      <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>{selectedCat.desc}</div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: isSel ? "#8a6a1a" : "#080808" }}>₹{svc.price.toLocaleString()}</div>
                      {isSel && <Check size={14} color="#2d8f5e" style={{ marginTop: 2 }} />}
                    </div>
                  </div>
                );
              })}

              {/* ── Running total + Continue ── */}
              {services.length > 0 && (
                <div style={{ background: "rgba(8,8,8,0.03)", border: "1px solid rgba(0,0,0,0.09)", borderRadius: 10, padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 4 }}>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: "#080808" }}>
                      {services.length} service{services.length > 1 ? "s" : ""} selected
                    </div>
                    <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
                      Total: <strong style={{ color: "#C9A84C" }}>₹{totalPrice?.toLocaleString()}</strong>
                      {(totalPrice ?? 0) < minBookingValue && (
                        <span style={{ color: "#c53030", marginLeft: 8 }}>
                          · Add ₹{(minBookingValue - (totalPrice ?? 0)).toLocaleString()} more to proceed
                        </span>
                      )}
                    </div>
                  </div>
                  {(totalPrice ?? 0) >= minBookingValue && (
                    <button className="bk2-next" onClick={() => advance(5)}>
                      Continue <ChevronRight size={14} />
                    </button>
                  )}
                </div>
              )}

              {/* ── Min booking info ── */}
              <div style={{ display: "flex", gap: 10, background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 10, padding: "11px 14px", alignItems: "flex-start" }}>
                <span style={{ fontSize: 15, color: "#C9A84C", flexShrink: 0, lineHeight: 1 }}>ℹ</span>
                <div>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: "#8a6a1a", marginBottom: 2 }}>Minimum Home Service Value: ₹{minBookingValue.toLocaleString()}</div>
                  <div style={{ fontSize: 11, color: "#aaa", lineHeight: 1.5 }}>Our certified professionals travel to your location. You can select multiple services — minimum booking value of ₹{minBookingValue.toLocaleString()} applies.</div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ color: "#aaa", fontSize: 13 }}>Please select a category first.</div>
          )}
        </StepCard>

        {/* ─ STEP 5: DATE ─ */}
        <StepCard num={5} title="Pick a date" step={step} fromCart={fromCart} editStep={editStep} summary={summaries[5]} setStepRef={setStepRef}>
          <div className="bk2-cal-wrap">
            <ReactCalendar
              value={bookingDate ? new Date(bookingDate + "T00:00:00") : null}
              onChange={value => {
                const d = value as Date;
                const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                setBookingDate(iso);
                advance(6);
              }}
              minDate={new Date(todayStr + "T00:00:00")}
              maxDate={maxBookableDate}
              minDetail="month"
              next2Label={null}
              prev2Label={null}
              calendarType="gregory"
            />
          </div>
          {bookingDate && (
            <div style={{ fontSize: 12, color: "#8a6a1a", marginTop: 12, fontWeight: 500, textAlign: "center" }}>
              Selected: {formatDate(bookingDate)}
            </div>
          )}
        </StepCard>

        {/* ─ STEP 6: TIME ─ */}
        <StepCard num={6} title="Choose a time slot" step={step} fromCart={fromCart} editStep={editStep} summary={summaries[6]} setStepRef={setStepRef}>
          {slotsLoading ? (
            <div style={{ color: "#aaa", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
              <Loader2 size={14} className="bk2-spin" /> Checking available slots…
            </div>
          ) : slotCheckFailed ? (
            <div style={{ color: "#e08a8a", fontSize: 13 }}>
              Couldn't verify available slots for this date right now. Please{" "}
              <span style={{ color: "#C9A84C", fontWeight: 600, cursor: "pointer" }} onClick={() => setSlotCheckRetry(n => n + 1)}>try again</span>,
              {" "}or <span style={{ color: "#C9A84C", fontWeight: 600, cursor: "pointer" }} onClick={() => editStep(5)}>pick another date</span>.
            </div>
          ) : availableTimeSlots.length > 0 ? (
            <div className="time-grid">
              {availableTimeSlots.map(slot => (
                <button key={slot.value} type="button"
                  className={`time-btn ${bookingTime === slot.value ? "sel" : ""}`}
                  onClick={() => { setBookingTime(slot.value); advance(7); }}>
                  {slot.label}
                </button>
              ))}
            </div>
          ) : (
            <div style={{ color: "#aaa", fontSize: 13 }}>
              No slots left on this date — please <span style={{ color: "#C9A84C", fontWeight: 600, cursor: "pointer" }} onClick={() => editStep(5)}>choose another date</span>.
            </div>
          )}
        </StepCard>

        {/* ─ STEP 7: DETAILS ─ */}
        <StepCard num={7} title="Your details" step={step} fromCart={fromCart} editStep={editStep} summary={summaries[7]} setStepRef={setStepRef}>
          <div className="bk2-2col" style={{ marginBottom: 14 }}>
            <div>
              <label className="bk2-label"><User size={10} style={{ display: "inline", marginRight: 4 }} />Full Name *</label>
              <input type="text" className="bk2-input" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your full name" />
            </div>
            <div>
              <label className="bk2-label"><Phone size={10} style={{ display: "inline", marginRight: 4 }} />Phone *</label>
              <input type="tel" className="bk2-input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 XXXXXXXXXX" />
            </div>
          </div>
          <div className="bk2-field">
            <label className="bk2-label"><Mail size={10} style={{ display: "inline", marginRight: 4 }} />Email <span style={{ textTransform: "none", letterSpacing: 0, fontWeight: 400, color: "rgba(0,0,0,0.25)" }}>(optional)</span></label>
            <input type="email" className="bk2-input" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" />
          </div>

          {/* Address (only for home service) */}
          {isHome && (
            <div style={{ background: "rgba(201,168,76,0.04)", border: "1.5px solid rgba(201,168,76,0.15)", borderRadius: 12, padding: "16px 14px", marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8a6a1a", marginBottom: 12, display: "flex", alignItems: "center", gap: 5 }}>
                <MapPin size={11} /> Home Service Address
              </div>

              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={geoLoading}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                  width: "100%", padding: "10px", marginBottom: 12,
                  background: "#fff", border: "1.5px solid rgba(201,168,76,0.35)", borderRadius: 10,
                  color: "#8a6a1a", fontSize: 12.5, fontWeight: 700, cursor: geoLoading ? "default" : "pointer",
                  fontFamily: "'Inter', sans-serif", opacity: geoLoading ? 0.7 : 1,
                }}
              >
                {geoLoading
                  ? <><Loader2 size={13} className="bk2-spin" /> Detecting your location…</>
                  : <><Navigation size={13} /> Use My Current Location</>}
              </button>
              {geoError && (
                <div style={{ fontSize: 11.5, color: "#e53e3e", marginBottom: 12, marginTop: -6 }}>
                  {geoError}
                </div>
              )}

              <div className="bk2-2col" style={{ marginBottom: 10 }}>
                <div>
                  <label className="bk2-label">Flat / House No. *</label>
                  <input type="text" className="bk2-input" value={flatNo} onChange={e => setFlatNo(e.target.value)} placeholder="e.g. A-204" />
                </div>
                <div>
                  <label className="bk2-label">Pincode *</label>
                  <input type="text" className="bk2-input" value={pincode} onChange={e => setPincode(e.target.value)} placeholder="201301" maxLength={6} />
                  {checkingArea && (
                    <div style={{ fontSize: 10.5, color: "rgba(0,0,0,0.35)", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                      <Loader2 size={10} className="bk2-spin" /> Checking service area…
                    </div>
                  )}
                </div>
              </div>
              <div style={{ marginBottom: 10 }}>
                <label className="bk2-label">Street / Colony / Sector *</label>
                <input type="text" className="bk2-input" value={street} onChange={e => setStreet(e.target.value)} placeholder="e.g. Sector 5, Wave City" />
              </div>
              <div className="bk2-2col">
                <div>
                  <label className="bk2-label">Landmark <span style={{ textTransform: "none", fontWeight: 400, letterSpacing: 0, color: "rgba(0,0,0,0.3)" }}>(optional)</span></label>
                  <input type="text" className="bk2-input" value={landmark} onChange={e => setLandmark(e.target.value)} placeholder="Near Metro Station" />
                </div>
                <div>
                  <label className="bk2-label">City</label>
                  <input type="text" className="bk2-input" value={city} onChange={e => setCity(e.target.value)} />
                </div>
              </div>
              {fullAddress && (
                <div style={{ marginTop: 10, background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#6b4f10" }}>
                  <strong>Full address:</strong> {fullAddress}
                </div>
              )}

              {(addressOutOfRange || geoCheckFailed) && (
                <div style={{ marginTop: 10, background: "rgba(245,101,101,0.08)", border: "1px solid rgba(245,101,101,0.25)", borderRadius: 10, padding: "14px" }}>
                  <div style={{ fontSize: 12.5, color: "#c53030", fontWeight: 600, lineHeight: 1.6, marginBottom: 4 }}>
                    {addressOutOfRange
                      ? `This address is approximately ${addressDistanceKm?.toFixed(1)} km from our salon, just outside our ${SERVICE_RADIUS_KM} km home service radius.`
                      : "We couldn't confirm your service area from this pincode."}
                  </div>
                  <div style={{ fontSize: 11.5, color: "#8a5050", lineHeight: 1.6, marginBottom: 10 }}>
                    {addressOutOfRange
                      ? "We may still be able to accommodate you depending on availability — please contact us directly to check."
                      : "Please double-check your pincode, try “Use My Current Location”, or contact us directly and our team will confirm availability at your address."}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <a
                      href="tel:+919999601212"
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        background: "#080808", color: "#E8C96D", borderRadius: 8, padding: "9px 14px",
                        fontSize: 12, fontWeight: 700, textDecoration: "none", fontFamily: "'Inter', sans-serif",
                      }}
                    >
                      <Phone size={12} /> Call Us
                    </a>
                    <a
                      href={`https://wa.me/919999601212?text=${encodeURIComponent(
                        `Hi! I'd like to check if home service is available at my location${pincode ? ` (pincode ${pincode})` : ""}.`
                      )}`}
                      target="_blank" rel="noopener noreferrer"
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        background: "#fff", color: "#128c7e", border: "1.5px solid rgba(18,140,126,0.35)",
                        borderRadius: 8, padding: "9px 14px",
                        fontSize: 12, fontWeight: 700, textDecoration: "none", fontFamily: "'Inter', sans-serif",
                      }}
                    >
                      <MessageCircle size={12} /> WhatsApp Us
                    </a>
                  </div>
                </div>
              )}

              {addressVerified && !addressOutOfRange && !checkingArea && (
                <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "#2d8f5e", fontWeight: 600 }}>
                  <Check size={13} /> This address is within our {SERVICE_RADIUS_KM} km home service area.
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div className="bk2-field">
            <label className="bk2-label"><MessageCircle size={10} style={{ display: "inline", marginRight: 4 }} />Special Request <span style={{ textTransform: "none", letterSpacing: 0, fontWeight: 400, color: "rgba(0,0,0,0.25)" }}>(optional)</span></label>
            <textarea className="bk2-input" value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Any special request for our team? e.g. Female staff preferred, sensitive skin..."
              style={{ height: 80, resize: "none" }} />
          </div>

          {/* Honeypot */}
          <div style={{ position: "absolute", left: "-9999px", opacity: 0, pointerEvents: "none" }} aria-hidden="true">
            <input tabIndex={-1} autoComplete="off" value={honeypot} onChange={e => setHoneypot(e.target.value)} />
          </div>

          {detailsError && (
            <div style={{ background: "rgba(245,101,101,0.08)", border: "1px solid rgba(245,101,101,0.25)", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#e53e3e", marginBottom: 14 }}>
              ⚠ {detailsError}
            </div>
          )}

          <button className="bk2-next"
            onClick={() => {
              setDetailsError("");
              if (!fullName.trim()) { setDetailsError("Full name is required."); return; }
              const cl = phone.replace(/\D/g, "").replace(/^91/, "");
              if (!/^[6-9]\d{9}$/.test(cl)) { setDetailsError("Enter a valid 10-digit Indian mobile number."); return; }
              if (isHome && addressOutOfRange) {
                setDetailsError(`This address is approximately ${addressDistanceKm?.toFixed(1)} km away, outside our ${SERVICE_RADIUS_KM} km home service area. Please contact us directly to check availability.`);
                return;
              }
              if (isHome && !addressVerified) {
                setDetailsError("We couldn't confirm your address is within our service area yet. Please enter a valid pincode, or use “Use My Current Location”.");
                return;
              }
              advance(8);
            }}>
            Review Booking <ChevronRight size={14} />
          </button>
        </StepCard>

        {/* ─ STEP 8: REVIEW & CONFIRM ─ */}
        <StepCard num={8} title="Review & Confirm" step={step} fromCart={fromCart} editStep={editStep} summary="" setStepRef={setStepRef}>
          <div style={{ marginBottom: 20 }}>
            <div className="rv-row">
              <div className="rv-icon"><Store size={13} /></div>
              <div className="rv-key">Location</div>
              <div className="rv-val">Home Service</div>
              <div className="rv-edit" onClick={() => editStep(1)}>Edit</div>
            </div>
            {gender && (
              <div className="rv-row">
                <div className="rv-icon"><User size={13} /></div>
                <div className="rv-key">Gender</div>
                <div className="rv-val">{gender === "female" ? "Female" : "Male"}</div>
                <div className="rv-edit" onClick={() => editStep(2)}>Edit</div>
              </div>
            )}
            {selectedCat && (
              <div className="rv-row">
                <div className="rv-icon"><Sparkles size={13} /></div>
                <div className="rv-key">Category</div>
                <div className="rv-val">{selectedCat.label}</div>
                <div className="rv-edit" onClick={() => editStep(3)}>Edit</div>
              </div>
            )}
            <div className="rv-row">
              <div className="rv-icon"><Star size={13} /></div>
              <div className="rv-key">Service{services.length > 1 ? "s" : ""}</div>
              <div className="rv-val">
                {services.map((s, i) => (
                  <div key={i} style={{ lineHeight: 1.6 }}>{s.split(" — ")[0]}</div>
                ))}
              </div>
              <div className="rv-edit" onClick={() => editStep(4)}>Edit</div>
            </div>
            <div className="rv-row">
              <div className="rv-icon"><Calendar size={13} /></div>
              <div className="rv-key">Date</div>
              <div className="rv-val">{formatDate(bookingDate)}</div>
              <div className="rv-edit" onClick={() => editStep(5)}>Edit</div>
            </div>
            <div className="rv-row">
              <div className="rv-icon"><Clock size={13} /></div>
              <div className="rv-key">Time</div>
              <div className="rv-val">{TIME_SLOTS.find(s => s.value === bookingTime)?.label}</div>
              <div className="rv-edit" onClick={() => editStep(6)}>Edit</div>
            </div>
            <div className="rv-row">
              <div className="rv-icon"><User size={13} /></div>
              <div className="rv-key">Name</div>
              <div className="rv-val">{fullName}</div>
              <div className="rv-edit" onClick={() => editStep(7)}>Edit</div>
            </div>
            <div className="rv-row">
              <div className="rv-icon"><Phone size={13} /></div>
              <div className="rv-key">Phone</div>
              <div className="rv-val">{phone}</div>
            </div>
            {email && (
              <div className="rv-row">
                <div className="rv-icon"><Mail size={13} /></div>
                <div className="rv-key">Email</div>
                <div className="rv-val">{email}</div>
              </div>
            )}
            {isHome && fullAddress && (
              <div className="rv-row">
                <div className="rv-icon"><MapPin size={13} /></div>
                <div className="rv-key">Address</div>
                <div className="rv-val">{fullAddress}</div>
              </div>
            )}
            {notes && (
              <div className="rv-row">
                <div className="rv-icon"><MessageCircle size={13} /></div>
                <div className="rv-key">Notes</div>
                <div className="rv-val" style={{ fontSize: 12, color: "#666" }}>{notes}</div>
              </div>
            )}
          </div>

          {/* Price summary */}
          {totalPrice !== null && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(201,168,76,0.07)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 10, padding: "12px 16px", marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(0,0,0,0.45)" }}>
                Total{services.length > 1 ? ` (${services.length} services)` : ""}
              </span>
              <span style={{ fontSize: 20, fontWeight: 700, fontFamily: "'Cormorant Garamond', serif", color: "#080808" }}>₹{totalPrice.toLocaleString()}</span>
            </div>
          )}

          {/* Payment (only rendered when the admin has enabled it in Settings) */}
          {paymentEnabled && totalPrice !== null && (
            <div style={{ background: "#FAFAF8", border: "1.5px solid rgba(201,168,76,0.2)", borderRadius: 12, padding: "16px 14px", marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8a6a1a", marginBottom: 12, display: "flex", alignItems: "center", gap: 5 }}>
                <CreditCard size={11} /> Pay Online
              </div>
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <div
                  className={`pay-opt ${payAmountMode === "full" ? "sel" : ""}`}
                  onClick={() => setPayAmountMode("full")}
                >
                  <div style={{ fontSize: 12.5, fontWeight: 700 }}>Pay Full</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#8a6a1a" }}>₹{totalPrice.toLocaleString()}</div>
                </div>
                <div
                  className={`pay-opt ${payAmountMode === "min" ? "sel" : ""}`}
                  onClick={() => setPayAmountMode("min")}
                >
                  <div style={{ fontSize: 12.5, fontWeight: 700 }}>Pay {minPaymentPercent}% Now</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#8a6a1a" }}>₹{Math.round(totalPrice * minPaymentPercent / 100).toLocaleString()}</div>
                </div>
                <div
                  className={`pay-opt ${payAmountMode === "custom" ? "sel" : ""}`}
                  onClick={() => setPayAmountMode("custom")}
                >
                  <div style={{ fontSize: 12.5, fontWeight: 700 }}>Custom</div>
                  <div style={{ fontSize: 11, color: "#999" }}>Choose amount</div>
                </div>
              </div>
              {payAmountMode === "custom" && (
                <div style={{ marginBottom: 4 }}>
                  <label className="bk2-label">
                    Amount (₹{Math.round(totalPrice * minPaymentPercent / 100).toLocaleString()} – ₹{totalPrice.toLocaleString()})
                  </label>
                  <input
                    type="number"
                    className="bk2-input"
                    value={payCustomAmount}
                    onChange={e => setPayCustomAmount(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder={`e.g. ${Math.round(totalPrice * minPaymentPercent / 100)}`}
                    min={Math.round(totalPrice * minPaymentPercent / 100)}
                    max={totalPrice}
                  />
                </div>
              )}
              {payAmountMode !== "full" && (
                <div style={{ fontSize: 11.5, color: "#888", marginTop: 6 }}>
                  Balance of ₹{(totalPrice - payAmount).toLocaleString()} payable on-site.
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10.5, color: "#aaa", marginTop: 10 }}>
                <ShieldCheck size={11} /> Secure payment powered by Razorpay
              </div>
            </div>
          )}

          {paymentError && (
            <div style={{ background: "rgba(245,101,101,0.08)", border: "1px solid rgba(245,101,101,0.25)", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#e53e3e", marginBottom: 12 }}>
              ⚠ {paymentError}
            </div>
          )}

          {spamError && (
            <div style={{ background: "rgba(245,101,101,0.08)", border: "1px solid rgba(245,101,101,0.25)", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#e53e3e", marginBottom: 12 }}>
              ⚠ {spamError}
            </div>
          )}

          <button className="bk2-submit" disabled={loading || paymentProcessing} onClick={handleSubmit}>
            {loading || paymentProcessing
              ? "Please wait..."
              : paymentEnabled
                ? `✓  Pay ₹${payAmount.toLocaleString()} & Confirm Booking`
                : "✓  Confirm Booking"}
          </button>
          <p style={{ textAlign: "center", color: "rgba(0,0,0,0.25)", fontSize: 11, marginTop: 10, marginBottom: 0 }}>
            We confirm via WhatsApp within 30 minutes
          </p>
        </StepCard>

      </div>

      {/* ── Success Modal ── */}
      {booked && (
        <div className="bk2-overlay" onClick={() => attemptCloseModal()}>
          <div className={`bk2-modal ${modalShake ? "bk2-shake" : ""}`} onClick={e => e.stopPropagation()}>
            <div className="bk2-modal-top">
              <button onClick={() => attemptCloseModal()} style={{ position: "absolute", top: 12, right: 12, width: 30, height: 30, borderRadius: "50%", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.5)", cursor: "pointer" }}>
                <X size={14} />
              </button>
              <div className="bk2-modal-check"><Check size={28} /></div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 500, color: "#fff", marginBottom: 4 }}>Booking Request Submitted</div>
              {booked.id && (
                <div style={{ display: "inline-block", background: "rgba(201,168,76,0.15)", border: "1px solid rgba(201,168,76,0.3)", borderRadius: 20, padding: "3px 14px", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "#E8C96D", fontFamily: "monospace" }}>
                  BG-{String(booked.id).padStart(5, "0")}
                </div>
              )}
              <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.55)", marginTop: 10, lineHeight: 1.6, maxWidth: 320, marginLeft: "auto", marginRight: "auto" }}>
                Your appointment request has been received.
              </div>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 6, marginTop: 12,
                background: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.3)",
                borderRadius: 20, padding: "6px 14px", fontSize: 11.5, fontWeight: 700,
                color: "#E8C96D", letterSpacing: "0.02em",
              }}>
                ⚠ It&apos;s mandatory to confirm your booking on WhatsApp to finalize it
              </div>
            </div>
            <div style={{ padding: "16px 24px" }}>
              {[
                { icon: <Sparkles size={12} />, key: "Service", val: booked.service.split(", ").map((s: string) => s.split(" — ")[0]).join(", ") },
                { icon: <Calendar size={12} />, key: "Date", val: formatDate(booked.bookingDate) },
                { icon: <Clock size={12} />, key: "Time", val: TIME_SLOTS.find(s => s.value === booked.bookingTime)?.label ?? booked.bookingTime },
                { icon: <MapPin size={12} />, key: "Type", val: "Home Service" },
              ].map((r, i) => (
                <div key={i} className="rv-row">
                  <div className="rv-icon">{r.icon}</div>
                  <div className="rv-key">{r.key}</div>
                  <div className="rv-val">{r.val}</div>
                </div>
              ))}
            </div>

            {!waConfirmed && closeWarning && (
              <div style={{ margin: "0 24px 14px", background: "rgba(245,101,101,0.08)", border: "1px solid rgba(245,101,101,0.25)", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#e53e3e", textAlign: "center" }}>
                ⚠ Please confirm your booking on WhatsApp to complete your appointment request.
              </div>
            )}

            <div style={{ display: "flex", gap: 10, padding: "0 24px 24px" }}>
              <a className="bk2-submit" style={{ flex: 1, textDecoration: "none", textAlign: "center", background: "linear-gradient(135deg,#25d366,#128c7e)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                href={`https://wa.me/919999601212?text=Hi%20Bella%20%26%20Guy!%20I%20just%20booked%20${encodeURIComponent(booked.service)}%20for%20${encodeURIComponent(formatDate(booked.bookingDate))}.%20Please%20confirm.`}
                target="_blank" rel="noopener noreferrer"
                onClick={() => {
                  setWaConfirmed(true);
                  setCloseWarning(false);
                  // WhatsApp opens in a new tab; send this tab back to the
                  // homepage so re-opening the site never lands back on a
                  // stale "booking submitted" screen.
                  setTimeout(() => { window.location.href = "/"; }, 400);
                }}>
                Confirm on WhatsApp
              </a>
              <button style={{ padding: "13px 20px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.12)", background: "transparent", fontSize: 13, fontWeight: 600, color: "rgba(0,0,0,0.4)", cursor: "pointer", fontFamily: "Inter,sans-serif" }}
                onClick={() => attemptCloseModal(() => { window.location.href = "/"; })}>
                Back to Home
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
