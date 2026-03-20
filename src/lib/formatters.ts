/** Formata número como moeda BRL (R$ 1.234,56) */
export const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Formata ISO string como dd/mm/aaaa */
export function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

/** Formata ISO string como dd/mm/aaaa hh:mm */
export function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

/** Rótulos de métodos de pagamento para exibição */
export const PAYMENT_LABELS: Record<string, string> = {
  pix:    "PIX",
  credit: "Cartão",
  boleto: "Boleto",
};
