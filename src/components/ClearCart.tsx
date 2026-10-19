"use client";

import { useEffect } from "react";
import { useCart } from "./CartProvider";

/** Empties the cart once an order is confirmed (Stripe orders finish on another site, so the checkout page can't). */
export function ClearCart() {
  const { ready, clear } = useCart();
  useEffect(() => {
    if (ready) clear();
  }, [ready, clear]);
  return null;
}
