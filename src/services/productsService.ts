import { supabase } from "./supabaseClient";
import { restGet, restPost, restPatch, restDelete } from "./supabaseRest";
import type { Product, ProductCategory } from "@/types";

// ─── Tipo de entrada para criar/atualizar produto ─────────────────────────────
export interface ProductInput {
  name:          string;
  brand:         string;
  quantity:      string;
  price:         number;
  originalPrice: number;
  discount:      number;
  imageUrl:      string;
  category:      ProductCategory;
  sections:      string[];
  isActive:      boolean;
  stock:         number | null;
  /** Per-size stock. null = use single stock field. */
  sizeStock?:    Record<string, number> | null;
}

// ─── Formato da linha no banco (snake_case) ───────────────────────────────────
interface DbProduct {
  id:             string;
  name:           string;
  brand:          string;
  quantity:       string;
  price:          number;
  original_price: number;
  discount:       number;
  image_url:      string;
  category:       string;
  sections:       string[];
  is_active:      boolean;
  stock:          number | null;
  size_stock:     Record<string, number> | null;
  created_at:     string;
  updated_at:     string;
}

/** Converte linha do banco para o tipo Product do projeto */
function dbRowToProduct(row: DbProduct): Product {
  return {
    id:            row.id,
    name:          row.name,
    brand:         row.brand,
    quantity:      row.quantity,
    price:         Number(row.price),
    originalPrice: Number(row.original_price),
    discount:      row.discount,
    image:         row.image_url,
    category:      row.category as ProductCategory,
    stock:         row.stock ?? null,
    sizeStock:     row.size_stock ?? null,
  };
}

// ─── Leitura pública (REST direto — sem travamento do cliente JS) ─────────────

/**
 * Retorna produtos ativos de uma seção para exibir no carrossel.
 */
export async function fetchProductsBySection(section: string): Promise<Product[]> {
  // cs. = contains — formato PostgreSQL array literal: {"section name"}
  const rows = await restGet<DbProduct>("products", {
    sections:  `cs.{"${section}"}`,
    is_active: "eq.true",
    order:     "created_at.desc",
  });
  return rows.map(dbRowToProduct);
}

/**
 * Busca um produto pelo ID.
 */
export async function fetchProductById(id: string): Promise<Product | null> {
  try {
    const rows = await restGet<DbProduct>("products", { id: `eq.${id}`, is_active: "eq.true" });
    return rows.length > 0 ? dbRowToProduct(rows[0]) : null;
  } catch {
    return null;
  }
}

/**
 * Retorna produtos com desconto maior que minDiscount.
 * Ordenados do maior para o menor desconto.
 */
export async function fetchProductsOnSale(minDiscount = 0): Promise<Product[]> {
  const rows = await restGet<DbProduct>("products", {
    discount:  `gt.${minDiscount}`,
    is_active: "eq.true",
    order:     "discount.desc",
  });
  return rows.map(dbRowToProduct);
}

/**
 * Retorna produtos ativos de múltiplas categorias (combinadas).
 */
export async function fetchProductsByCategories(categories: string[]): Promise<Product[]> {
  // in. = IN filter — formato: {val1,val2,...}
  const rows = await restGet<DbProduct>("products", {
    category:  `in.(${categories.join(",")})`,
    is_active: "eq.true",
    order:     "created_at.desc",
  });
  return rows.map(dbRowToProduct);
}

/**
 * Retorna produtos ativos de uma categoria.
 */
export async function fetchProductsByCategory(category: string): Promise<Product[]> {
  const rows = await restGet<DbProduct>("products", {
    category:  `eq.${category}`,
    is_active: "eq.true",
    order:     "created_at.desc",
  });
  return rows.map(dbRowToProduct);
}

/**
 * Busca produtos por nome ou marca (case-insensitive).
 * Retorna apenas produtos ativos (garantido pela RLS).
 */
export async function searchProductsInDb(query: string): Promise<Product[]> {
  // ilike com % como wildcard SQL; searchParams codifica % como %25 automaticamente
  const q = query.replace(/[%_]/g, "\\$&"); // escapa wildcards acidentais
  const rows = await restGet<DbProduct>("products", {
    or:        `(name.ilike.%${q}%,brand.ilike.%${q}%)`,
    is_active: "eq.true",
    order:     "created_at.desc",
    limit:     "20",
  });
  return rows.map(dbRowToProduct);
}

// ─── Admin (requer usuário autenticado) ──────────────────────────────────────

/**
 * Lista TODOS os produtos (ativos e inativos) para o painel admin.
 * Usa fetch direto à REST API para evitar travamento do cliente JS.
 */
export async function fetchAllProducts(): Promise<(Product & { isActive: boolean; sections: string[] })[]> {
  const rows = await restGet<DbProduct>("products", { order: "created_at.desc" });
  return rows.map((row) => ({
    ...dbRowToProduct(row),
    isActive: row.is_active,
    sections: row.sections,
  }));
}

/**
 * Faz upload de uma imagem para o Storage e retorna a URL pública.
 */
export async function uploadProductImage(file: File): Promise<string> {
  const ext  = file.name.split(".").pop() ?? "jpg";
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage
    .from("product-images")
    .upload(path, file, { upsert: false });

  if (error) throw error;

  const { data } = supabase.storage.from("product-images").getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Cria um produto. Se imageFile for fornecido, faz upload antes do insert.
 * Usa REST direto para evitar travamento do cliente JS.
 */
export async function createProduct(
  input: ProductInput,
  imageFile?: File
): Promise<Product> {
  let imageUrl = input.imageUrl;

  if (imageFile) {
    imageUrl = await uploadProductImage(imageFile);
  }

  const row = await restPost<DbProduct>("products", {
    name:           input.name,
    brand:          input.brand,
    quantity:       input.quantity,
    price:          input.price,
    original_price: input.originalPrice,
    discount:       input.discount,
    image_url:      imageUrl,
    category:       input.category,
    sections:       input.sections,
    is_active:      input.isActive,
    stock:          input.stock,
    size_stock:     input.sizeStock ?? null,
  });

  return dbRowToProduct(row);
}

/**
 * Atualiza um produto existente.
 * Usa REST direto para evitar travamento do cliente JS.
 */
export async function updateProduct(
  id: string,
  input: Partial<ProductInput>,
  imageFile?: File
): Promise<Product> {
  let imageUrl = input.imageUrl;

  if (imageFile) {
    imageUrl = await uploadProductImage(imageFile);
  }

  const patch: Record<string, unknown> = {};
  if (input.name          !== undefined) patch.name           = input.name;
  if (input.brand         !== undefined) patch.brand          = input.brand;
  if (input.quantity      !== undefined) patch.quantity       = input.quantity;
  if (input.price         !== undefined) patch.price          = input.price;
  if (input.originalPrice !== undefined) patch.original_price = input.originalPrice;
  if (input.discount      !== undefined) patch.discount       = input.discount;
  if (imageUrl            !== undefined) patch.image_url      = imageUrl;
  if (input.category      !== undefined) patch.category       = input.category;
  if (input.sections      !== undefined) patch.sections       = input.sections;
  if (input.isActive      !== undefined) patch.is_active      = input.isActive;
  if ("stock" in input)                  patch.stock          = input.stock;
  if ("sizeStock" in input)              patch.size_stock     = input.sizeStock;
  patch.updated_at = new Date().toISOString();

  const row = await restPatch<DbProduct>(
    "products",
    { column: "id", value: id },
    patch,
    true, // retorna a linha atualizada
  );

  return dbRowToProduct(row as DbProduct);
}

/**
 * Ativa ou desativa um produto.
 * Usa REST direto para evitar travamento do cliente JS.
 */
export async function toggleProductActive(id: string, active: boolean): Promise<void> {
  await restPatch(
    "products",
    { column: "id", value: id },
    { is_active: active, updated_at: new Date().toISOString() },
  );
}

/**
 * Remove um produto permanentemente.
 * Usa REST direto para evitar travamento do cliente JS.
 */
export async function deleteProduct(id: string): Promise<void> {
  await restDelete("products", { column: "id", value: id });
}
