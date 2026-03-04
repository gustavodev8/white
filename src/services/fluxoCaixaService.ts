import { restGet, restPost, restDelete } from "./supabaseRest";
import type { Order } from "./ordersService";

export type TipoTransacao = "entrada" | "saida";

/* ── Tipos ──────────────────────────────────────────────────────────── */
export interface TransacaoInput {
  tipo:             TipoTransacao;
  categoria:        string;
  descricao:        string;
  valor:            number;
  data:             string; // YYYY-MM-DD
  forma_pagamento?: string;
  observacao?:      string;
}

export interface Transacao extends TransacaoInput {
  id:         string;
  created_at: string;
}

/** Entrada unificada: pode vir de um pedido ou de lançamento manual */
export interface EntradaFluxo {
  id:              string;
  tipo:            TipoTransacao;
  categoria:       string;
  descricao:       string;
  valor:           number;
  data:            string;       // YYYY-MM-DD
  forma_pagamento: string | null;
  observacao:      string | null;
  source:          "order" | "manual";
  created_at:      string;
}

/* ── Categorias ─────────────────────────────────────────────────────── */
export const CATEGORIAS_ENTRADA = [
  "Suprimento", "Transferência recebida", "Outros",
];

export const CATEGORIAS_SAIDA = [
  "Sangria", "Fornecedor", "Aluguel", "Salários", "Água/Luz",
  "Internet", "Manutenção", "Impostos", "Material de escritório", "Outros",
];

export const FORMAS_PAGAMENTO = [
  "Dinheiro", "Pix", "Cartão de crédito", "Cartão de débito", "Boleto", "Transferência",
];

/* ── Helpers de mês ─────────────────────────────────────────────────── */
function mesRange(mes: string): { inicio: string; fim: string } {
  const [y, m] = mes.split("-").map(Number);
  const inicio = `${mes}-01`;
  const fim    = new Date(y, m, 0).toISOString().slice(0, 10);
  return { inicio, fim };
}

/* ── fetchTransacoesManuais ─────────────────────────────────────────── */
async function fetchTransacoesManuais(mes: string): Promise<Transacao[]> {
  try {
    const { inicio, fim } = mesRange(mes);
    return await restGet<Transacao>("fluxo_caixa", {
      select: "*",
      and:    `(data.gte.${inicio},data.lte.${fim})`,
      order:  "data.desc,created_at.desc",
    });
  } catch {
    return [];
  }
}

/* ── fetchPedidosConcluidos ─────────────────────────────────────────── */
async function fetchPedidosConcluidos(mes: string): Promise<Order[]> {
  try {
    const { inicio, fim } = mesRange(mes);
    // PostgREST and() permite múltiplos filtros no mesmo campo
    return await restGet<Order>("orders", {
      select: "*",
      and:    `(status.eq.delivered,created_at.gte.${inicio}T00:00:00.000Z,created_at.lte.${fim}T23:59:59.999Z)`,
      order:  "created_at.desc",
    });
  } catch {
    return [];
  }
}

/* ── fetchFluxoCombinado ────────────────────────────────────────────── */
export async function fetchFluxoCombinado(mes: string): Promise<EntradaFluxo[]> {
  const [manuais, pedidos] = await Promise.all([
    fetchTransacoesManuais(mes),
    fetchPedidosConcluidos(mes),
  ]);

  const fromOrders: EntradaFluxo[] = pedidos.map(o => ({
    id:              o.id,
    tipo:            "entrada" as TipoTransacao,
    categoria:       "Venda",
    descricao:       `Pedido ${o.order_number} — ${o.customer_name}`,
    valor:           Number(o.total),
    data:            o.created_at.slice(0, 10),
    forma_pagamento: o.payment_method === "pix" ? "Pix"
                   : o.payment_method === "credit" ? "Cartão de crédito"
                   : "Boleto",
    observacao:      null,
    source:          "order",
    created_at:      o.created_at,
  }));

  const fromManuais: EntradaFluxo[] = manuais.map(t => ({
    id:              t.id,
    tipo:            t.tipo,
    categoria:       t.categoria,
    descricao:       t.descricao,
    valor:           Number(t.valor),
    data:            t.data,
    forma_pagamento: t.forma_pagamento ?? null,
    observacao:      t.observacao ?? null,
    source:          "manual",
    created_at:      t.created_at,
  }));

  // Ordenar por data desc
  return [...fromOrders, ...fromManuais].sort((a, b) =>
    b.data.localeCompare(a.data) || b.created_at.localeCompare(a.created_at),
  );
}

/* ── createTransacao ────────────────────────────────────────────────── */
export async function createTransacao(
  input: TransacaoInput,
): Promise<{ transacao: Transacao | null; error?: string }> {
  try {
    const row = await restPost<Transacao>("fluxo_caixa", {
      tipo:            input.tipo,
      categoria:       input.categoria,
      descricao:       input.descricao,
      valor:           input.valor,
      data:            input.data,
      forma_pagamento: input.forma_pagamento ?? null,
      observacao:      input.observacao ?? null,
    });
    return { transacao: row };
  } catch (err) {
    return { transacao: null, error: err instanceof Error ? err.message : "Erro ao criar transação" };
  }
}

/* ── deleteTransacao ────────────────────────────────────────────────── */
export async function deleteTransacao(id: string): Promise<void> {
  await restDelete("fluxo_caixa", { column: "id", value: id });
}
