// ============================================================
// Edge Function: paghiper-payment
// Cole este código no painel Supabase > Edge Functions
// Nome da função: paghiper-payment
//
// Variáveis de ambiente necessárias (Supabase > Settings > Secrets):
//   PAGHIPER_API_KEY  → API Key do PagHiper (começa com "apk_...")
//   PAGHIPER_TOKEN    → Token do PagHiper
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const PAGHIPER_API_KEY = Deno.env.get("PAGHIPER_API_KEY") ?? "";
const PAGHIPER_TOKEN   = Deno.env.get("PAGHIPER_TOKEN")   ?? "";
const PIX_URL          = "https://pix.paghiper.com/invoice/create/";
const BOLETO_URL       = "https://api.paghiper.com/transaction/create/";
const TIMEOUT_MS       = 25_000;

const cors = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function paghiperFetch(url: string, body: Record<string, unknown>) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method:  "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body:    JSON.stringify(body),
      signal:  controller.signal,
    });
    const text = await res.text();
    try {
      return { ok: res.ok, status: res.status, data: JSON.parse(text) };
    } catch {
      throw new Error(`PagHiper retornou resposta inválida: ${text.slice(0, 200)}`);
    }
  } catch (e) {
    if ((e as Error).name === "AbortError")
      throw new Error(`Timeout ao chamar PagHiper (>${TIMEOUT_MS / 1000}s)`);
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    if (!PAGHIPER_API_KEY || !PAGHIPER_TOKEN) {
      return json({ error: "PAGHIPER_API_KEY ou PAGHIPER_TOKEN não configurados no servidor." }, 500);
    }

    const { action, customer, payment } = await req.json();

    const cents      = Math.round(Number(payment.total) * 100);
    const zipCode    = (customer.cep    ?? "").replace(/\D/g, "");
    const cpfClean   = (customer.cpf    ?? "").replace(/\D/g, "");
    const phoneClean = (customer.phone  ?? "").replace(/\D/g, "");

    // URL de notificação — substitua por seu webhook real quando disponível
    const NOTIFICATION_URL = Deno.env.get("NOTIFICATION_URL")
      ?? "https://xfudsvqbzzrqqtukasoy.supabase.co/functions/v1/paghiper-webhook";

    const baseBody = {
      apiKey:            PAGHIPER_API_KEY,
      token:             PAGHIPER_TOKEN,
      order_id:          payment.orderNumber,
      payer_email:       customer.email,
      payer_name:        customer.name,
      payer_cpf_cnpj:    cpfClean,
      payer_phone:       phoneClean,
      payer_street:      customer.address,
      payer_number:      customer.addressNum,
      payer_complement:  customer.complement ?? "",
      payer_district:    customer.neighborhood,
      payer_city:        customer.city,
      payer_state:       customer.state,
      payer_zip_code:    zipCode,
      notification_url:  NOTIFICATION_URL,
      items: [{
        description: `Pedido ${payment.orderNumber}`,
        quantity:    1,
        item_id:     "1",
        price_cents: cents,
      }],
    };

    // ── PIX ──────────────────────────────────────────────────────
    if (action === "create_pix") {
      const { ok, data } = await paghiperFetch(PIX_URL, {
        ...baseBody,
        days_due_date: 1,
      });

      const r = data?.pix_create_request;
      if (!ok || !r || r.result !== "success") {
        const msg = r?.response_message ?? data?.message ?? "Erro ao criar PIX no PagHiper";
        console.error("[paghiper] PIX erro raw:", JSON.stringify(data));
        return json({ error: `PagHiper: ${msg}` }, 400);
      }

      return json({
        paymentId:    r.transaction_id,
        pixCode:      r.pix_code?.emv           ?? "",
        pixQrCodeUrl: r.pix_code?.qrcode_base64 ?? r.pix_code?.qrcode_image_url ?? "",
        status:       r.status ?? "pending",
      });
    }

    // ── BOLETO ───────────────────────────────────────────────────
    if (action === "create_boleto") {
      const { ok, data } = await paghiperFetch(BOLETO_URL, {
        ...baseBody,
        type_bank_slip: 1,
        days_due_date: 3,
      });

      console.error("[paghiper] Boleto resposta COMPLETA:", JSON.stringify(data));

      const r = data?.create_request;
      if (!ok || !r || r.result !== "success") {
        // Retorna o objeto inteiro para debug
        return json({ error: `DEBUG: ${JSON.stringify(data)}` }, 400);
      }

      return json({
        paymentId:  r.transaction_id,
        boletoCode: r.bank_slip?.digitable_line ?? r.bank_slip?.bar_code ?? "",
        boletoUrl:  r.bank_slip?.url_slip_pdf   ?? r.bank_slip?.url_slip ?? "",
        status:     r.status   ?? "pending",
        dueDate:    r.due_date ?? "",
      });
    }

    return json({ error: "Action inválida. Use: create_pix ou create_boleto" }, 400);

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[paghiper-payment]", msg);
    return json({ error: msg }, 500);
  }
});

function friendlyError(raw: string): string {
  const n = raw.toLowerCase();
  if (n.includes("cpf") || n.includes("cnpj"))
    return "CPF/CNPJ inválido. Confira e tente novamente.";
  if (n.includes("email"))
    return "E-mail inválido. Confira e tente novamente.";
  if (n.includes("phone") || n.includes("telefone"))
    return "Telefone inválido. Informe com DDD (ex: 71999998888).";
  if (n.includes("amount") || n.includes("valor") || n.includes("price"))
    return "Valor do pedido inválido.";
  if (n.includes("zip") || n.includes("cep"))
    return "CEP inválido. Confira e tente novamente.";
  if (n.includes("unauthorized") || n.includes("api") || n.includes("token"))
    return "Erro de autenticação com o gateway. Contate o suporte.";
  return "Não foi possível processar o pagamento. Tente novamente.";
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
