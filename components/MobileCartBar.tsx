"use client";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { usePathname } from "next/navigation";
import { useCart } from "./CartProvider";
import { cartItemsToServiceStrings, CART_CHECKOUT_KEY } from "@/lib/cart";

export default function MobileCartBar() {
  const { items, count, totalPrice, openCart, minBookingValue } = useCart();
  const pathname = usePathname();
  const belowMinimum = totalPrice > 0 && totalPrice < minBookingValue;
  // Cart items stay in the cart until a booking actually submits, so this bar
  // would otherwise float over the whole /book flow — clicking "Proceed to
  // Booking" there did a full page reload back to the cart-checkout entry
  // step, wiping out whatever progress (date/time/details) the customer had
  // already made. There's nowhere further to "proceed" to once already in
  // the booking flow, so just don't show it there.
  const onBookingFlow = pathname?.startsWith("/book");

  function handleCheckout() {
    if (belowMinimum) { openCart(); return; }
    sessionStorage.setItem(CART_CHECKOUT_KEY, JSON.stringify(cartItemsToServiceStrings(items)));
    window.location.href = "/book";
  }

  if (onBookingFlow) return null;

  return (
    <>
      <style>{`
        .mcb-wrap { display: none; }
        @media (max-width: 768px) {
          .mcb-wrap {
            display: flex; position: fixed; left: 0; right: 0; bottom: 0; z-index: 996;
            align-items: center; justify-content: space-between; gap: 10px;
            background: linear-gradient(135deg, #080808, #1a1200);
            padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
            box-shadow: 0 -8px 28px rgba(0,0,0,0.3);
          }
          .mcb-info { display: flex; flex-direction: column; cursor: pointer; }
          .mcb-count { font-size: 11.5px; color: rgba(255,255,255,0.6); font-family: 'Inter', sans-serif; }
          .mcb-price { font-family: 'Cormorant Garamond', serif; font-size: 19px; font-weight: 700; color: #E8C96D; }
          .mcb-btn {
            display: flex; align-items: center; gap: 6px;
            background: linear-gradient(135deg, #E8C96D, #C9A84C); color: #080808; border: none;
            border-radius: 10px; padding: 12px 18px; font-size: 12.5px; font-weight: 700;
            letter-spacing: 0.04em; font-family: 'Inter', sans-serif; cursor: pointer; flex-shrink: 0;
            white-space: nowrap;
          }
          .mcb-btn.mcb-btn-low {
            background: rgba(245,101,101,0.15); color: #f5a5a5;
            border: 1px solid rgba(245,101,101,0.35);
          }
        }
      `}</style>
      <AnimatePresence>
        {count > 0 && (
          <motion.div
            className="mcb-wrap"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="mcb-info" onClick={openCart}>
              <span className="mcb-count">{count} Service{count !== 1 ? "s" : ""}</span>
              <span className="mcb-price">₹{totalPrice.toLocaleString()}</span>
            </div>
            <button className={`mcb-btn ${belowMinimum ? "mcb-btn-low" : ""}`} onClick={handleCheckout}>
              {belowMinimum ? `Add ₹${(minBookingValue - totalPrice).toLocaleString()} more` : "Proceed to Booking"}
              <ArrowRight size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
