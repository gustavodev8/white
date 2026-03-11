// ProductCategory is a plain string — supports both fashion and legacy pharmacy
export type ProductCategory = string;

export interface Product {
  id: string;
  gtin?: string;
  name: string;
  brand: string;
  /** Sizes string: "P / M / G / GG" or "36 / 37 / 38" — or plain info like "100ml" */
  quantity: string;
  price: number;
  originalPrice: number;
  discount: number;
  image: string;
  category: ProductCategory;
  /** Total stock. null = no stock control (always available) */
  stock: number | null;
  /** Per-size stock: { "P": 5, "M": 10, "G": 3, "GG": 0 } */
  sizeStock?: Record<string, number> | null;
}

export interface CartItem extends Product {
  cartQuantity: number;
  /** The size chosen when adding this item, e.g. "M" */
  selectedSize?: string | null;
  /**
   * Unique cart key = "${id}_${selectedSize ?? ''}".
   * Same product in different sizes becomes two separate cart entries.
   */
  cartKey: string;
}

// ─── Cosmos Bluesoft API (legacy pharmacy — kept for compatibility) ────────────
export interface CosmosProduct {
  id: number;
  gtin: string;
  description: string;
  brand: { name: string };
  net_weight: string;
  avg_price: number;
  thumbnail: string;
  image: string;
  category?: { description: string };
}

export interface CosmosSearchResponse {
  products: CosmosProduct[];
  count: number;
}
