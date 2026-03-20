import { restGet, restPatch } from "./supabaseRest";
import { isSupabaseConfigured } from "./supabaseClient";

// ─── Tipos ────────────────────────────────────────────────────────────────────
export interface ConfigCartao {
  taxa_pct:           number;  // % por parcela acima de 1x (ex: 2.50)
  parcelas_max:       number;  // máximo de parcelas (ex: 12)
  juros_a_partir_de:  number;  // a partir de quantas parcelas aplica juros (ex: 2)
}

export interface AppConfig {
  cartao: ConfigCartao;
}

// Padrões caso a tabela não exista ainda
const DEFAULTS: AppConfig = {
  cartao: {
    taxa_pct:          2.50,
    parcelas_max:      6,
    juros_a_partir_de: 2,
  },
};

// ─── Cálculo de parcelas ──────────────────────────────────────────────────────
export function calcularParcelas(
  total: number,
  cfg: ConfigCartao,
): { parcelas: number; valorParcela: number; totalFinal: number; temJuros: boolean }[] {
  const result = [];
  for (let n = 1; n <= cfg.parcelas_max; n++) {
    const temJuros = n >= cfg.juros_a_partir_de;
    const totalFinal = temJuros
      ? total * (1 + (cfg.taxa_pct * (n - 1)) / 100)
      : total;
    result.push({
      parcelas:     n,
      valorParcela: totalFinal / n,
      totalFinal,
      temJuros,
    });
  }
  return result;
}

// ─── Fetch ────────────────────────────────────────────────────────────────────
export async function fetchConfig(): Promise<AppConfig> {
  if (!isSupabaseConfigured()) return DEFAULTS;
  try {
    const rows = await restGet<{ id: string; valor: string }[]>("config", {});
    if (!rows || rows.length === 0) return DEFAULTS;
    const map = Object.fromEntries(rows.map((r) => [r.id, r.valor]));
    return {
      cartao: {
        taxa_pct:          Number(map.taxa_cartao_pct          ?? DEFAULTS.cartao.taxa_pct),
        parcelas_max:      Number(map.taxa_cartao_parcelas_max  ?? DEFAULTS.cartao.parcelas_max),
        juros_a_partir_de: Number(map.taxa_cartao_juros_a_partir_de ?? DEFAULTS.cartao.juros_a_partir_de),
      },
    };
  } catch {
    return DEFAULTS;
  }
}

// ─── Save ─────────────────────────────────────────────────────────────────────
export async function saveConfigCartao(cfg: ConfigCartao): Promise<void> {
  const rows = [
    { id: "taxa_cartao_pct",               valor: String(cfg.taxa_pct) },
    { id: "taxa_cartao_parcelas_max",       valor: String(cfg.parcelas_max) },
    { id: "taxa_cartao_juros_a_partir_de",  valor: String(cfg.juros_a_partir_de) },
  ];
  await Promise.all(
    rows.map((r) =>
      restPatch("config", { column: "id", value: r.id }, { valor: r.valor }),
    ),
  );
}
