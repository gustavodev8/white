import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem, Product } from "@/types";
import { CART_STORAGE_KEY } from "@/config/storeConfig";

interface CartStore {
  items: CartItem[];
  addItem: (product: Product, selectedSize?: string | null) => void;
  removeItem: (cartKey: string) => void;
  increaseQty: (cartKey: string) => void;
  decreaseQty: (cartKey: string) => void;
  setQuantity: (cartKey: string, qty: number) => void;
  clearCart: () => void;
}

function makeCartKey(productId: string, selectedSize?: string | null): string {
  return `${productId}_${selectedSize ?? ""}`;
}

/** Effective stock limit for a cart item — size-aware */
function stockLimit(item: CartItem): number {
  if (item.selectedSize && item.sizeStock) {
    const s = item.sizeStock[item.selectedSize];
    if (s !== undefined) return s;
  }
  return item.stock ?? Infinity;
}

export const useCart = create<CartStore>()(
  persist(
    (set) => ({
      items: [],

      addItem: (product, selectedSize) =>
        set((state) => {
          const cartKey = makeCartKey(product.id, selectedSize);
          const existing = state.items.find((i) => i.cartKey === cartKey);

          const maxStock =
            selectedSize && product.sizeStock
              ? (product.sizeStock[selectedSize] ?? product.stock ?? Infinity)
              : (product.stock ?? Infinity);

          if (existing) {
            if (existing.cartQuantity >= maxStock) return state;
            return {
              items: state.items.map((i) =>
                i.cartKey === cartKey
                  ? { ...i, cartQuantity: i.cartQuantity + 1 }
                  : i
              ),
            };
          }

          return {
            items: [
              ...state.items,
              {
                ...product,
                cartQuantity: 1,
                selectedSize: selectedSize ?? null,
                cartKey,
              },
            ],
          };
        }),

      removeItem: (cartKey) =>
        set((state) => ({ items: state.items.filter((i) => i.cartKey !== cartKey) })),

      increaseQty: (cartKey) =>
        set((state) => ({
          items: state.items.map((i) => {
            if (i.cartKey !== cartKey) return i;
            if (i.cartQuantity >= stockLimit(i)) return i;
            return { ...i, cartQuantity: i.cartQuantity + 1 };
          }),
        })),

      decreaseQty: (cartKey) =>
        set((state) => {
          const item = state.items.find((i) => i.cartKey === cartKey);
          if (item && item.cartQuantity <= 1) {
            return { items: state.items.filter((i) => i.cartKey !== cartKey) };
          }
          return {
            items: state.items.map((i) =>
              i.cartKey === cartKey ? { ...i, cartQuantity: i.cartQuantity - 1 } : i
            ),
          };
        }),

      setQuantity: (cartKey, qty) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.cartKey === cartKey ? { ...i, cartQuantity: Math.max(1, qty) } : i
          ),
        })),

      clearCart: () => set({ items: [] }),
    }),
    { name: CART_STORAGE_KEY }
  )
);

/** Helpers derivados — use fora do create para evitar re-renders desnecessários */
export const cartTotal = (items: CartItem[]) =>
  items.reduce((sum, i) => sum + i.price * i.cartQuantity, 0);

export const cartCount = (items: CartItem[]) =>
  items.reduce((sum, i) => sum + i.cartQuantity, 0);
