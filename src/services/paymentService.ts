import { supabase } from "./supabaseClient";

export interface PaymentCustomer {
  name:         string;
  cpf:          string;
  email:        string;
  phone:        string;
  cep:          string;
  address:      string;
  addressNum:   string;
  complement:   string;
  neighborhood: string;
  city:         string;
  state:        string;
}

export interface PaymentInfo {
  method:          "pix" | "boleto" | "credit";
  total:           number;
  orderNumber:     string;
  // Cartão de crédito
  cardToken?:        string;
  installments?:     number;
  paymentMethodId?:  string;
}

export interface PaymentResult {
  paymentId?:    string;
  status?:       string;
  // PIX
  pixCode?:      string;
  pixQrCodeUrl?: string;
  // Boleto
  boletoCode?:   string;   // linha digitável
  boletoUrl?:    string;   // URL do PDF
  dueDate?:      string;
  // Erro
  error?:        string;
}

/* ─────────────────────────────────────────────────────────────
   MODO SIMULADO  (VITE_MOCK_PAYMENTS=true)
───────────────────────────────────────────────────────────── */
const USE_MOCK = import.meta.env.VITE_MOCK_PAYMENTS === "true";

async function mockPayment(payment: PaymentInfo): Promise<PaymentResult> {
  await new Promise((r) => setTimeout(r, 900));
  const id = "mock_" + Math.random().toString(36).slice(2, 10);

  if (payment.method === "boleto") {
    return {
      paymentId:  id,
      status:     "pending",
      boletoCode: "34191.09008 63521.560040 21565.600019 7 94260000020891",
      boletoUrl:  "https://boleto.paghiper.com/checkout/boleto/" + id,
      dueDate:    new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
    };
  }

  return {
    paymentId:   id,
    status:      "pending",
    pixCode:     "00020101021226890014br.gov.bcb.pix0136" + id +
                 "5204000053039865802BR5909WHITE.COM6009SAOPAULO62070503***6304ABCD",
  };
}

/* ─────────────────────────────────────────────────────────────
   createPayment — chama Edge Function mercadopago-payment
───────────────────────────────────────────────────────────── */
const FUNCTION_URL =
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mercadopago-payment`;
const ANON_KEY   = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const TIMEOUT_MS = 30_000;

/* ─────────────────────────────────────────────────────────────
   refundPayment — estorna um pagamento no Mercado Pago
───────────────────────────────────────────────────────────── */
/* ─────────────────────────────────────────────────────────────
   checkPaymentStatus — consulta status atual no Mercado Pago
───────────────────────────────────────────────────────────── */
export async function checkPaymentStatus(
  paymentId: string,
): Promise<{ mpStatus?: string; error?: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(FUNCTION_URL, {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${ANON_KEY}`,
        "apikey":        ANON_KEY,
      },
      body:   JSON.stringify({ action: "check_status", customer: {}, payment: { paymentId } }),
      signal: controller.signal,
    });
    const data = await res.json() as { mpStatus?: string; error?: string };
    if (!res.ok || data.error) return { error: data.error ?? `Erro HTTP ${res.status}` };
    return { mpStatus: data.mpStatus };
  } catch (err) {
    if ((err as Error).name === "AbortError")
      return { error: "Servidor de pagamentos não respondeu. Tente novamente." };
    return { error: err instanceof Error ? err.message : "Erro inesperado." };
  } finally {
    clearTimeout(timer);
  }
}

export async function refundPayment(
  paymentId: string,
  amount?: number,          // omitir para estorno total
): Promise<{ refundId?: string; error?: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(FUNCTION_URL, {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${ANON_KEY}`,
        "apikey":        ANON_KEY,
      },
      body:   JSON.stringify({
        action:   "refund",
        customer: {},
        payment:  { paymentId, amount },
      }),
      signal: controller.signal,
    });
    const data = await res.json() as { refundId?: string; error?: string };
    if (!res.ok || data.error) return { error: data.error ?? `Erro HTTP ${res.status}` };
    return { refundId: data.refundId };
  } catch (err) {
    if ((err as Error).name === "AbortError")
      return { error: "Servidor de pagamentos não respondeu. Tente novamente." };
    return { error: err instanceof Error ? err.message : "Erro inesperado." };
  } finally {
    clearTimeout(timer);
  }
}

export async function createPayment(
  customer: PaymentCustomer,
  payment:  PaymentInfo,
): Promise<PaymentResult> {
  if (USE_MOCK) {
    console.info("[paymentService] MODO SIMULADO");
    return mockPayment(payment);
  }

  const action =
    payment.method === "pix"    ? "create_pix"    :
    payment.method === "boleto" ? "create_boleto" :
                                  "create_credit";

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    console.info(`[paymentService] Criando ${payment.method.toUpperCase()} via Mercado Pago...`);

    const res = await fetch(FUNCTION_URL, {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${ANON_KEY}`,
        "apikey":        ANON_KEY,
      },
      body:   JSON.stringify({ action, customer, payment }),
      signal: controller.signal,
    });

    const data = await res.json() as PaymentResult & { error?: string };

    if (!res.ok || data.error) {
      const errMsg = data.error ?? `Erro HTTP ${res.status}`;
      console.error("[paymentService] Erro Mercado Pago:", errMsg);
      return { error: errMsg };
    }

    console.info(`[paymentService] ${payment.method.toUpperCase()} criado com Mercado Pago:`, data.paymentId);
    return data;

  } catch (err) {
    if ((err as Error).name === "AbortError") {
      return { error: "Servidor de pagamentos não respondeu. Tente novamente." };
    }
    const msg = err instanceof Error ? err.message : "Erro inesperado.";
    console.error("[paymentService] Exceção:", err);
    return { error: msg };
  } finally {
    clearTimeout(timer);
  }
}
