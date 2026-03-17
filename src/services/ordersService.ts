import { restGet, restPost, restPostMany, restPatch } from "./supabaseRest";
import { isSupabaseConfigured } from "./supabaseClient";
import { decrementarEstoque, restaurarEstoque } from "./estoqueService";

/* ── Tipos ─────────────────────────────────────────────────────── */
export interface OrderItemInput {
  product_id:       string;
  product_name:     string;
  product_image:    string;
  product_brand:    string;
  product_quantity: string;
  unit_price:       number;
  quantity:         number;
  total:            number;
}

export interface OrderInput {
  user_id?: string | null;
  customer_name:        string;
  customer_email:       string;
  customer_cpf:         string;
  customer_phone:       string;
  shipping_cep:         string;
  shipping_address:     string;
  shipping_number:      string;
  shipping_complement?: string;
  shipping_neighborhood?:string;
  shipping_city:        string;
  shipping_state:       string;
  payment_method:       "pix" | "credit" | "boleto";
  payment_installments: number;
  subtotal:             number;
  discount:             number;
  shipping_cost?:       number;
  total:                number;
  payment_code?:        string | null;
  payment_qr_url?:      string | null;
  vendedor_nome?:       string | null;
  cupom_codigo?:        string | null;
  observacoes?:         string | null;
  status?:              Order["status"];
  items:                OrderItemInput[];
}

export interface OrderItem extends OrderItemInput {
  id: string;
  order_id: string;
}

export interface Order {
  id:                    string;
  order_number:          string;
  user_id:               string | null;
  customer_name:         string;
  customer_email:        string;
  customer_cpf:          string;
  customer_phone:        string;
  shipping_cep:          string;
  shipping_address:      string;
  shipping_number:       string;
  shipping_complement:   string | null;
  shipping_neighborhood: string | null;
  shipping_city:         string;
  shipping_state:        string;
  payment_method:        "pix" | "credit" | "boleto";
  payment_installments:  number;
  subtotal:              number;
  discount:              number;
  shipping_cost:         number;
  total:                 number;
  status:                "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  tracking_code:         string | null;
  payment_code:          string | null;
  payment_qr_url:        string | null;
  vendedor_nome:         string | null;
  cupom_codigo:          string | null;
  observacoes:           string | null;
  created_at:            string;
  order_items:           OrderItem[];
}

/* ── createOrder ────────────────────────────────────────────────── */
export async function createOrder(input: OrderInput): Promise<{ order: Order | null; error?: string }> {
  if (!isSupabaseConfigured()) {
    const fakeOrder: Order = {
      id:                    crypto.randomUUID(),
      order_number:          "RB-" + Math.random().toString(36).slice(2, 8).toUpperCase(),
      user_id:               input.user_id ?? null,
      customer_name:         input.customer_name,
      customer_email:        input.customer_email,
      customer_cpf:          input.customer_cpf,
      customer_phone:        input.customer_phone,
      shipping_cep:          input.shipping_cep,
      shipping_address:      input.shipping_address,
      shipping_number:       input.shipping_number,
      shipping_complement:   input.shipping_complement ?? null,
      shipping_neighborhood: input.shipping_neighborhood ?? null,
      shipping_city:         input.shipping_city,
      shipping_state:        input.shipping_state,
      payment_method:        input.payment_method,
      payment_installments:  input.payment_installments,
      subtotal:              input.subtotal,
      discount:              input.discount,
      shipping_cost:         input.shipping_cost ?? 0,
      total:                 input.total,
      status:                input.status ?? "pending",
      tracking_code:         null,
      payment_code:          input.payment_code ?? null,
      payment_qr_url:        input.payment_qr_url ?? null,
      vendedor_nome:         input.vendedor_nome  ?? null,
      cupom_codigo:          input.cupom_codigo   ?? null,
      observacoes:           input.observacoes    ?? null,
      created_at:            new Date().toISOString(),
      order_items:           input.items.map((i) => ({ ...i, id: crypto.randomUUID(), order_id: "" })),
    };
    return { order: fakeOrder };
  }

  try {
    // 1. Insere o pedido via REST
    const orderData = await restPost<Order>("orders", {
      user_id:               input.user_id ?? null,
      customer_name:         input.customer_name,
      customer_email:        input.customer_email,
      customer_cpf:          input.customer_cpf,
      customer_phone:        input.customer_phone,
      shipping_cep:          input.shipping_cep,
      shipping_address:      input.shipping_address,
      shipping_number:       input.shipping_number,
      shipping_complement:   input.shipping_complement ?? null,
      shipping_neighborhood: input.shipping_neighborhood ?? null,
      shipping_city:         input.shipping_city,
      shipping_state:        input.shipping_state,
      payment_method:        input.payment_method,
      payment_installments:  input.payment_installments,
      subtotal:              input.subtotal,
      discount:              input.discount,
      shipping_cost:         input.shipping_cost ?? 0,
      total:                 input.total,
      status:                input.status ?? "pending",
      vendedor_nome:         input.vendedor_nome  ?? null,
      cupom_codigo:          input.cupom_codigo   ?? null,
      // Colunas opcionais — só enviadas se tiverem valor (evita erro 400 se a coluna não existir)
      ...(input.payment_code   ? { payment_code:   input.payment_code   } : {}),
      ...(input.payment_qr_url ? { payment_qr_url: input.payment_qr_url } : {}),
      ...(input.observacoes    ? { observacoes:    input.observacoes    } : {}),
    });

    // 2. Insere os itens em lote
    const itemsToInsert = input.items.map((i) => ({
      order_id:         orderData.id,
      product_id:       i.product_id,
      product_name:     i.product_name,
      product_image:    i.product_image,
      product_brand:    i.product_brand,
      product_quantity: i.product_quantity,
      unit_price:       i.unit_price,
      quantity:         i.quantity,
      total:            i.total,
    }));

    await restPostMany("order_items", itemsToInsert);

    // 3. Desconta estoque de cada produto vendido
    await decrementarEstoque(
      input.items.map(i => ({ product_id: i.product_id, quantity: i.quantity })),
    );

    return {
      order: {
        ...orderData,
        order_items: itemsToInsert as OrderItem[],
      },
    };
  } catch (err) {
    return { order: null, error: err instanceof Error ? err.message : "Erro ao criar pedido" };
  }
}

/* ── fetchUserOrders ────────────────────────────────────────────── */
export async function fetchUserOrders(userId: string): Promise<Order[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    // PostgREST suporta embedded resources: select=*,order_items(*)
    return await restGet<Order>("orders", {
      select:  "*,order_items(*)",
      user_id: `eq.${userId}`,
      order:   "created_at.desc",
    });
  } catch {
    return [];
  }
}

/* ── fetchOrderById ─────────────────────────────────────────────── */
export async function fetchOrderById(orderId: string): Promise<Order | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const rows = await restGet<Order>("orders", {
      select: "*,order_items(*)",
      id:     `eq.${orderId}`,
    });
    return rows.length > 0 ? rows[0] : null;
  } catch {
    return null;
  }
}

/* ── fetchAllOrders (admin) ─────────────────────────────────────── */
export async function fetchAllOrders(): Promise<Order[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    return await restGet<Order>("orders", {
      select: "*,order_items(*)",
      order:  "created_at.desc",
    });
  } catch {
    return [];
  }
}

/* ── updateOrderStatus (admin) ──────────────────────────────────── */
export async function updateOrderStatus(
  orderId: string,
  status: Order["status"],
): Promise<void> {
  // Ao cancelar: restaura estoque + cria saída no fluxo se pedido estava entregue
  if (status === "cancelled") {
    try {
      const items = await restGet<{ product_id: string; quantity: number }>("order_items", {
        select:   "product_id,quantity",
        order_id: `eq.${orderId}`,
      });
      if (items.length > 0) await restaurarEstoque(items);
    } catch { /* não bloqueia */ }

    // Se estava "entregue", a receita já foi lançada — cria saída (estorno contábil)
    try {
      const rows = await restGet<{
        order_number: string;
        total: number;
        payment_method: string;
        status: string;
      }>("orders", {
        select: "order_number,total,payment_method,status",
        id:     `eq.${orderId}`,
      });
      if (rows.length > 0 && rows[0].status === "delivered") {
        const o = rows[0];
        const payMap: Record<string, string> = {
          pix: "PIX", credit: "Cartão de Crédito", boleto: "Boleto",
        };
        await restPost("fluxo_caixa", {
          tipo:            "saida",
          categoria:       "Estorno/Cancelamento",
          descricao:       `Estorno Pedido ${o.order_number}`,
          valor:           Number(o.total),
          data:            new Date().toISOString().slice(0, 10),
          forma_pagamento: payMap[o.payment_method] ?? o.payment_method,
        });
      }
    } catch { /* não bloqueia */ }
  }

  // Ao entregar: cria entrada no fluxo de caixa (com proteção contra entrada duplicada)
  if (status === "delivered") {
    try {
      const rows = await restGet<{
        order_number: string;
        total: number;
        payment_method: string;
        vendedor_nome: string | null;
      }>("orders", {
        select: "order_number,total,payment_method,vendedor_nome",
        id:     `eq.${orderId}`,
      });
      if (rows.length > 0) {
        const o = rows[0];
        // Proteção: não cria entrada duplicada se "Entregue" for marcado mais de uma vez
        const existing = await restGet("fluxo_caixa", {
          select:    "id",
          descricao: `eq.Pedido ${o.order_number}`,
          tipo:      "eq.entrada",
        }).catch(() => [] as unknown[]);
        if (existing.length === 0) {
          const payMap: Record<string, string> = {
            pix: "PIX", credit: "Cartão de Crédito", boleto: "Boleto",
          };
          await restPost("fluxo_caixa", {
            tipo:            "entrada",
            categoria:       o.vendedor_nome ? "Venda PDV" : "Venda Online",
            descricao:       `Pedido ${o.order_number}`,
            valor:           Number(o.total),
            data:            new Date().toISOString().slice(0, 10),
            forma_pagamento: payMap[o.payment_method] ?? o.payment_method,
          });
        }
      }
    } catch { /* não bloqueia */ }
  }

  await restPatch("orders", { column: "id", value: orderId }, {
    status,
    updated_at: new Date().toISOString(),
  });
}

/* ── updateOrderTracking (admin) ────────────────────────────────── */
export async function updateOrderTracking(
  orderId: string,
  trackingCode: string,
): Promise<void> {
  await restPatch("orders", { column: "id", value: orderId }, {
    tracking_code: trackingCode.trim() || null,
    updated_at:    new Date().toISOString(),
  });
}

/* ── Helpers ─────────────────────────────────────────────────────── */
export const STATUS_LABEL: Record<Order["status"], string> = {
  pending:    "Aguardando pagamento",
  processing: "Em processamento",
  shipped:    "Enviado",
  delivered:  "Entregue",
  cancelled:  "Cancelado",
};

export const STATUS_COLOR: Record<Order["status"], string> = {
  pending:    "bg-secondary text-muted-foreground",
  processing: "bg-secondary text-foreground",
  shipped:    "bg-foreground/10 text-foreground",
  delivered:  "bg-foreground text-background",
  cancelled:  "bg-secondary text-muted-foreground",
};
