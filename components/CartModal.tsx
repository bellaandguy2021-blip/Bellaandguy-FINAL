"use client";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import { X, Trash2, ShoppingBag, Clock, ArrowRight, Minus, Plus, Eye } from "lucide-react";
import { useCart } from "./CartProvider";
import {
  cartItemsToServiceStrings, CART_CHECKOUT_KEY,
  parseDurationMinutes, formatMinutes,
} from "@/lib/cart";
import { slugifyService } from "@/lib/servicesData";

interface CartModalProps {
  onClose: () => void;
}

export default function CartModal({ onClose }: CartModalProps) {
  const { items, removeItem, setQuantity, totalPrice, minBookingValue } = useCart();
  const totalDuration = items.reduce((sum, i) => sum + parseDurationMinutes(i.duration) * i.quantity, 0);
  const belowMinimum = totalPrice > 0 && totalPrice < minBookingValue;
  const pathname = usePathname();
  // Cart items stay in the cart until a booking submits, so this modal can be
  // opened while already mid-flow on /book — reloading there would wipe
  // whatever step progress (date/time/details) the customer already made.
  const onBookingFlow = pathname?.startsWith("/book");

  function handleCheckout() {
    if (belowMinimum) return;
    if (onBookingFlow) { onClose(); return; }
    sessionStorage.setItem(CART_CHECKOUT_KEY, JSON.stringify(cartItemsToServiceStrings(items)));
    window.location.href = "/book";
  }

  return (
    <>
      <style>{`
        .cm-overlay {
          position: fixed; inset: 0; z-index: 9999;
          background: rgba(4,4,8,0.72); backdrop-filter: blur(10px);
          display: flex; justify-content: flex-end;
          animation: cmFadeIn 0.25s ease;
        }
        @keyframes cmFadeIn { from{opacity:0} to{opacity:1} }
        .cm-panel {
          background: #FFFDF8; height: 100%; width: 100%; max-width: 420px;
          display: flex; flex-direction: column;
          animation: cmSlideIn 0.32s cubic-bezier(0.22,1,0.36,1);
          box-shadow: -20px 0 60px rgba(0,0,0,0.25);
        }
        @keyframes cmSlideIn { from{transform:translateX(100%)} to{transform:translateX(0)} }

        .cm-head {
          background: linear-gradient(135deg, #080808, #1a1200);
          padding: 22px 24px; display: flex; align-items: center; justify-content: space-between;
        }
        .cm-head-title { display: flex; align-items: center; gap: 9px; color: #fff; font-family: 'Cormorant Garamond', serif; font-size: 21px; font-weight: 500; }
        .cm-close {
          width: 32px; height: 32px; border-radius: 50%; background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.12); display: flex; align-items: center; justify-content: center;
          color: rgba(255,255,255,0.6); cursor: pointer; flex-shrink: 0;
        }

        .cm-body { flex: 1; overflow-y: auto; padding: 8px 0; }
        .cm-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; padding: 40px 24px; text-align: center; gap: 14px; }
        .cm-empty-icon {
          width: 72px; height: 72px; border-radius: 50%; background: rgba(201,168,76,0.08);
          display: flex; align-items: center; justify-content: center; color: #C9A84C;
        }
        .cm-empty-title { font-family: 'Cormorant Garamond', serif; font-size: 20px; font-weight: 600; color: #080808; }
        .cm-empty-sub { font-size: 12.5px; color: #999; max-width: 240px; line-height: 1.6; }
        .cm-empty-btn {
          margin-top: 6px; padding: 12px 24px; border-radius: 10px; border: none;
          background: linear-gradient(135deg,#E8C96D,#C9A84C); color: #080808; font-weight: 700;
          font-size: 12.5px; letter-spacing: 0.05em; cursor: pointer; font-family: 'Inter', sans-serif;
        }

        .cm-item { display: flex; gap: 12px; padding: 14px 24px; border-bottom: 1px solid rgba(0,0,0,0.06); align-items: flex-start; }
        .cm-item-img { width: 56px; height: 56px; border-radius: 10px; object-fit: cover; flex-shrink: 0; background: #eee; }
        .cm-item-info { flex: 1; min-width: 0; }
        .cm-item-name { font-size: 13.5px; font-weight: 700; color: #080808; }
        .cm-item-cat { font-size: 11px; color: #8a6a1a; margin-top: 2px; }
        .cm-item-dur { display: flex; align-items: center; gap: 4px; font-size: 11px; color: #999; margin-top: 4px; }
        .cm-item-actions { display: flex; align-items: center; gap: 10px; margin-top: 8px; }
        .cm-item-qty { display: flex; align-items: center; gap: 8px; background: rgba(0,0,0,0.04); border-radius: 8px; padding: 3px 4px; }
        .cm-item-qty button {
          width: 20px; height: 20px; border-radius: 6px; border: none; background: #fff;
          display: flex; align-items: center; justify-content: center; cursor: pointer; color: #080808;
          box-shadow: 0 1px 3px rgba(0,0,0,0.12);
        }
        .cm-item-qty span { font-size: 12px; font-weight: 700; min-width: 14px; text-align: center; }
        .cm-item-view { display: flex; align-items: center; gap: 4px; font-size: 11px; color: #8a6a1a; font-weight: 600; text-decoration: none; }
        .cm-item-right { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; flex-shrink: 0; }
        .cm-item-price { font-size: 13.5px; font-weight: 700; color: #C9A84C; white-space: nowrap; }
        .cm-item-remove {
          background: rgba(245,101,101,0.08); border: none; border-radius: 8px;
          width: 26px; height: 26px; display: flex; align-items: center; justify-content: center;
          color: #e53e3e; cursor: pointer; flex-shrink: 0;
        }
        .cm-item-remove:hover { background: rgba(245,101,101,0.16); }

        .cm-footer { border-top: 1px solid rgba(0,0,0,0.08); padding: 18px 24px 22px; background: #fff; }
        .cm-summary-row { display: flex; justify-content: space-between; align-items: center; font-size: 12.5px; color: #666; margin-bottom: 6px; }
        .cm-total-row { display: flex; justify-content: space-between; align-items: center; margin: 10px 0 16px; }
        .cm-total-label { font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #999; }
        .cm-total-price { font-family: 'Cormorant Garamond', serif; font-size: 26px; font-weight: 700; color: #080808; }

        .cm-min-warning {
          background: rgba(245,101,101,0.08); border: 1px solid rgba(245,101,101,0.25);
          border-radius: 10px; padding: 9px 12px; font-size: 11.5px; color: #e53e3e;
          margin-bottom: 12px; text-align: center;
        }

        .cm-checkout-btn {
          width: 100%; padding: 15px; display: flex; align-items: center; justify-content: center; gap: 8px;
          background: linear-gradient(135deg, #E8C96D, #C9A84C); color: #080808; border: none; border-radius: 12px;
          font-size: 13px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; cursor: pointer;
          font-family: 'Inter', sans-serif; transition: all 0.3s;
        }
        .cm-checkout-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(201,168,76,0.35); }
        .cm-checkout-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .cm-continue-btn {
          width: 100%; padding: 12px; margin-top: 8px; background: transparent; border: none;
          color: #8a6a1a; font-size: 12.5px; font-weight: 600; cursor: pointer; font-family: 'Inter', sans-serif;
        }
      `}</style>

      <div className="cm-overlay" onClick={onClose}>
        <div className="cm-panel" onClick={e => e.stopPropagation()}>
          <div className="cm-head">
            <div className="cm-head-title"><ShoppingBag size={19} color="#C9A84C" /> Your Cart</div>
            <button className="cm-close" onClick={onClose}><X size={15} /></button>
          </div>

          <div className="cm-body">
            {items.length === 0 ? (
              <div className="cm-empty">
                <div className="cm-empty-icon"><ShoppingBag size={30} strokeWidth={1.4} /></div>
                <div className="cm-empty-title">No Services Added Yet</div>
                <div className="cm-empty-sub">Explore our premium home services and add a few to get started.</div>
                <button className="cm-empty-btn" onClick={onClose}>Browse Services</button>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {items.map(item => (
                  <motion.div
                    key={item.key}
                    className="cm-item"
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -24, height: 0, padding: 0, marginBottom: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {item.image && <img src={item.image} alt={item.name} className="cm-item-img" />}
                    <div className="cm-item-info">
                      <div className="cm-item-name">{item.name}</div>
                      <div className="cm-item-cat">{item.categoryLabel}{item.group ? ` · ${item.group}` : ""}</div>
                      {item.duration && (
                        <div className="cm-item-dur"><Clock size={11} /> {item.duration}</div>
                      )}
                      <div className="cm-item-actions">
                        <div className="cm-item-qty">
                          <button onClick={() => setQuantity(item.key, item.quantity - 1)} aria-label="Decrease quantity"><Minus size={11} /></button>
                          <span>{item.quantity}</span>
                          <button onClick={() => setQuantity(item.key, item.quantity + 1)} aria-label="Increase quantity"><Plus size={11} /></button>
                        </div>
                        <Link
                          href={`/services/${item.categoryId}/${slugifyService(item.name)}`}
                          className="cm-item-view"
                          onClick={onClose}
                        >
                          <Eye size={11} /> View Details
                        </Link>
                      </div>
                    </div>
                    <div className="cm-item-right">
                      <div className="cm-item-price">₹{(item.price * item.quantity).toLocaleString()}</div>
                      <button className="cm-item-remove" onClick={() => removeItem(item.key)} aria-label="Remove">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>

          {items.length > 0 && (
            <div className="cm-footer">
              <div className="cm-summary-row">
                <span>{items.reduce((n, i) => n + i.quantity, 0)} service{items.reduce((n, i) => n + i.quantity, 0) !== 1 ? "s" : ""} selected</span>
                <span>Est. duration: {formatMinutes(totalDuration)}</span>
              </div>
              <div className="cm-total-row">
                <span className="cm-total-label">Total Amount</span>
                <span className="cm-total-price">₹{totalPrice.toLocaleString()}</span>
              </div>
              {belowMinimum && (
                <div className="cm-min-warning">
                  Minimum booking value is ₹{minBookingValue.toLocaleString()} — add ₹{(minBookingValue - totalPrice).toLocaleString()} more to proceed.
                </div>
              )}
              <button className="cm-checkout-btn" onClick={handleCheckout} disabled={belowMinimum}>
                {onBookingFlow ? "Back to Booking" : "Proceed to Booking"} <ArrowRight size={15} />
              </button>
              <button className="cm-continue-btn" onClick={onClose}>Continue Shopping</button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
