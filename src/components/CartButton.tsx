"use client";

import Link from "next/link";
import { useCart } from "./CartProvider";
import { BagIcon } from "./icons";

export function CartButton() {
  const { count, ready } = useCart();
  const shown = ready ? count : 0;
  return (
    <Link href="/cart" aria-label={`Cart, ${shown} items`} className="btn btn-dark min-h-11 px-5 text-sm">
      <BagIcon className="h-[18px] w-[18px] text-pink-light" />
      Cart ({shown})
    </Link>
  );
}
