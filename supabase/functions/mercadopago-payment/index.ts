// ============================================================
// Edge Function: mercadopago-payment
// Supabase > Edge Functions > mercadopago-payment
//
// Variável de ambiente necessária (Supabase > Settings > Secrets):
//   MERCADOPAGO_ACCESS_TOKEN → Access token (TEST-... para sandbox)
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ACCESS_TOKEN = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN") ?? "";
const MP_URL       = "https://api.mercadopago.com/v1/payments";
const TIMEOUT_MS   = 25_000;
const IS_SANDBOX   = ACCESS_TOKEN.startsWith("TEST-");

// ── Sandbox test buyer (criado 1x e reutilizado na mesma instância) ──────────
let _sandboxBuyerEmail: string | null = null;
async function getSandboxBuyerEmail(): Promise<string> {
  if (_sandboxBuyerEmail) return _sandboxBuyerEmail;
  try {
    const res = await fetch("https://api.mercadopago.com/v1/users/test_user", {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${ACCESS_TOKEN}`,
      },
      body: JSON.stringify({ site_id: "MLB" }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.email) {
        _sandboxBuyerEmail = data.email as string;
        console.error("[mp] Sandbox buyer email criado:", _sandboxBuyerEmail);
        return _sandboxBuyerEmail;
      }
    } else {
      const txt = await res.text();
      console.error("[mp] Falha ao criar test_user:", res.status, txt.slice(0, 200));
    }
  } catch (e) {
    console.error("[mp] Erro ao criar test_user:", e);
  }
  // fallback: mantém o email real (pode funcionar em produção)
  return "";
}

const cors = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Data helpers ─────────────────────────────────────────────
function isoExpiration(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(23, 59, 59, 0);
  // Brasília = UTC-3
  const offset = "-03:00";
  return d.toISOString().replace("Z", offset);
}

// ── MP fetch ─────────────────────────────────────────────────
async function mpFetch(body: Record<string, unknown>, idempotencyKey: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(MP_URL, {
      method: "POST",
      headers: {
        "Content-Type":    "application/json",
        "Authorization":   `Bearer ${ACCESS_TOKEN}`,
        "X-Idempotency-Key": idempotencyKey,
      },
      body:   JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await res.text();
    try {
      return { ok: res.ok, status: res.status, data: JSON.parse(text) };
    } catch {
      throw new Error(`Mercado Pago retornou resposta inválida: ${text.slice(0, 300)}`);
    }
  } catch (e) {
    if ((e as Error).name === "AbortError")
      throw new Error(`Timeout ao chamar Mercado Pago (>${TIMEOUT_MS / 1000}s)`);
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

// ── Main ─────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    if (!ACCESS_TOKEN) {
      return json({ error: "MERCADOPAGO_ACCESS_TOKEN não configurado no servidor." }, 500);
    }

    const { action, customer, payment } = await req.json();

    const amount     = Math.round(Number(payment.total) * 100) / 100; // 2 casas decimais obrigatório no MP
    const cpfClean   = (customer.cpf   ?? "").replace(/\D/g, "");
    const zipClean   = (customer.cep   ?? "").replace(/\D/g, "");
    const nameParts  = (customer.name  ?? "").trim().split(/\s+/);
    const firstName  = nameParts[0] ?? "Cliente";
    const lastName   = nameParts.slice(1).join(" ") || firstName;

    const idempotencyKey = `${payment.orderNumber}-${action}`;

    // Em sandbox, payer email DEVE ser um usuário de teste do MP
    let payerEmail = customer.email as string;
    if (IS_SANDBOX) {
      const testEmail = await getSandboxBuyerEmail();
      if (testEmail) payerEmail = testEmail;
    }

    const baseBody = {
      transaction_amount: amount,
      description:        `Pedido ${payment.orderNumber}`,
      notification_url:   Deno.env.get("NOTIFICATION_URL")
                          ?? "https://xfudsvqbzzrqqtukasoy.supabase.co/functions/v1/mercadopago-webhook",
      external_reference: payment.orderNumber,
      payer: {
        email:      payerEmail,
        first_name: firstName,
        last_name:  lastName,
        identification: {
          type:   "CPF",
          number: cpfClean,
        },
      },
    };

    // ── PIX ──────────────────────────────────────────────────
    if (action === "create_pix") {
      const { ok, data } = await mpFetch({
        ...baseBody,
        payment_method_id: "pix",
        date_of_expiration: isoExpiration(1),
      }, idempotencyKey);

      if (!ok) {
        const msg = data?.message ?? data?.error ?? "Erro ao criar PIX";
        console.error("[mp] PIX erro:", JSON.stringify(data));
        return json({ error: friendlyError(msg) }, 400);
      }

      const txData = data?.point_of_interaction?.transaction_data;
      const qrCode = txData?.qr_code        ?? "";
      const qrB64  = txData?.qr_code_base64 ?? "";

      return json({
        paymentId:    String(data.id),
        pixCode:      qrCode,
        pixQrCodeUrl: qrB64 ? `data:image/png;base64,${qrB64}` : "",
        status:       data.status ?? "pending",
      });
    }

    // ── BOLETO ───────────────────────────────────────────────
    if (action === "create_boleto") {
      // street_number precisa ser numérico — "S/N" é inválido no MP
      const streetNum = (customer.addressNum ?? "").replace(/\D/g, "") || "0";

      const boletoBody = {
        ...baseBody,
        payment_method_id: "boleto",
        date_of_expiration: isoExpiration(3),
        payer: {
          ...baseBody.payer,
          address: {
            zip_code:      zipClean,
            street_name:   customer.address      || "Rua não informada",
            street_number: streetNum,
            neighborhood:  customer.neighborhood || "Centro",
            city:          customer.city         || "São Paulo",
            federal_unit:  (customer.state       || "SP").toUpperCase().slice(0, 2),
          },
        },
      };

      const { ok, data } = await mpFetch(boletoBody, idempotencyKey);

      if (!ok) {
        const msg = data?.message ?? data?.error ?? "";
        const codes = (data?.cause as { code: number }[] | undefined)?.map(c => c.code) ?? [];
        console.error("[mp] Boleto erro:", JSON.stringify(data));
        // 10102 = boleto não habilitado na conta do vendedor
        if (codes.includes(10102)) {
          return json({ error: "Boleto não disponível. Ative-o nas configurações da sua conta Mercado Pago." }, 400);
        }
        return json({ error: friendlyError(msg) }, 400);
      }

      const dueRaw  = data.date_of_expiration ?? "";
      const dueDate = dueRaw ? dueRaw.slice(0, 10) : "";

      return json({
        paymentId:  String(data.id),
        boletoCode: data.barcode ?? "",
        boletoUrl:  data.transaction_details?.external_resource_url ?? "",
        status:     data.status ?? "pending",
        dueDate,
      });
    }

    // ── CARTÃO DE CRÉDITO ────────────────────────────────────
    if (action === "create_credit") {
      const { cardToken, installments, paymentMethodId } = payment;

      if (!cardToken) {
        return json({ error: "Token do cartão não informado." }, 400);
      }

      const creditBody: Record<string, unknown> = {
        ...baseBody,
        payment_method_id: paymentMethodId ?? "visa",
        token:             cardToken,
        installments:      Number(installments) || 1,
        statement_descriptor: "WHITE.COM",
      };

      let { ok, data } = await mpFetch(creditBody, idempotencyKey);

      // Cartão internacional: MP não aceita parcelamento → retentar sem parcelas (1x)
      const isIntlError = !ok && (data?.cause as { code: number }[] | undefined)
        ?.some(c => c.code === 10114);
      if (isIntlError) {
        console.error("[mp] Cartão internacional detectado, retentando sem parcelamento");
        const bodyNoInstallments = { ...creditBody };
        delete bodyNoInstallments.installments;
        const retried = await mpFetch(bodyNoInstallments, idempotencyKey + "-intl");
        ok   = retried.ok;
        data = retried.data;
      }

      if (!ok) {
        const msg = data?.message ?? data?.error ?? "Erro ao processar cartão";
        console.error("[mp] Cartão erro:", JSON.stringify(data));
        return json({ error: friendlyError(msg) }, 400);
      }

      // Trata resultados: approved / in_process / rejected
      if (data.status === "rejected") {
        const detail = data.status_detail ?? "";
        console.error("[mp] Cartão rejeitado:", detail, JSON.stringify(data));
        return json({ error: rejectionMessage(detail) }, 400);
      }

      return json({
        paymentId: String(data.id),
        status:    data.status ?? "pending",  // approved | in_process | pending
      });
    }

    // ── VERIFICAR STATUS ─────────────────────────────────────
    if (action === "check_status") {
      const { paymentId: checkId } = payment as { paymentId?: string };
      if (!checkId) return json({ error: "ID do pagamento não informado." }, 400);

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      try {
        const res = await fetch(`${MP_URL}/${checkId}`, {
          headers: { "Authorization": `Bearer ${ACCESS_TOKEN}` },
          signal: controller.signal,
        });
        clearTimeout(timer);
        const data = await res.json();
        if (!res.ok) {
          console.error("[mp] check_status erro:", res.status, JSON.stringify(data));
          return json({ error: `Erro MP ${res.status}: ${data?.message ?? data?.error ?? JSON.stringify(data)}` }, 400);
        }
        return json({ mpStatus: data.status as string, mpDetail: data.status_detail as string });
      } catch (e) {
        clearTimeout(timer);
        if ((e as Error).name === "AbortError")
          throw new Error(`Timeout ao chamar Mercado Pago (>${TIMEOUT_MS / 1000}s)`);
        throw e;
      }
    }

    // ── ESTORNO ──────────────────────────────────────────────
    if (action === "refund") {
      const { paymentId: refundPaymentId, amount: refundAmount } = payment as {
        paymentId?: string; amount?: number;
      };
      if (!refundPaymentId) {
        return json({ error: "ID do pagamento não informado." }, 400);
      }

      const refundBody: Record<string, unknown> = {};
      if (refundAmount) {
        refundBody.amount = Math.round(Number(refundAmount) * 100) / 100;
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      try {
        const res = await fetch(`${MP_URL}/${refundPaymentId}/refunds`, {
          method:  "POST",
          headers: {
            "Content-Type":      "application/json",
            "Authorization":     `Bearer ${ACCESS_TOKEN}`,
            "X-Idempotency-Key": `refund-${refundPaymentId}`,
          },
          body:   JSON.stringify(refundBody),
          signal: controller.signal,
        });
        clearTimeout(timer);
        const data = await res.json();
        if (!res.ok) {
          console.error("[mp] Refund erro:", JSON.stringify(data));
          const msg = data?.message ?? data?.error ?? "Erro desconhecido";
          return json({ error: `Não foi possível processar o estorno: ${msg}` }, 400);
        }
        return json({ refundId: String(data.id), status: "refunded" });
      } catch (e) {
        clearTimeout(timer);
        if ((e as Error).name === "AbortError")
          throw new Error(`Timeout ao chamar Mercado Pago (>${TIMEOUT_MS / 1000}s)`);
        throw e;
      }
    }

    return json({ error: "Action inválida. Use: create_pix, create_boleto, create_credit ou refund" }, 400);

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[mercadopago-payment]", msg);
    return json({ error: msg }, 500);
  }
});

// ── Helpers ──────────────────────────────────────────────────
function rejectionMessage(detail: string): string {
  const map: Record<string, string> = {
    cc_rejected_insufficient_amount: "Saldo insuficiente no cartão.",
    cc_rejected_bad_filled_security_code: "Código de segurança (CVV) inválido.",
    cc_rejected_bad_filled_date: "Data de validade inválida.",
    cc_rejected_bad_filled_other: "Dados do cartão inválidos.",
    cc_rejected_blacklist: "Cartão não autorizado.",
    cc_rejected_call_for_authorize: "Cartão requer autorização. Contate sua operadora.",
    cc_rejected_card_disabled: "Cartão desativado. Contate sua operadora.",
    cc_rejected_duplicated_payment: "Pagamento duplicado. Aguarde alguns minutos.",
    cc_rejected_high_risk: "Pagamento recusado por segurança. Tente outro cartão.",
    cc_rejected_max_attempts: "Número máximo de tentativas atingido. Tente mais tarde.",
    cc_rejected_other_reason: "Cartão recusado. Tente outro cartão ou contate sua operadora.",
  };
  return map[detail] ?? "Cartão recusado. Verifique os dados ou tente outro cartão.";
}

function friendlyError(raw: string): string {
  const n = (raw ?? "").toLowerCase();
  if (n.includes("cpf") || n.includes("identification"))
    return "CPF inválido. Confira e tente novamente.";
  if (n.includes("email"))
    return "E-mail inválido. Confira e tente novamente.";
  if (n.includes("amount") || n.includes("valor"))
    return "Valor do pedido inválido.";
  if (n.includes("zip") || n.includes("cep") || n.includes("address"))
    return "Endereço inválido. Confira CEP e endereço.";
  if (n.includes("unauthorized") || n.includes("token") || n.includes("access"))
    return "Erro de autenticação com o gateway. Contate o suporte.";
  return "Não foi possível processar o pagamento. Tente novamente.";
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
