import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useMemo } from "react";
import { productsBySection, allProducts, maisComprados } from "@/data/products";
import { isSupabaseConfigured } from "@/services/supabaseClient";
import {
  fetchProductsBySection,
  searchProductsInDb,
} from "@/services/productsService";
import type { Product } from "@/types";

// Delay escalonado (mantido por compatibilidade, não usado para fashion)
const SECTION_DELAY: Record<string, number> = {
  "Mais comprados": 0,
  "Ofertas do mes": 400,
  "Mais Vistos":    800,
  "Novidades":      1200,
};

/**
 * Retorna os produtos de uma seção do carrossel.
 * Prioridade: Supabase → Open Food Facts → dados locais.
 */
export function useSectionProducts(title: string): Product[] {
  const fallback = productsBySection[title] ?? maisComprados;

  const { data = fallback } = useQuery({
    queryKey: ["section", title, isSupabaseConfigured()],
    queryFn: async (): Promise<Product[]> => {
      if (isSupabaseConfigured()) {
        try {
          const delay = SECTION_DELAY[title] ?? 0;
          if (delay > 0) await new Promise((r) => setTimeout(r, delay));
          const products = await fetchProductsBySection(title);
          if (products.length > 0) return products;
        } catch { /* cai para local */ }
      }

      return fallback;
    },
    staleTime:       1000 * 60 * 15,
    placeholderData: fallback,
  });

  return data;
}

/**
 * Hook de busca de produtos com:
 * - Resultados locais instantâneos (sem espera de rede)
 * - Debounce de 300ms antes de chamar a API
 * - Resultados da API substituem os locais quando chegam
 */
export function useProductSearch(query: string) {
  const trimmed = query.trim();

  // ── Debounce: só chama a API após 300ms sem digitar ──────────────────────
  const [debouncedQuery, setDebouncedQuery] = useState(trimmed);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(trimmed), 300);
    return () => clearTimeout(t);
  }, [trimmed]);

  // ── Resultados locais instantâneos (sem rede) ─────────────────────────────
  const localResults = useMemo((): Product[] => {
    if (trimmed.length < 2) return [];
    const q = trimmed.toLowerCase();
    return allProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
  }, [trimmed]);

  return useQuery({
    queryKey: ["product-search", debouncedQuery, isSupabaseConfigured()],
    queryFn: async (): Promise<Product[]> => {
      if (debouncedQuery.length < 2) return [];

      // 1. Supabase
      if (isSupabaseConfigured()) {
        try {
          const products = await searchProductsInDb(debouncedQuery);
          if (products.length > 0) return products;
        } catch { /* continua */ }
      }

      // 2. Local
      return localResults;
    },
    enabled:         debouncedQuery.length >= 2,
    staleTime:       1000 * 60 * 5,
    // Mostra resultados locais instantaneamente enquanto a API carrega
    placeholderData: localResults.length > 0 ? localResults : undefined,
  });
}
