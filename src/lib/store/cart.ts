"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ShippingProfile } from "../geo";
import type { L } from "../types";

export type CartLine = {
  variantId: string;
  slug: string;
  name: L;
  variantLabel: L;
  image: string;
  price: number; // EUR cents snapshot; re-validated server-side at checkout
  shipping: ShippingProfile;
  quantity: number;
  maxQty: number;
};

type CartState = {
  lines: CartLine[];
  giftWrap: boolean;
  giftMessage: string;
  discountCode: string | null;
  drawerOpen: boolean;
  add: (line: Omit<CartLine, "quantity">, qty?: number) => void;
  setQty: (variantId: string, qty: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
  setGiftWrap: (v: boolean) => void;
  setGiftMessage: (v: string) => void;
  setDiscount: (code: string | null) => void;
  openDrawer: () => void;
  closeDrawer: () => void;
};

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      giftWrap: false,
      giftMessage: "",
      discountCode: null,
      drawerOpen: false,
      add: (line, qty = 1) =>
        set((s) => {
          const existing = s.lines.find((l) => l.variantId === line.variantId);
          const lines = existing
            ? s.lines.map((l) =>
                l.variantId === line.variantId ? { ...l, quantity: Math.min(l.quantity + qty, l.maxQty) } : l,
              )
            : [...s.lines, { ...line, quantity: Math.min(qty, line.maxQty) }];
          return { lines, drawerOpen: true };
        }),
      setQty: (variantId, qty) =>
        set((s) => ({
          lines: s.lines
            .map((l) => (l.variantId === variantId ? { ...l, quantity: Math.min(Math.max(qty, 0), l.maxQty) } : l))
            .filter((l) => l.quantity > 0),
        })),
      remove: (variantId) => set((s) => ({ lines: s.lines.filter((l) => l.variantId !== variantId) })),
      clear: () => set({ lines: [], giftWrap: false, giftMessage: "", discountCode: null }),
      setGiftWrap: (giftWrap) => set({ giftWrap }),
      setGiftMessage: (giftMessage) => set({ giftMessage }),
      setDiscount: (discountCode) => set({ discountCode }),
      openDrawer: () => set({ drawerOpen: true }),
      closeDrawer: () => set({ drawerOpen: false }),
    }),
    {
      name: "tc-cart",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: ({ lines, giftWrap, giftMessage, discountCode }) => ({ lines, giftWrap, giftMessage, discountCode }),
    },
  ),
);

export const cartCount = (lines: CartLine[]) => lines.reduce((n, l) => n + l.quantity, 0);
export const cartSubtotal = (lines: CartLine[]) => lines.reduce((n, l) => n + l.price * l.quantity, 0);

type WishlistState = {
  slugs: string[];
  toggle: (slug: string) => void;
  has: (slug: string) => boolean;
};

export const useWishlist = create<WishlistState>()(
  persist(
    (set, get) => ({
      slugs: [],
      toggle: (slug) =>
        set((s) => ({ slugs: s.slugs.includes(slug) ? s.slugs.filter((x) => x !== slug) : [...s.slugs, slug] })),
      has: (slug) => get().slugs.includes(slug),
    }),
    { name: "tc-wishlist", storage: createJSONStorage(() => localStorage), skipHydration: true },
  ),
);
