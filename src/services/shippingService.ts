/**
 * shippingService.ts
 *
 * Calculo de frete por tabela de estados.
 * Configuravel por cliente — altere as constantes abaixo.
 */

// ─── Configuracao da loja (ajustar por cliente) ───────────────────────────────
export const ORIGIN_CITY             = "Alagoinhas"; // Cidade de origem da loja
export const ORIGIN_STATE            = "BA";          // Estado de origem da loja
export const FREE_SHIPPING_THRESHOLD = Infinity;      // Infinity = sem frete grátis automático
export const ALAGOINHAS_SHIPPING     = 8;             // Frete local para Alagoinhas (R$)

// ─── Tabela de fretes por estado (R$) ────────────────────────────────────────
// Origem: Bahia (CEP 48021-555)
const SHIPPING_RATES: Record<string, number> = {
  // Mesmo estado
  BA: 12,

  // Nordeste
  SE: 16, AL: 16, PE: 18, PB: 18,
  RN: 20, CE: 20, PI: 22, MA: 22,

  // Centro-Oeste
  TO: 24, GO: 25, DF: 25, MT: 28, MS: 28,

  // Sudeste
  MG: 25, ES: 27, RJ: 29, SP: 30,

  // Sul
  PR: 32, SC: 34, RS: 36,

  // Norte
  PA: 38, AP: 40, RR: 42, AM: 42,
  RO: 42, AC: 45,
};

const DEFAULT_RATE = 30;

// ─── Funcoes exportadas ───────────────────────────────────────────────────────

/** Verifica se a cidade é Alagoinhas (origem da loja). */
export function isAlagoinhasCity(city: string): boolean {
  return city.trim().toLowerCase() === ORIGIN_CITY.toLowerCase();
}

/**
 * Retorna o custo de frete em reais.
 * 0 = frete gratis (por threshold ou estado nao selecionado).
 * Para Alagoinhas usa tarifa local (ALAGOINHAS_SHIPPING).
 */
export function calculateShipping(uf: string, subtotal: number, city = ""): number {
  if (!uf) return 0;
  if (isAlagoinhasCity(city)) return ALAGOINHAS_SHIPPING;
  if (subtotal >= FREE_SHIPPING_THRESHOLD) return 0;
  return SHIPPING_RATES[uf.toUpperCase()] ?? DEFAULT_RATE;
}

/** Verifica se o subtotal qualifica para frete gratis. */
export function isShippingFree(subtotal: number): boolean {
  return subtotal >= FREE_SHIPPING_THRESHOLD;
}

/**
 * Verifica se o pedido e de entrega local (mesma cidade de origem).
 * Pedidos locais sao entregues por motoboy — sem rastreio de transportadora.
 */
export function isLocalOrder(city: string, state: string): boolean {
  return (
    city.trim().toLowerCase()  === ORIGIN_CITY.toLowerCase() &&
    state.trim().toUpperCase() === ORIGIN_STATE.toUpperCase()
  );
}

/** Texto descritivo do frete para exibir no checkout. */
export function shippingLabel(uf: string, subtotal: number): string {
  if (!uf) return "Selecione o estado";
  if (subtotal >= FREE_SHIPPING_THRESHOLD) return "Gratis";
  const value = SHIPPING_RATES[uf.toUpperCase()] ?? DEFAULT_RATE;
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
