"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { StoredCartItem } from "@/lib/cart-types";

const STORAGE_KEY = "tt_cart_v1";

type CartContextValue = {
  items: StoredCartItem[];
  ready: boolean;
  count: number;
  subtotalCents: number;
  add: (item: Omit<StoredCartItem, "key">) => void;
  remove: (key: string) => void;
  setQuantity: (key: string, quantity: number) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function lineTotal(item: StoredCartItem) {
  return (
    item.unitPriceCents * item.quantity +
    item.addOnDetails.reduce((s, a) => s + a.priceCents * a.quantity, 0)
  );
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<StoredCartItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      // Storage can be unavailable (private mode); the cart just starts empty.
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {}
  }, [items, ready]);

  const add = useCallback((item: Omit<StoredCartItem, "key">) => {
    setItems((prev) => [...prev, { ...item, key: crypto.randomUUID() }]);
  }, []);
  const remove = useCallback((key: string) => setItems((prev) => prev.filter((i) => i.key !== key)), []);
  const setQuantity = useCallback(
    (key: string, quantity: number) =>
      setItems((prev) => prev.map((i) => (i.key === key ? { ...i, quantity: Math.min(50, Math.max(1, quantity)) } : i))),
    [],
  );
  const clear = useCallback(() => setItems([]), []);

  const value = useMemo(
    () => ({
      items,
      ready,
      count: items.reduce((s, i) => s + i.quantity, 0),
      subtotalCents: items.reduce((s, i) => s + lineTotal(i), 0),
      add,
      remove,
      setQuantity,
      clear,
    }),
    [items, ready, add, remove, setQuantity, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
