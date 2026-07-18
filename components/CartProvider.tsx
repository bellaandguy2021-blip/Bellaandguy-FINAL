"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { CartItem, CART_STORAGE_KEY } from "@/lib/cart";
import { getPublicSettings } from "@/lib/settings";
import CartModal from "./CartModal";
import CartToast from "./CartToast";
import MobileCartBar from "./MobileCartBar";

interface CartContextValue {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (key: string) => void;
  setQuantity: (key: string, quantity: number) => void;
  clearCart: () => void;
  totalPrice: number;
  count: number;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  justAddedKey: string | null;
  bumpKey: number;
  minBookingValue: number;
}

const CartContext = createContext<CartContextValue | null>(null);

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}

export default function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [justAddedKey, setJustAddedKey] = useState<string | null>(null);
  const [bumpKey, setBumpKey] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [minBookingValue, setMinBookingValue] = useState(1100);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CartItem[];
        // Back-compat: items saved before quantity support get quantity: 1.
        setItems(parsed.map(i => ({ ...i, quantity: i.quantity ?? 1 })));
      }
    } catch {}
    setLoaded(true);
    getPublicSettings().then(s => {
      const v = parseInt(s.min_booking_value ?? "", 10);
      if (!isNaN(v) && v > 0) setMinBookingValue(v);
    });
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch {}
  }, [items, loaded]);

  function addItem(item: Omit<CartItem, "quantity">) {
    setItems(prev => {
      const existing = prev.find(i => i.key === item.key);
      if (existing) {
        return prev.map(i => i.key === item.key ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
    setJustAddedKey(item.key);
    setBumpKey(k => k + 1);
    setToastMessage(`${item.name} added successfully`);
    setTimeout(() => setJustAddedKey(k => (k === item.key ? null : k)), 1800);
    setTimeout(() => setToastMessage(m => (m === `${item.name} added successfully` ? null : m)), 2600);
  }

  function removeItem(key: string) {
    setItems(prev => prev.filter(i => i.key !== key));
  }

  function setQuantity(key: string, quantity: number) {
    if (quantity <= 0) { removeItem(key); return; }
    setItems(prev => prev.map(i => i.key === key ? { ...i, quantity } : i));
  }

  function clearCart() {
    setItems([]);
  }

  const totalPrice = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const count = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items, addItem, removeItem, setQuantity, clearCart, totalPrice, count,
        isOpen, openCart: () => setIsOpen(true), closeCart: () => setIsOpen(false),
        justAddedKey, bumpKey, minBookingValue,
      }}
    >
      {children}
      {isOpen && <CartModal onClose={() => setIsOpen(false)} />}
      {!isOpen && <MobileCartBar />}
      <CartToast message={toastMessage} />
    </CartContext.Provider>
  );
}
