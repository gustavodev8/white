import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ChevronRight, User, MapPin, CheckCircle2, Smartphone,
  FileText, Lock, ChevronDown, Loader2, Copy, Check, AlertCircle,
  ShoppingBag, ArrowRight,
} from "lucide-react";
import { useCart, cartTotal, cartCount } from "@/hooks/useCart";
import { useAuth }                       from "@/hooks/useAuth";
import { createOrder }                   from "@/services/ordersService";
import { createPayment }                 from "@/services/paymentService";
import { calculateShipping, shippingLabel, FREE_SHIPPING_THRESHOLD } from "@/services/shippingService";
import Header                            from "@/components/Header";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type PaymentMethod = "pix" | "boleto";
type Step = "form" | "pix" | "boleto" | "success";

/* ── Masks ─────────────────────────────────────────────────────── */
const maskCPF    = (v: string) => v.replace(/\D/g,"").slice(0,11).replace(/(\d{3})(\d)/,"$1.$2").replace(/(\d{3})(\d)/,"$1.$2").replace(/(\d{3})(\d{1,2})$/,"$1-$2");
const maskPhone  = (v: string) => v.replace(/\D/g,"").slice(0,11).replace(/(\d{2})(\d)/,"($1) $2").replace(/(\d{5})(\d)/,"$1-$2");
const maskCEP    = (v: string) => v.replace(/\D/g,"").slice(0,8).replace(/(\d{5})(\d)/,"$1-$2");

/* ── Small UI helpers ───────────────────────────────────────────── */
function Field({ label, required = false, error, children }: {
  label: string; required?: boolean; error?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-500 block mb-1">
        {label}{required && <span className="text-[#e8001c] ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
const inputCls = "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:border-[#e8001c] focus:ring-1 focus:ring-[#e8001c]/20 transition-colors";
const selectCls = inputCls + " appearance-none bg-white pr-10";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button
      onClick={copy}
      className={`flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
        copied ? "bg-green-100 text-green-700" : "bg-gray-100 hover:bg-gray-200 text-gray-600"
      }`}
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copiado!" : "Copiar"}
    </button>
  );
}

/* ── PIX Timer ──────────────────────────────────────────────────── */
function PixTimer({ seconds }: { seconds: number }) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return <span className={`font-bold tabular-nums ${seconds < 60 ? "text-red-600" : "text-gray-800"}`}>{m}:{s}</span>;
}

/* ── Fake barcode SVG ───────────────────────────────────────────── */
function BoletoBarcode() {
  const pattern = "1110100110101001110011101010110010101001110010110011010101101001011010";
  return (
    <svg viewBox={`0 0 ${pattern.length * 2} 60`} className="w-full max-w-xs h-16" preserveAspectRatio="none">
      {pattern.split("").map((b, i) => (
        <rect key={i} x={i * 2} y={0} width={b === "1" ? 2 : 1} height={60}
          fill={b === "1" ? "#000" : "#fff"} />
      ))}
    </svg>
  );
}

/* ── Tela: PIX aguardando ───────────────────────────────────────── */
function PixScreen({
  orderNumber, total, pixCode, pixQrCodeUrl, onSuccess,
}: {
  orderNumber: string; total: number; pixCode: string;
  pixQrCodeUrl?: string; onSuccess: () => void;
}) {
  const [timer, setTimer] = useState(900);

  useEffect(() => {
    const iv = setInterval(() => setTimer((t) => Math.max(0, t - 1)), 1000);
    return () => clearInterval(iv);
  }, []);

  const qrSrc = pixQrCodeUrl
    || `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(pixCode)}&bgcolor=ffffff&margin=10`;

  const steps = [
    "Abra o app do seu banco ou carteira digital",
    'Acesse a área de pagamentos e escolha "PIX"',
    "Escaneie o QR Code ou use o código copia e cola",
    "Confirme o valor e finalize o pagamento",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50">
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-md">

        {/* Card principal */}
        <div className="bg-white rounded-3xl shadow-lg overflow-hidden">

          {/* Header verde */}
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 px-6 pt-8 pb-10 text-white text-center relative">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Smartphone className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-2xl font-extrabold">Pagar com PIX</h1>
            <p className="text-green-100 text-sm mt-1">Pedido #{orderNumber}</p>
            {/* Valor em destaque */}
            <div className="mt-4 inline-flex items-baseline gap-1">
              <span className="text-green-200 text-sm font-medium">R$</span>
              <span className="text-4xl font-extrabold tabular-nums">
                {(total).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            {/* Onda decorativa */}
            <div className="absolute -bottom-px left-0 right-0 h-6 bg-white" style={{clipPath:"ellipse(55% 100% at 50% 100%)"}} />
          </div>

          <div className="px-6 pb-8 pt-4 flex flex-col items-center gap-5">

            {/* Timer */}
            <div className={`flex items-center gap-2 text-sm px-4 py-2 rounded-full font-semibold
              ${timer < 120 ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700"}`}>
              <span>⏱ Código válido por</span>
              <PixTimer seconds={timer} />
            </div>

            {/* QR Code */}
            <div className="relative">
              <div className="bg-white rounded-2xl p-4 shadow-md border border-gray-100">
                <img
                  src={qrSrc}
                  alt="QR Code PIX"
                  className="w-52 h-52 rounded-xl"
                  onError={(e) => { (e.target as HTMLImageElement).src =
                    `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(pixCode || "RBFARMA")}&bgcolor=ffffff&margin=10`; }}
                />
              </div>
              {/* Badge scan */}
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-green-500 text-white text-[11px] font-bold px-3 py-1 rounded-full shadow whitespace-nowrap">
                ESCANEIE AQUI
              </div>
            </div>

            {/* Separador */}
            <div className="flex items-center gap-3 w-full mt-1">
              <div className="flex-1 h-px bg-gray-100" />
              <span className="text-xs text-gray-400 font-medium">ou use o código abaixo</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>

            {/* Copia e cola */}
            <div className="w-full">
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-2xl p-3.5">
                <p className="flex-1 text-[11px] text-gray-500 font-mono break-all leading-relaxed select-all">
                  {pixCode}
                </p>
                <CopyButton text={pixCode} />
              </div>
            </div>

            {/* Instruções */}
            <div className="w-full bg-green-50 rounded-2xl p-4">
              <p className="text-xs font-bold text-green-800 mb-3">Como pagar:</p>
              <ol className="space-y-2.5">
                {steps.map((s, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-green-500 text-white text-[10px] font-extrabold
                      flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span className="text-xs text-green-800 leading-relaxed">{s}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Aguardando */}
            <div className="flex items-center gap-2.5 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200
              rounded-2xl px-5 py-3.5 w-full justify-center font-medium">
              <Loader2 className="h-4 w-4 animate-spin shrink-0" />
              Aguardando confirmação de pagamento...
            </div>

            {/* Link confirmar manualmente */}
            <button
              onClick={onSuccess}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors underline underline-offset-2"
            >
              Já paguei, ver confirmação do pedido
            </button>

          </div>
        </div>

        {/* Segurança */}
        <p className="text-center text-xs text-gray-400 mt-4 flex items-center justify-center gap-1.5">
          <Lock className="h-3 w-3" /> Pagamento 100% seguro via Banco Central do Brasil
        </p>

      </div>
    </div>
  );
}

/* ── Tela: Boleto ────────────────────────────────────────────────── */
function BoletoScreen({
  orderNumber, total, boletoCode, onSuccess,
}: { orderNumber: string; total: number; boletoCode: string; onSuccess: () => void }) {
  const dueDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  const dueFmt  = dueDate.toLocaleDateString("pt-BR");

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-md">

        <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
          {/* Header laranja */}
          <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-6 pt-8 pb-10 text-white text-center relative">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <FileText className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-2xl font-extrabold">Boleto gerado!</h1>
            <p className="text-orange-100 text-sm mt-1">Pedido #{orderNumber}</p>
            <div className="mt-4 inline-flex items-baseline gap-1">
              <span className="text-orange-200 text-sm font-medium">R$</span>
              <span className="text-4xl font-extrabold tabular-nums">
                {(total).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="absolute -bottom-px left-0 right-0 h-6 bg-white" style={{clipPath:"ellipse(55% 100% at 50% 100%)"}} />
          </div>

          <div className="px-6 pb-8 pt-4 flex flex-col items-center gap-5">

            {/* Aviso vencimento */}
            <div className="w-full bg-orange-50 border border-orange-200 rounded-2xl px-4 py-3.5 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-orange-500 mt-0.5 shrink-0" />
              <p className="text-sm text-orange-800 leading-relaxed">
                Pague até <strong>{dueFmt}</strong> para não cancelar o pedido.
                Após essa data o boleto vence automaticamente.
              </p>
            </div>

            {/* Código de barras */}
            <div className="w-full flex flex-col items-center gap-3 bg-gray-50 rounded-2xl py-5 px-4 border border-gray-100">
              <BoletoBarcode />
            </div>

            {/* Linha digitável */}
            <div className="w-full">
              <p className="text-xs font-bold text-gray-600 mb-2">Linha digitável:</p>
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-2xl p-3.5">
                <p className="flex-1 text-[11px] text-gray-500 font-mono break-all leading-relaxed select-all">
                  {boletoCode}
                </p>
                <CopyButton text={boletoCode} />
              </div>
            </div>

            {/* Instruções */}
            <div className="w-full bg-orange-50 rounded-2xl p-4">
              <p className="text-xs font-bold text-orange-800 mb-3">Onde pagar:</p>
              <ul className="space-y-2.5">
                {[
                  "Qualquer banco, lotérica ou internet banking",
                  "Aguarde 1–3 dias úteis para compensação",
                  "Pedido processado após confirmação do pagamento",
                ].map((s, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
                    <span className="text-xs text-orange-800 leading-relaxed">{s}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={onSuccess}
              className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600
                text-white font-bold py-3.5 rounded-full transition-all text-sm
                flex items-center justify-center gap-2 shadow-md shadow-orange-200"
            >
              <CheckCircle2 className="h-4 w-4" />
              Entendi, acompanhar meu pedido
            </button>

          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4 flex items-center justify-center gap-1.5">
          <Lock className="h-3 w-3" /> Boleto gerado com segurança via PagHiper
        </p>

      </div>
    </div>
  );
}

/* ── Tela: Sucesso ──────────────────────────────────────────────── */
function SuccessScreen({ orderNumber, paymentMethod }: {
  orderNumber: string; paymentMethod: PaymentMethod;
}) {
  const navigate = useNavigate();
  const msgs: Record<PaymentMethod, string> = {
    pix:    "Assim que o pagamento for confirmado, seu pedido será preparado.",
    boleto: "Após a compensação do boleto (1-3 dias úteis), seu pedido será processado.",
  };
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="container mx-auto px-4 py-16 max-w-md">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 flex flex-col items-center gap-5 text-center">
          <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-green-500" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-800">Pedido realizado!</h1>
            <p className="text-sm text-gray-500 mt-1">
              Número do pedido: <span className="font-bold text-gray-700">{orderNumber}</span>
            </p>
          </div>
          <p className="text-sm text-gray-500 leading-relaxed">{msgs[paymentMethod]}</p>
          <p className="text-sm text-gray-400">
            Um e-mail de confirmação foi enviado com os detalhes do pedido.
          </p>
          <div className="h-px bg-gray-100 w-full" />
          <div className="flex flex-col gap-2 w-full">
            <button
              onClick={() => navigate("/minha-conta")}
              className="w-full border border-[#e8001c] text-[#e8001c] hover:bg-red-50 font-bold py-3 rounded-full transition-colors text-sm flex items-center justify-center gap-2"
            >
              <ShoppingBag className="h-4 w-4" /> Ver meus pedidos
            </button>
            <button
              onClick={() => navigate("/")}
              className="w-full bg-[#e8001c] hover:bg-[#c4001a] text-white font-bold py-3 rounded-full transition-colors text-sm flex items-center justify-center gap-2"
            >
              Continuar comprando <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   CHECKOUT PAGE PRINCIPAL
══════════════════════════════════════════════════════════════ */
export default function CheckoutPage() {
  const { items, clearCart }          = useCart();
  const { user, profile } = useAuth();
  const total                         = cartTotal(items);
  const count                         = cartCount(items);
  const navigate                      = useNavigate();

  const [step,         setStep]       = useState<Step>("form");
  const [payment,      setPayment]    = useState<PaymentMethod>("pix");
  const [orderNum,     setOrderNum]   = useState("");
  const [orderId,      setOrderId]    = useState("");
  const [pixCode,      setPixCode]    = useState("");
  const [pixQrCodeUrl, setPixQrCodeUrl] = useState("");
  const [boletoCode,   setBoletoCode] = useState("");
  const [paidTotal,    setPaidTotal]  = useState(0);   // captura antes do clearCart
  const [submitting,   setSubmitting] = useState(false);
  const [loadingCep,   setLoadingCep] = useState(false);
  const [errors,       setErrors]     = useState<Record<string, string>>({});

  // Snapshot do carrinho no momento da montagem (só para o guard de redirect)
  const initialCartSize = useRef(items.length);

  // Form fields — pré-preenchidos do perfil se logado
  const [name,         setName]         = useState(profile?.name || "");
  const [email,        setEmail]        = useState(user?.email || "");
  const [cpf,          setCpf]          = useState(profile?.cpf || "");
  const [phone,        setPhone]        = useState(profile?.phone || "");
  const [cep,          setCep]          = useState("");
  const [address,      setAddress]      = useState("");
  const [addressNum,   setAddressNum]   = useState("");
  const [complement,   setComplement]   = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city,         setCity]         = useState("");
  const [uf,           setUf]           = useState("");

  // Scroll ao topo na montagem
  useEffect(() => { window.scrollTo(0, 0); }, []);

  // Pré-preenche quando perfil carrega
  useEffect(() => {
    if (profile?.name  && !name)  setName(profile.name);
    if (user?.email    && !email) setEmail(user.email);
    if (profile?.cpf   && !cpf)   setCpf(profile.cpf);
    if (profile?.phone && !phone) setPhone(profile.phone);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, user]);

  // Redireciona apenas se o carrinho JÁ ESTAVA vazio quando a página abriu.
  // Usar deps=[] garante que roda UMA única vez — nunca dispara ao limpar
  // o carrinho depois do submit (clearCart()), eliminando a race condition.
  useEffect(() => {
    if (initialCartSize.current === 0) {
      navigate("/carrinho");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const pixDiscount  = payment === "pix" ? total * 0.05 : 0;
  const shippingCost = calculateShipping(uf, total);
  const finalTotal   = total - pixDiscount + shippingCost;

  // ── Busca CEP ───────────────────────────────────────────────────
  async function handleCepSearch() {
    const raw = cep.replace(/\D/g, "");
    if (raw.length !== 8) return;
    setLoadingCep(true);
    try {
      const res  = await fetch(`https://viacep.com.br/ws/${raw}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setAddress(data.logradouro   || "");
        setNeighborhood(data.bairro  || "");
        setCity(data.localidade      || "");
        setUf(data.uf                || "");
      }
    } catch { /* silently ignore */ }
    finally { setLoadingCep(false); }
  }

  // ── Validação ────────────────────────────────────────────────────
  function validate() {
    const e: Record<string, string> = {};
    if (!name.trim())         e.name       = "Obrigatório";
    if (!email.trim())        e.email      = "Obrigatório";
    if (!cpf.trim())          e.cpf        = "Obrigatório";
    if (!phone.trim())        e.phone      = "Obrigatório";
    if (!cep.trim())          e.cep        = "Obrigatório";
    if (!address.trim())      e.address    = "Obrigatório";
    if (!addressNum.trim())   e.addressNum = "Obrigatório";
    if (!city.trim())         e.city       = "Obrigatório";
    if (!uf.trim())           e.uf         = "Obrigatório";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  // ── Submit ───────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!validate()) {
      const el = document.querySelector("[data-err]");
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setSubmitting(true);
    setErrors({});

    try {
      const generatedOrderNum = "RB-" + Math.random().toString(36).slice(2, 8).toUpperCase();
      setOrderNum(generatedOrderNum);

      // ── 1. Chama PagHiper via Edge Function ──────────────────────
      const payResult = await createPayment(
        { name, cpf, email, phone, cep, address, addressNum, complement, neighborhood, city, state: uf },
        { method: payment, total: finalTotal, orderNumber: generatedOrderNum },
      );

      if (payResult.error) {
        setErrors({ submit: payResult.error });
        return;
      }

      // Salva dados do pagamento
      if (payResult.pixCode)      setPixCode(payResult.pixCode);
      if (payResult.pixQrCodeUrl) setPixQrCodeUrl(payResult.pixQrCodeUrl);
      if (payResult.boletoCode)   setBoletoCode(payResult.boletoCode);

      // ── 2. Salva pedido no Supabase (com timeout — não bloqueia o checkout) ───
      try {
        const orderPromise = createOrder({
          user_id:               user?.id ?? null,
          customer_name:         name,
          customer_email:        email,
          customer_cpf:          cpf,
          customer_phone:        phone,
          shipping_cep:          cep,
          shipping_address:      address,
          shipping_number:       addressNum,
          shipping_complement:   complement,
          shipping_neighborhood: neighborhood,
          shipping_city:         city,
          shipping_state:        uf,
          payment_method:        payment,
          payment_installments:  1,
          subtotal:              total,
          discount:              pixDiscount,
          shipping_cost:         shippingCost,
          total:                 finalTotal,
          payment_code:          payResult.pixCode || payResult.boletoCode || null,
          payment_qr_url:        payResult.pixQrCodeUrl || null,
          items: items.map((i) => ({
            product_id:       i.id,
            product_name:     i.name,
            product_image:    i.image,
            product_brand:    i.brand,
            product_quantity: i.quantity,
            unit_price:       i.price,
            quantity:         i.cartQuantity,
            total:            i.price * i.cartQuantity,
          })),
        });
        const timeoutPromise = new Promise<{ order: null }>((resolve) =>
          setTimeout(() => resolve({ order: null }), 8000)
        );
        const { order } = await Promise.race([orderPromise, timeoutPromise]);
        if (order?.order_number) setOrderNum(order.order_number);
        if (order?.id)           setOrderId(order.id);
      } catch (orderErr) {
        console.warn("[handleSubmit] Erro ao salvar pedido (não crítico):", orderErr);
        // Não bloqueia o fluxo — o pagamento já foi criado com sucesso
      }

      // ── 3. Avança para a tela de pagamento ────────────────────────
      setPaidTotal(finalTotal);   // captura ANTES do clearCart
      const nextStep: Step = payment === "pix" ? "pix" : "boleto";
      setStep(nextStep);
      clearCart();

    } catch (err) {
      // Garante que qualquer erro inesperado (rede, timeout, etc.)
      // seja exibido ao usuário em vez de travar o botão
      const msg = err instanceof Error ? err.message : "Erro inesperado. Tente novamente.";
      console.error("[handleSubmit] erro:", err);
      setErrors({ submit: msg });
    } finally {
      // SEMPRE desativa o loading — independente de sucesso ou erro
      setSubmitting(false);
    }
  }

  // ── Render das telas de pagamento ────────────────────────────────
  if (step === "pix")     return <PixScreen    orderNumber={orderNum} total={paidTotal} pixCode={pixCode} pixQrCodeUrl={pixQrCodeUrl} onSuccess={() => setStep("success")} />;
  if (step === "boleto")  return <BoletoScreen orderNumber={orderNum} total={paidTotal} boletoCode={boletoCode} onSuccess={() => setStep("success")} />;
  if (step === "success") return <SuccessScreen orderNumber={orderNum} paymentMethod={payment} />;

  // ── Render do formulário ─────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm text-gray-400 mb-6">
          <Link to="/"         className="hover:text-[#e8001c] transition-colors">Página inicial</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link to="/carrinho" className="hover:text-[#e8001c] transition-colors">Cesta de compras</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-gray-700 font-medium">Finalização de compra</span>
        </nav>

        <h1 className="text-2xl font-bold text-gray-800 mb-2">Finalização de compra</h1>

        {/* Banner de login para guest */}
        {!user && (
          <div className="mb-5 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center gap-3">
            <User className="h-5 w-5 text-blue-500 shrink-0" />
            <p className="text-sm text-blue-700 flex-1">
              Já tem conta?{" "}
              <button
                onClick={() => navigate("/entrar", { state: { from: "/checkout" } })}
                className="font-bold hover:underline"
              >
                Entre agora
              </button>{" "}
              para agilizar seu pedido com seus dados salvos.
            </p>
          </div>
        )}

        {/* Steps */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
          {[{n:1,l:"Identificação"},{n:2,l:"Entrega"},{n:3,l:"Pagamento"},{n:4,l:"Revisão"}].map((s,i) => (
            <div key={s.n} className="flex items-center gap-2 shrink-0">
              <div className={`flex items-center gap-1.5 ${i===0?"text-[#e8001c]":i<3?"text-gray-400":"text-gray-300"}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2
                  ${i===0?"border-[#e8001c] bg-[#e8001c] text-white":i<3?"border-gray-300 text-gray-400":"border-gray-200 text-gray-300"}`}>
                  {s.n}
                </div>
                <span className="text-xs font-medium whitespace-nowrap">{s.l}</span>
              </div>
              {i<3 && <ChevronRight className="h-3.5 w-3.5 text-gray-200 shrink-0" />}
            </div>
          ))}
        </div>

        <div className="flex flex-col lg:flex-row gap-6 items-start">

          {/* ── Formulário ─────────────────────────────────────────── */}
          <div className="flex-1 min-w-0 space-y-4">

            {/* 1. Identificação */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100">
                <User className="h-4 w-4 text-[#e8001c]" />
                <h2 className="text-sm font-bold text-gray-800">Identificação</h2>
                {user && <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Logado</span>}
              </div>
              <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2" data-err={errors.name?"1":undefined}>
                  <Field label="Nome completo" required error={errors.name}>
                    <input value={name} onChange={e=>setName(e.target.value)} placeholder="Seu nome completo" className={inputCls} />
                  </Field>
                </div>
                <div data-err={errors.email?"1":undefined}>
                  <Field label="E-mail" required error={errors.email}>
                    <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="seu@email.com" className={inputCls} disabled={!!user} />
                  </Field>
                </div>
                <div data-err={errors.cpf?"1":undefined}>
                  <Field label="CPF" required error={errors.cpf}>
                    <input value={cpf} onChange={e=>setCpf(maskCPF(e.target.value))} placeholder="000.000.000-00" className={inputCls} />
                  </Field>
                </div>
                <div data-err={errors.phone?"1":undefined}>
                  <Field label="Telefone / WhatsApp" required error={errors.phone}>
                    <input value={phone} onChange={e=>setPhone(maskPhone(e.target.value))} placeholder="(00) 00000-0000" className={inputCls} />
                  </Field>
                </div>
              </div>
            </div>

            {/* 2. Endereço */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100">
                <MapPin className="h-4 w-4 text-[#e8001c]" />
                <h2 className="text-sm font-bold text-gray-800">Endereço de entrega</h2>
              </div>
              <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* CEP */}
                <div className="sm:col-span-2" data-err={errors.cep?"1":undefined}>
                  <Field label="CEP" required error={errors.cep}>
                    <div className="flex gap-2">
                      <input value={cep} onChange={e=>setCep(maskCEP(e.target.value))} placeholder="00000-000" maxLength={9} className={inputCls} />
                      <button onClick={handleCepSearch} disabled={loadingCep}
                        className="px-4 py-2.5 bg-[#e8001c] hover:bg-[#c4001a] text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60 shrink-0 flex items-center gap-1.5">
                        {loadingCep ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buscar"}
                      </button>
                    </div>
                  </Field>
                </div>
                <div className="sm:col-span-2" data-err={errors.address?"1":undefined}>
                  <Field label="Logradouro" required error={errors.address}>
                    <input value={address} onChange={e=>setAddress(e.target.value)} placeholder="Rua, Avenida..." className={inputCls} />
                  </Field>
                </div>
                <div data-err={errors.addressNum?"1":undefined}>
                  <Field label="Número" required error={errors.addressNum}>
                    <input value={addressNum} onChange={e=>setAddressNum(e.target.value)} placeholder="123" className={inputCls} />
                  </Field>
                </div>
                <div>
                  <Field label="Complemento">
                    <input value={complement} onChange={e=>setComplement(e.target.value)} placeholder="Apto, bloco... (opcional)" className={inputCls} />
                  </Field>
                </div>
                <div>
                  <Field label="Bairro">
                    <input value={neighborhood} onChange={e=>setNeighborhood(e.target.value)} placeholder="Bairro" className={inputCls} />
                  </Field>
                </div>
                <div data-err={errors.city?"1":undefined}>
                  <Field label="Cidade" required error={errors.city}>
                    <input value={city} onChange={e=>setCity(e.target.value)} placeholder="Cidade" className={inputCls} />
                  </Field>
                </div>
                <div data-err={errors.uf?"1":undefined}>
                  <Field label="Estado" required error={errors.uf}>
                    <div className="relative">
                      <select value={uf} onChange={e=>setUf(e.target.value)} className={selectCls}>
                        <option value="">Selecione</option>
                        {["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
                          "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"].map(s=>(
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    </div>
                  </Field>
                </div>
              </div>
            </div>

            {/* 3. Pagamento */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100">
                <Lock className="h-4 w-4 text-[#e8001c]" />
                <h2 className="text-sm font-bold text-gray-800">Forma de pagamento</h2>
              </div>
              <div className="px-6 py-5 space-y-3">

                {/* PIX */}
                {(["pix","boleto"] as PaymentMethod[]).map((method) => {
                  const cfg = {
                    pix:    { icon: Smartphone, color: "text-green-500",  label: "PIX",             sub: "Pagamento instantâneo",       badge: "5% OFF", badgeCls: "bg-green-100 text-green-700" },
                    boleto: { icon: FileText,   color: "text-orange-500", label: "Boleto bancário",  sub: "Vencimento em 1 dia útil",    badge: null,     badgeCls: "" },
                  }[method];
                  const Icon = cfg.icon;
                  return (
                    <div key={method}>
                      <label className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-colors
                        ${payment===method ? "border-[#e8001c] bg-red-50/40" : "border-gray-200 hover:border-gray-300"}`}>
                        <input type="radio" name="pay" value={method} checked={payment===method}
                          onChange={()=>setPayment(method)} className="accent-[#e8001c] w-4 h-4 shrink-0" />
                        <Icon className={`h-5 w-5 ${cfg.color} shrink-0`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800">{cfg.label}</p>
                          <p className="text-xs text-gray-500">{cfg.sub}</p>
                        </div>
                        {cfg.badge && <span className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 whitespace-nowrap ${cfg.badgeCls}`}>{cfg.badge}</span>}
                      </label>

                      {method==="pix" && payment==="pix" && (
                        <div className="ml-4 mt-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                          <p className="text-xs text-green-700">
                            Você economizará <strong>{fmt(pixDiscount)}</strong> pagando com PIX.
                            O QR Code será exibido após confirmar o pedido.
                          </p>
                        </div>
                      )}

                      {method==="boleto" && payment==="boleto" && (
                        <div className="ml-4 mt-2 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 flex items-start gap-2">
                          <FileText className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
                          <p className="text-xs text-orange-700">
                            O boleto será gerado após a confirmação. Prazo de compensação: 1–3 dias úteis.
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Sidebar ─────────────────────────────────────────────── */}
          <div className="w-full lg:w-72 xl:w-80 flex-shrink-0 space-y-3">

            {/* Resumo */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
              <h2 className="text-base font-bold text-gray-800">Resumo do pedido</h2>

              {/* Itens */}
              <ul className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
                {items.map((item) => (
                  <li key={item.id} className="flex items-center gap-3 py-2.5">
                    <div className="w-10 h-10 bg-gray-50 rounded-lg border border-gray-100 shrink-0 overflow-hidden">
                      <img src={item.image} alt={item.name} className="w-full h-full object-contain p-0.5"
                        onError={e=>{(e.target as HTMLImageElement).src="/placeholder.svg"}} />
                    </div>
                    <p className="flex-1 text-xs text-gray-600 line-clamp-2 leading-tight">{item.name}</p>
                    <p className="text-xs font-semibold text-gray-800 shrink-0">
                      {item.cartQuantity}× {fmt(item.price)}
                    </p>
                  </li>
                ))}
              </ul>

              <div className="h-px bg-gray-100" />

              {/* Valores */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal ({count})</span>
                  <span className="text-gray-700">{fmt(total)}</span>
                </div>
                {payment === "pix" && (
                  <div className="flex justify-between text-sm">
                    <span className="text-green-600 font-medium">Desconto PIX (5%)</span>
                    <span className="text-green-600 font-medium">-{fmt(pixDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Frete</span>
                  {!uf ? (
                    <span className="text-gray-400 text-xs italic">Selecione o estado</span>
                  ) : shippingCost === 0 ? (
                    <span className="text-green-600 font-medium">Gratis</span>
                  ) : (
                    <span className="text-gray-700 font-medium">{fmt(shippingCost)}</span>
                  )}
                </div>
                {total < FREE_SHIPPING_THRESHOLD && uf && shippingCost > 0 && (
                  <p className="text-[11px] text-gray-400 text-right">
                    Frete gratis em compras acima de {fmt(FREE_SHIPPING_THRESHOLD)}
                  </p>
                )}
                {total >= FREE_SHIPPING_THRESHOLD && uf && (
                  <p className="text-[11px] text-green-600 text-right">
                    Frete gratis aplicado
                  </p>
                )}
              </div>

              <div className="h-px bg-gray-100" />

              <div className="flex items-end justify-between">
                <span className="text-sm font-bold text-gray-800">Total</span>
                <div className="text-right">
                  <p className="text-xl font-extrabold text-gray-900">{fmt(finalTotal)}</p>
                </div>
              </div>

              {/* Erro de pagamento (Asaas) */}
              {errors.submit && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-red-700 leading-relaxed">{errors.submit}</p>
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full bg-[#e8001c] hover:bg-[#c4001a] text-white font-bold py-3 rounded-full
                  transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                {submitting ? "Processando..." : "Finalizar pedido"}
              </button>

              <p className="text-[11px] text-gray-400 text-center flex items-center justify-center gap-1">
                <Lock className="h-3 w-3" /> Compra 100% segura e criptografada
              </p>
            </div>

            {/* Segurança */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
              <p className="text-xs font-semibold text-gray-700 mb-2">Sua compra está protegida</p>
              <ul className="space-y-1.5">
                {["Dados criptografados (SSL)","Pagamento processado com segurança","Política de troca em até 30 dias"].map(t=>(
                  <li key={t} className="flex items-center gap-1.5 text-xs text-gray-500">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />{t}
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
