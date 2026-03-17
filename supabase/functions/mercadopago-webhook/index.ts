// ============================================================
// Edge Function: mercadopago-webhook
// Recebe notificações do Mercado Pago (IPN + Webhooks)
// e atualiza o status do pedido no Supabase.
//
// Mapeamento de status:
//   approved      → processing
//   refunded      → cancelled
//   charged_back  → cancelled
//   cancelled     → cancelled
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ACCESS_TOKEN = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

// ── Mapeia status MP → status do pedido ──────────────────────
function mapStatus(mpStatus: string): "processing" | "cancelled" | null {
  switch (mpStatus) {
    case "approved":     return "processing";
    case "refunded":
    case "charged_back":
    case "cancelled":    return "cancelled";
    default:             return null;
  }
}

// ── Busca pagamento no MP ─────────────────────────────────────
async function fetchMPPayment(paymentId: string) {
  const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { "Authorization": `Bearer ${ACCESS_TOKEN}` },
  });
  if (!res.ok) throw new Error(`MP fetch error ${res.status}`);
  return await res.json();
}

// ── Supabase REST helper ──────────────────────────────────────
function sb(path: string, init: RequestInit = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      "Content-Type":  "application/json",
      "apikey":        SERVICE_KEY,
      "Authorization": `Bearer ${SERVICE_KEY}`,
      "Prefer":        "return=representation",
      ...((init.headers ?? {}) as Record<string, string>),
    },
  });
}

// ── Busca pedido pelo order_number (external_reference) ───────
async function getOrderByNumber(orderNumber: string) {
  const res = await sb(`orders?order_number=eq.${encodeURIComponent(orderNumber)}&select=id,status`);
  if (!res.ok) return null;
  const rows = await res.json();
  return rows[0] ?? null;
}

// ── Atualiza status do pedido ────────────────────────────────
async function patchOrderStatus(orderId: string, status: string) {
  await sb(`orders?id=eq.${orderId}`, {
    method:  "PATCH",
    headers: { "Prefer": "return=minimal" },
    body:    JSON.stringify({ status, updated_at: new Date().toISOString() }),
  });
}

// ── Restaura estoque ao cancelar pedido ───────────────────────
async function restaurarEstoque(orderId: string) {
  try {
    const itemsRes = await sb(`order_items?order_id=eq.${orderId}&select=product_id,quantity`);
    if (!itemsRes.ok) return;
    const items = await itemsRes.json() as { product_id: string; quantity: number }[];

    for (const item of items) {
      try {
        const prodRes = await sb(`products?id=eq.${item.product_id}&select=stock`);
        if (!prodRes.ok) continue;
        const prods = await prodRes.json() as { stock: number }[];
        if (prods.length === 0) continue;
        const novoEstoque = (Number(prods[0].stock) || 0) + Number(item.quantity);
        await sb(`products?id=eq.${item.product_id}`, {
          method:  "PATCH",
          headers: { "Prefer": "return=minimal" },
          body:    JSON.stringify({ stock: novoEstoque }),
        });
      } catch { /* item individual não bloqueia os demais */ }
    }
  } catch (e) {
    console.error("[webhook] Erro ao restaurar estoque:", e);
  }
}

// ── Handler principal ─────────────────────────────────────────
serve(async (req) => {
  // MP exige HTTP 200 rápido — sempre responder ok
  try {
    let paymentId: string | null = null;

    if (req.method === "GET") {
      // IPN: GET ?id=xxx&topic=payment
      const url   = new URL(req.url);
      const topic = url.searchParams.get("topic") ?? url.searchParams.get("type") ?? "";
      if (!topic.includes("payment")) return new Response("ok", { status: 200 });
      paymentId = url.searchParams.get("id");
    } else if (req.method === "POST") {
      // Webhook: POST { type: "payment", data: { id: "xxx" } }
      const body  = await req.json().catch(() => ({}));
      const topic = (body.type ?? body.topic ?? "") as string;
      if (!topic.includes("payment")) return new Response("ok", { status: 200 });
      paymentId = String(body.data?.id ?? body.id ?? "");
    }

    if (!paymentId || paymentId === "undefined") {
      return new Response("ok", { status: 200 });
    }

    // Busca detalhes do pagamento no MP
    const payment     = await fetchMPPayment(paymentId);
    const orderNumber = payment.external_reference as string;
    const mpStatus    = payment.status as string;

    console.log(`[webhook] payment=${paymentId} status=${mpStatus} order=${orderNumber}`);

    if (!orderNumber) return new Response("ok", { status: 200 });

    const newStatus = mapStatus(mpStatus);
    if (!newStatus) {
      console.log(`[webhook] Status "${mpStatus}" ignorado (sem ação)`);
      return new Response("ok", { status: 200 });
    }

    // Busca pedido no Supabase
    const order = await getOrderByNumber(orderNumber);
    if (!order) {
      console.error(`[webhook] Pedido não encontrado: ${orderNumber}`);
      return new Response("ok", { status: 200 });
    }

    // Não regredir status de pedidos já entregues
    if (order.status === "delivered") {
      console.log(`[webhook] Pedido ${orderNumber} já entregue, ignorado`);
      return new Response("ok", { status: 200 });
    }

    // Não sobrescrever com o mesmo status
    if (order.status === newStatus) {
      console.log(`[webhook] Pedido ${orderNumber} já em "${newStatus}", ignorado`);
      return new Response("ok", { status: 200 });
    }

    // Ao cancelar via MP (chargeback/refund): restaura estoque
    if (newStatus === "cancelled") {
      await restaurarEstoque(order.id);
    }

    await patchOrderStatus(order.id, newStatus);
    console.log(`[webhook] Pedido ${orderNumber} → ${newStatus}`);

    return new Response("ok", { status: 200 });

  } catch (err) {
    // Sempre 200 — o MP para de tentar se receber erro
    console.error("[webhook] Erro:", err);
    return new Response("ok", { status: 200 });
  }
});
