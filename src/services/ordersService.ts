import { restGet, restPost, restPostMany, restPatch } from "./supabaseRest";
import { isSupabaseConfigured } from "./supabaseClient";

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
      status:                "pending",
      tracking_code:         null,
      payment_code:          input.payment_code ?? null,
      payment_qr_url:        input.payment_qr_url ?? null,
      vendedor_nome:         input.vendedor_nome ?? null,
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
      status:                "pending",
      payment_code:          input.payment_code  ?? null,
      payment_qr_url:        input.payment_qr_url ?? null,
      vendedor_nome:         input.vendedor_nome  ?? null,
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
  pending:    "bg-yellow-100 text-yellow-700",
  processing: "bg-blue-100 text-blue-700",
  shipped:    "bg-purple-100 text-purple-700",
  delivered:  "bg-green-100 text-green-700",
  cancelled:  "bg-red-100 text-red-600",
};
