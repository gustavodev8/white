// ============================================================
// Edge Function: abacatepay-payment
// Cole este código no painel Supabase > Edge Functions
// Nome da função: abacatepay-payment
//
// Variáveis de ambiente necessárias (Supabase > Settings > Secrets):
//   ABACATEPAY_KEY   → API Key do AbacatePay (começa com "acp_...")
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ABACATEPAY_KEY = Deno.env.get("ABACATEPAY_KEY") ?? "";
const BASE_URL       = "https://api.abacatepay.com/v1";
const TIMEOUT_MS     = 20_000;

const cors = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function abacateFetch(path: string, body: Record<string, unknown>) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${ABACATEPAY_KEY}`,
      },
      body:   JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await res.text();
    try { return { ok: res.ok, status: res.status, data: JSON.parse(text) }; }
    catch { throw new Error(`AbacatePay retornou resposta inválida: ${text.slice(0, 200)}`); }
  } catch (e) {
    if ((e as Error).name === "AbortError")
      throw new Error(`Timeout ao chamar AbacatePay (>${TIMEOUT_MS / 1000}s)`);
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const { action, customer, payment } = await req.json();

    // cents — AbacatePay espera valor em centavos
    const cents = Math.round(Number(payment.total) * 100);

    // ── PIX ──────────────────────────────────────────────────────
    if (action === "create_pix") {
      if (!ABACATEPAY_KEY) {
        return json({ error: "ABACATEPAY_KEY não configurada no servidor." }, 500);
      }

      const { ok, data } = await abacateFetch("/pixQrCode/create", {
        amount:      cents,
        expiresIn:   3600, // 1 hora
        description: `Pedido ${payment.orderNumber}`,
        customer: {
          name:      customer.name,
          cellphone: customer.phone,
          email:     customer.email,
          taxId:     (customer.cpf ?? "").replace(/\D/g, ""),
        },
        metadata: {
          externalId: payment.orderNumber,
        },
      });

      if (!ok || data?.error) {
        const msg = data?.error ?? "Erro ao criar Pix no AbacatePay";
        console.error("[abacatepay] Erro:", msg);
        return json({ error: friendlyError(msg) }, 400);
      }

      const pix = data?.data;
      if (!pix?.id) {
        return json({ error: "Resposta inesperada do AbacatePay" }, 500);
      }

      return json({
        paymentId:    pix.id,
        pixCode:      pix.brCode        ?? "",
        pixQrCodeUrl: pix.brCodeBase64  ?? "",
        status:       pix.status        ?? "PENDING",
      });
    }

    return json({ error: "Action inválida. AbacatePay suporta apenas: create_pix" }, 400);

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[abacatepay-payment]", msg);
    return json({ error: msg }, 500);
  }
});

function friendlyError(raw: string): string {
  const n = raw.toLowerCase();
  if (n.includes("cpf") || n.includes("taxid") || n.includes("cnpj"))
    return "CPF/CNPJ inválido. Confira e tente novamente.";
  if (n.includes("email"))
    return "E-mail inválido. Confira e tente novamente.";
  if (n.includes("phone") || n.includes("cellphone"))
    return "Telefone inválido. Informe com DDD.";
  if (n.includes("amount") || n.includes("valor"))
    return "Valor do pedido inválido.";
  if (n.includes("expired") || n.includes("expirado"))
    return "Sessão de pagamento expirada. Tente novamente.";
  if (n.includes("unauthorized") || n.includes("api key"))
    return "Erro de autenticação com o gateway. Contate o suporte.";
  return "Não foi possível processar o pagamento. Tente novamente.";
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
