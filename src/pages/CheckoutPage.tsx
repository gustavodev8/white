import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ChevronRight, User, MapPin, CheckCircle2, Smartphone,
  Lock, ChevronDown, Loader2, Copy, Check, AlertCircle,
  ShoppingBag, ArrowRight, X, Clock, CreditCard, FileText, ExternalLink,
} from "lucide-react";
import { useCart, cartTotal, cartCount } from "@/hooks/useCart";
import { useAuth }                       from "@/hooks/useAuth";
import { createOrder, updateOrderStatus } from "@/services/ordersService";
import { createPayment, checkPaymentStatus } from "@/services/paymentService";
import { fetchConfig, calcularParcelas } from "@/services/configService";
import type { ConfigCartao }             from "@/services/configService";
import { validateCupom, incrementCupomUso } from "@/services/cuponsService";
import type { Cupom }                    from "@/services/cuponsService";
import { calculateShipping, shippingLabel, FREE_SHIPPING_THRESHOLD, isAlagoinhasCity, ALAGOINHAS_SHIPPING } from "@/services/shippingService";
import Header                            from "@/components/Header";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type PaymentMethod = "pix" | "boleto" | "credit";
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
        {label}{required && <span className="text-gray-900 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
const inputCls = "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900/20 transition-colors";
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


/* ── Tela: PIX aguardando ───────────────────────────────────────── */
function PixScreen({
  orderNumber, total, pixCode, pixQrCodeUrl, paymentId, orderId, onSuccess,
}: {
  orderNumber: string; total: number; pixCode: string;
  pixQrCodeUrl?: string; paymentId?: string; orderId?: string; onSuccess: () => void;
}) {
  const [timer, setTimer] = useState(900);

  // Countdown
  useEffect(() => {
    const iv = setInterval(() => setTimer((t) => Math.max(0, t - 1)), 1000);
    return () => clearInterval(iv);
  }, []);

  // Polling automático: verifica status a cada 5s e redireciona ao aprovar
  useEffect(() => {
    if (!paymentId) return;
    let cancelled = false;
    const poll = setInterval(async () => {
      if (cancelled) return;
      const result = await checkPaymentStatus(paymentId);
      if (!cancelled && result.mpStatus === "approved") {
        clearInterval(poll);
        if (orderId) await updateOrderStatus(orderId, "processing").catch(() => {});
        onSuccess();
      }
    }, 5000);
    return () => { cancelled = true; clearInterval(poll); };
  }, [paymentId, orderId, onSuccess]);

  const qrSrc = pixQrCodeUrl
    || `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(pixCode)}&bgcolor=ffffff&margin=12`;

  const steps = [
    "Abra o app do seu banco ou carteira digital",
    'Acesse a área de pagamentos e escolha "PIX"',
    "Escaneie o QR Code ou use o código copia e cola",
    "Confirme o valor e finalize o pagamento",
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-3xl">

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {/* ── Layout: coluna única no mobile, 2 colunas no desktop ── */}
          <div className="flex flex-col lg:flex-row">

            {/* ── COLUNA ESQUERDA: QR + código ── */}
            <div className="flex flex-col items-center justify-center gap-5 p-8 lg:w-[340px] lg:shrink-0 lg:border-r lg:border-gray-100">

              {/* Cabeçalho compacto */}
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-green-50 mb-3">
                  <Smartphone className="h-5 w-5 text-green-600" />
                </div>
                <h1 className="text-lg font-bold text-gray-900">Pagar com PIX</h1>
                <p className="text-sm text-gray-400 mt-0.5">Pedido #{orderNumber}</p>
              </div>

              {/* Valor */}
              <div className="text-center">
                <p className="text-xs text-gray-400 mb-0.5">Valor a pagar</p>
                <p className="text-3xl font-extrabold text-gray-900 tabular-nums">
                  {total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </p>
              </div>

              {/* Timer */}
              <div className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-semibold
                ${timer < 120 ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700"}`}>
                <Clock className="h-3.5 w-3.5 shrink-0" />
                Código válido por <PixTimer seconds={timer} />
              </div>

              {/* QR Code */}
              <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm">
                <img
                  src={qrSrc}
                  alt="QR Code PIX"
                  className="w-48 h-48 rounded-lg"
                  onError={(e) => { (e.target as HTMLImageElement).src =
                    `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(pixCode || "WHITE.COM")}&bgcolor=ffffff&margin=12`; }}
                />
              </div>

              {/* Copia e cola */}
              <div className="w-full">
                <p className="text-[11px] text-gray-400 text-center mb-1.5">ou use o código copia e cola</p>
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl p-3">
                  <p className="flex-1 text-[10px] text-gray-500 font-mono break-all leading-relaxed select-all">
                    {pixCode}
                  </p>
                  <CopyButton text={pixCode} />
                </div>
              </div>
            </div>

            {/* ── COLUNA DIREITA: instruções + status ── */}
            <div className="flex flex-col justify-between gap-6 p-8 flex-1 bg-gray-50/50">

              {/* Como pagar */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Como pagar</p>
                <ol className="space-y-4">
                  {steps.map((s, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-green-500 text-white text-[11px] font-bold
                        flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span className="text-sm text-gray-600 leading-relaxed">{s}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Status + ações */}
              <div className="space-y-3">
                <div className="flex items-center gap-2.5 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200
                  rounded-xl px-4 py-3 font-medium">
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                  Aguardando confirmação do pagamento...
                </div>

                <button
                  onClick={onSuccess}
                  className="w-full text-xs text-gray-400 hover:text-gray-600 transition-colors py-1"
                >
                  Já paguei — ver confirmação do pedido
                </button>

                <p className="text-center text-[11px] text-gray-400 flex items-center justify-center gap-1">
                  <Lock className="h-3 w-3" /> Pagamento seguro via Banco Central do Brasil
                </p>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}


/* ── Tela: Boleto ───────────────────────────────────────────────── */
function BoletoScreen({
  orderNumber, total, boletoCode, boletoUrl, dueDate, onSuccess,
}: {
  orderNumber: string; total: number; boletoCode: string;
  boletoUrl?: string; dueDate?: string; onSuccess: () => void;
}) {
  const steps = [
    "Copie o código de barras abaixo",
    "Abra o app do seu banco ou internet banking",
    "Escolha pagar com boleto e cole o código",
    "Confirme o pagamento antes do vencimento",
  ];

  const dueDateFmt = dueDate
    ? new Date(dueDate + "T12:00:00").toLocaleDateString("pt-BR")
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="flex flex-col lg:flex-row">

            {/* ── Coluna esquerda: código + ações ── */}
            <div className="flex flex-col items-center justify-center gap-5 p-8 lg:w-[340px] lg:shrink-0 lg:border-r lg:border-gray-100">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-orange-50 mb-3">
                  <FileText className="h-5 w-5 text-orange-600" />
                </div>
                <h1 className="text-lg font-bold text-gray-900">Pagar com Boleto</h1>
                <p className="text-sm text-gray-400 mt-0.5">Pedido #{orderNumber}</p>
              </div>

              <div className="text-center">
                <p className="text-xs text-gray-400 mb-0.5">Valor a pagar</p>
                <p className="text-3xl font-extrabold text-gray-900 tabular-nums">
                  {total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </p>
              </div>

              {dueDateFmt && (
                <div className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-semibold bg-orange-50 text-orange-700">
                  <Clock className="h-3.5 w-3.5 shrink-0" />
                  Vence em <strong>{dueDateFmt}</strong>
                </div>
              )}

              {/* Linha digitável */}
              <div className="w-full">
                <p className="text-[11px] text-gray-400 text-center mb-1.5">Código de barras / linha digitável</p>
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl p-3">
                  <p className="flex-1 text-[10px] text-gray-500 font-mono break-all leading-relaxed select-all">
                    {boletoCode}
                  </p>
                  <CopyButton text={boletoCode} />
                </div>
              </div>

              {boletoUrl && (
                <a
                  href={boletoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 bg-gray-900 hover:bg-black text-white font-semibold text-sm py-3 rounded-full transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  Abrir boleto em PDF
                </a>
              )}
            </div>

            {/* ── Coluna direita: instruções + status ── */}
            <div className="flex flex-col justify-between gap-6 p-8 flex-1 bg-gray-50/50">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Como pagar</p>
                <ol className="space-y-4">
                  {steps.map((s, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-orange-500 text-white text-[11px] font-bold
                        flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span className="text-sm text-gray-600 leading-relaxed">{s}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2.5 text-sm text-orange-700 bg-orange-50 border border-orange-200
                  rounded-xl px-4 py-3 font-medium">
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                  Aguardando confirmação do pagamento...
                </div>
                <button
                  onClick={onSuccess}
                  className="w-full text-xs text-gray-400 hover:text-gray-600 transition-colors py-1"
                >
                  Já paguei — ver confirmação do pedido
                </button>
                <p className="text-center text-[11px] text-gray-400 flex items-center justify-center gap-1">
                  <Lock className="h-3 w-3" /> Boleto gerado com segurança via PagHiper
                </p>
              </div>
            </div>

          </div>
        </div>
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
    boleto: "Após o pagamento do boleto (até 3 dias úteis), seu pedido será preparado.",
    credit: "Seu pedido está sendo processado e em breve será confirmado.",
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
              className="w-full border border-gray-900 text-gray-900 hover:bg-gray-50 font-bold py-3 rounded-full transition-colors text-sm flex items-center justify-center gap-2"
            >
              <ShoppingBag className="h-4 w-4" /> Ver meus pedidos
            </button>
            <button
              onClick={() => navigate("/")}
              className="w-full bg-gray-900 hover:bg-black text-white font-bold py-3 rounded-full transition-colors text-sm flex items-center justify-center gap-2"
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

  const [step,          setStep]        = useState<Step>("form");
  const [payment,       setPayment]     = useState<PaymentMethod>("pix");
  const [orderNum,      setOrderNum]    = useState("");
  const [orderId,       setOrderId]     = useState("");
  const [mpPaymentId,   setMpPaymentId] = useState("");
  const [pixCode,       setPixCode]     = useState("");
  const [pixQrCodeUrl,  setPixQrCodeUrl]  = useState("");
  const [boletoCode,    setBoletoCode]  = useState("");
  const [boletoUrl,     setBoletoUrl]   = useState("");
  const [boletoDueDate, setBoletoDueDate] = useState("");
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
  // Cupom de desconto
  const [cupomInput,   setCupomInput]   = useState("");
  const [cupomAplicado,setCupomAplicado]= useState<Cupom | null>(null);
  const [cupomDesconto,setCupomDesconto]= useState(0);
  const [cupomLoading, setCupomLoading] = useState(false);
  const [cupomError,   setCupomError]   = useState("");
  const [parcelas,     setParcelas]     = useState(1);
  const [cfgCartao,    setCfgCartao]    = useState<ConfigCartao>({ taxa_pct: 2.5, parcelas_max: 6, juros_a_partir_de: 2 });
  const [deliveryMode, setDeliveryMode] = useState<"entrega" | "retirada">("entrega");

  // Cartão de crédito
  const [cardNumber,   setCardNumber]   = useState("");
  const [cardName,     setCardName]     = useState("");
  const [cardExpiry,   setCardExpiry]   = useState("");
  const [cardCvv,      setCardCvv]      = useState("");
  const [cardBrand,    setCardBrand]    = useState(""); // visa / master / elo ...

  const MP_PUBLIC_KEY = import.meta.env.VITE_MP_PUBLIC_KEY as string;

  // Scroll ao topo + carrega config de cartão
  useEffect(() => {
    window.scrollTo(0, 0);
    fetchConfig().then(c => setCfgCartao(c.cartao));
  }, []);

  // Pré-preenche quando perfil carrega
  useEffect(() => {
    if (profile?.name  && !name)  setName(profile.name);
    if (user?.email    && !email) setEmail(user.email);
    if (profile?.cpf   && !cpf)   setCpf(profile.cpf);
    if (profile?.phone && !phone) setPhone(profile.phone);
    // Endereço salvo no perfil
    if (profile?.address_cep          && !cep)          setCep(profile.address_cep);
    if (profile?.address_street       && !address)      setAddress(profile.address_street);
    if (profile?.address_number       && !addressNum)   setAddressNum(profile.address_number);
    if (profile?.address_complement   && !complement)   setComplement(profile.address_complement);
    if (profile?.address_neighborhood && !neighborhood) setNeighborhood(profile.address_neighborhood);
    if (profile?.address_city         && !city)         setCity(profile.address_city);
    if (profile?.address_state        && !uf)           setUf(profile.address_state);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, user]);

  // Detecta bandeira do cartão via MP SDK quando BIN tem 6+ dígitos
  useEffect(() => {
    const digits = cardNumber.replace(/\D/g, "");
    if (digits.length < 6) { setCardBrand(""); return; }
    const mp = (window as unknown as { MercadoPago: new (k: string, o: object) => { getPaymentMethods: (o: { bin: string }) => Promise<{ results: { id: string }[] }> } }).MercadoPago;
    if (!mp || !MP_PUBLIC_KEY) return;
    try {
      const mpInst = new mp(MP_PUBLIC_KEY, { locale: "pt-BR" });
      mpInst.getPaymentMethods({ bin: digits.slice(0, 6) })
        .then(({ results }) => { if (results[0]) setCardBrand(results[0].id); })
        .catch(() => {});
    } catch { /* SDK não carregou ainda */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardNumber]);

  // Redireciona apenas se o carrinho JÁ ESTAVA vazio quando a página abriu.
  // Usar deps=[] garante que roda UMA única vez — nunca dispara ao limpar
  // o carrinho depois do submit (clearCart()), eliminando a race condition.
  useEffect(() => {
    if (initialCartSize.current === 0) {
      navigate("/carrinho");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const pixDiscount  = payment === "pix" ? (total - cupomDesconto) * 0.05 : 0;
  const isAlagoinhas = isAlagoinhasCity(city);
  const shippingCost = isAlagoinhas && uf
    ? (deliveryMode === "retirada" ? 0 : (total >= FREE_SHIPPING_THRESHOLD ? 0 : ALAGOINHAS_SHIPPING))
    : calculateShipping(uf, total);
  const baseTotal    = total - cupomDesconto - pixDiscount + shippingCost;
  const parcelaOpts  = calcularParcelas(baseTotal, cfgCartao);
  const parcelaSel   = parcelaOpts.find(p => p.parcelas === parcelas) ?? parcelaOpts[0];
  const creditFee    = payment === "credit" && parcelaSel?.temJuros
    ? parcelaSel.totalFinal - baseTotal : 0;
  const finalTotal   = baseTotal + creditFee;

  async function handleApplyCupom() {
    const code = cupomInput.trim();
    if (!code) return;
    setCupomLoading(true);
    setCupomError("");
    const result = await validateCupom(code, total);
    setCupomLoading(false);
    if ("error" in result) {
      setCupomError(result.error);
      setCupomAplicado(null);
      setCupomDesconto(0);
    } else {
      setCupomAplicado(result.cupom);
      setCupomDesconto(result.desconto);
      setCupomError("");
    }
  }

  function handleRemoveCupom() {
    setCupomAplicado(null);
    setCupomDesconto(0);
    setCupomInput("");
    setCupomError("");
  }

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

    if (payment === "credit") {
      if (!cardNumber.replace(/\D/g,""))        e.cardNumber = "Obrigatório";
      if (!cardName.trim())                     e.cardName   = "Obrigatório";
      if (!cardCvv.trim())                      e.cardCvv    = "Obrigatório";
      const [mm, yy] = cardExpiry.split("/");
      if (!mm || !yy || mm.length < 2 || yy.length < 2) {
        e.cardExpiry = "Data inválida";
      } else {
        const now = new Date();
        const expM = parseInt(mm, 10);
        const expY = parseInt(yy.length === 2 ? "20" + yy : yy, 10);
        if (expM < 1 || expM > 12) {
          e.cardExpiry = "Mês inválido";
        } else if (
          expY < now.getFullYear() ||
          (expY === now.getFullYear() && expM < now.getMonth() + 1)
        ) {
          e.cardExpiry = "Cartão vencido";
        }
      }
    }

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

      // ── 1. Chama Mercado Pago via Edge Function ───────────────
      let payResult = { paymentId: "", pixCode: "", pixQrCodeUrl: "", boletoCode: "", boletoUrl: "", dueDate: "" };
      let mpPaymentStatus = ""; // status retornado pelo MP (approved, in_process, pending...)

      if (payment === "credit") {
        // Tokeniza cartão via MP SDK no browser
        type MpType = { createCardToken: (o: object) => Promise<{ id: string; cause?: { description: string }[] }> };
        type WinType = { MercadoPago: new (k: string, o: object) => MpType };
        const MpCtor = (window as unknown as WinType).MercadoPago;
        if (!MpCtor) { setErrors({ submit: "SDK do Mercado Pago não carregou. Recarregue a página." }); return; }
        const mpInst = new MpCtor(MP_PUBLIC_KEY, { locale: "pt-BR" });

        const [expMonth, expYear] = cardExpiry.replace(/\s/g,"").split("/");
        let tokenRes: { id: string; cause?: { description: string }[] };
        try {
          tokenRes = await mpInst.createCardToken({
            cardNumber:          cardNumber.replace(/\D/g, ""),
            cardholderName:      cardName.trim(),
            cardExpirationMonth: expMonth,
            cardExpirationYear:  expYear?.length === 2 ? "20" + expYear : expYear,
            securityCode:        cardCvv,
            identificationType:  "CPF",
            identificationNumber: cpf.replace(/\D/g, ""),
          });
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Dados do cartão inválidos.";
          setErrors({ submit: msg }); return;
        }
        if (!tokenRes.id) {
          const cause = tokenRes.cause?.[0]?.description ?? "Dados do cartão inválidos.";
          setErrors({ submit: cause }); return;
        }

        const result = await createPayment(
          { name, cpf, email, phone, cep, address, addressNum, complement, neighborhood, city, state: uf },
          { method: "credit", total: finalTotal, orderNumber: generatedOrderNum,
            cardToken: tokenRes.id, installments: parcelas, paymentMethodId: cardBrand || "visa" },
        );
        if (result.error) { setErrors({ submit: result.error }); return; }
        if (result.status) mpPaymentStatus = result.status;

      } else {
        const result = await createPayment(
          { name, cpf, email, phone, cep, address, addressNum, complement, neighborhood, city, state: uf },
          { method: payment as "pix" | "boleto", total: finalTotal, orderNumber: generatedOrderNum },
        );
        if (result.error) { setErrors({ submit: result.error }); return; }
        if (result.paymentId)    { setMpPaymentId(result.paymentId);      payResult.paymentId    = result.paymentId; }
        if (result.pixCode)      { setPixCode(result.pixCode);           payResult.pixCode      = result.pixCode; }
        if (result.pixQrCodeUrl) { setPixQrCodeUrl(result.pixQrCodeUrl); payResult.pixQrCodeUrl = result.pixQrCodeUrl; }
        if (result.boletoCode)   { setBoletoCode(result.boletoCode);     payResult.boletoCode   = result.boletoCode; }
        if (result.boletoUrl)    { setBoletoUrl(result.boletoUrl);        payResult.boletoUrl    = result.boletoUrl; }
        if (result.dueDate)      { setBoletoDueDate(result.dueDate);      payResult.dueDate      = result.dueDate; }
      }

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
          payment_method:        payment === "credit" ? "credit" : payment,
          payment_installments:  payment === "credit" ? parcelas : 1,
          subtotal:              total,
          discount:              cupomDesconto + pixDiscount,
          shipping_cost:         shippingCost,
          observacoes:           deliveryMode === "retirada" ? "Retirada na loja" : null,
          total:                 finalTotal,
          cupom_codigo:          cupomAplicado?.codigo ?? null,
          payment_code:          payResult.paymentId || null,
          payment_qr_url:        payResult.pixQrCodeUrl || payResult.boletoUrl || null,
          // Cartão aprovado na hora → já entra como "Em processamento"
          status: mpPaymentStatus === "approved" ? "processing" : undefined,
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
        // Incrementa uso do cupom após salvar o pedido
        if (cupomAplicado) {
          incrementCupomUso(cupomAplicado.id, cupomAplicado.usos_count).catch(() => {});
        }
      } catch (orderErr) {
        console.warn("[handleSubmit] Erro ao salvar pedido (não crítico):", orderErr);
        // Não bloqueia o fluxo — o pagamento já foi criado com sucesso
      }

      // ── 3. Avança para a tela de pagamento ────────────────────────
      setPaidTotal(finalTotal);   // captura ANTES do clearCart
      const nextStep: Step = payment === "pix" ? "pix" : payment === "boleto" ? "boleto" : "success";
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
  if (step === "pix")     return <PixScreen    orderNumber={orderNum} total={paidTotal} pixCode={pixCode} pixQrCodeUrl={pixQrCodeUrl} paymentId={mpPaymentId} orderId={orderId} onSuccess={() => setStep("success")} />;
  if (step === "boleto")  return <BoletoScreen orderNumber={orderNum} total={paidTotal} boletoCode={boletoCode} boletoUrl={boletoUrl} dueDate={boletoDueDate} onSuccess={() => setStep("success")} />;
  if (step === "success") return <SuccessScreen orderNumber={orderNum} paymentMethod={payment} />;

  // ── Render do formulário ─────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm text-gray-400 mb-6">
          <Link to="/"         className="hover:text-gray-900 transition-colors">Página inicial</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link to="/carrinho" className="hover:text-gray-900 transition-colors">Cesta de compras</Link>
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
              <div className={`flex items-center gap-1.5 ${i===0?"text-gray-900":i<3?"text-gray-400":"text-gray-300"}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2
                  ${i===0?"border-gray-900 bg-gray-900 text-white":i<3?"border-gray-300 text-gray-400":"border-gray-200 text-gray-300"}`}>
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
                <User className="h-4 w-4 text-gray-900" />
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
                <MapPin className="h-4 w-4 text-gray-900" />
                <h2 className="text-sm font-bold text-gray-800">Endereço de entrega</h2>
              </div>
              <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* CEP */}
                <div className="sm:col-span-2" data-err={errors.cep?"1":undefined}>
                  <Field label="CEP" required error={errors.cep}>
                    <div className="flex gap-2">
                      <input value={cep} onChange={e=>setCep(maskCEP(e.target.value))} placeholder="00000-000" maxLength={9} className={inputCls} />
                      <button onClick={handleCepSearch} disabled={loadingCep}
                        className="px-4 py-2.5 bg-gray-900 hover:bg-black text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60 shrink-0 flex items-center gap-1.5">
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

            {/* 2b. Modo de entrega — só para Alagoinhas */}
            {isAlagoinhas && uf && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100">
                  <MapPin className="h-4 w-4 text-gray-900" />
                  <h2 className="text-sm font-bold text-gray-800">Como você quer receber?</h2>
                </div>
                <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Entrega */}
                  <button
                    type="button"
                    onClick={() => setDeliveryMode("entrega")}
                    className={`flex items-start gap-3 p-4 rounded-xl border-2 transition-colors text-left ${
                      deliveryMode === "entrega"
                        ? "border-gray-900 bg-gray-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <span className={`mt-0.5 h-4 w-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                      deliveryMode === "entrega" ? "border-gray-900" : "border-gray-400"
                    }`}>
                      {deliveryMode === "entrega" && <span className="h-2 w-2 rounded-full bg-gray-900" />}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">Entrega em casa</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {total >= FREE_SHIPPING_THRESHOLD
                          ? "Grátis"
                          : `R$ ${ALAGOINHAS_SHIPPING.toFixed(2).replace(".", ",")} — motoboy`}
                      </p>
                    </div>
                  </button>
                  {/* Retirada */}
                  <button
                    type="button"
                    onClick={() => setDeliveryMode("retirada")}
                    className={`flex items-start gap-3 p-4 rounded-xl border-2 transition-colors text-left ${
                      deliveryMode === "retirada"
                        ? "border-gray-900 bg-gray-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <span className={`mt-0.5 h-4 w-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                      deliveryMode === "retirada" ? "border-gray-900" : "border-gray-400"
                    }`}>
                      {deliveryMode === "retirada" && <span className="h-2 w-2 rounded-full bg-gray-900" />}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">Retirada na loja</p>
                      <p className="text-xs text-gray-500 mt-0.5">Grátis — combine o horário</p>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* 3. Pagamento */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100">
                <Lock className="h-4 w-4 text-gray-900" />
                <h2 className="text-sm font-bold text-gray-800">Forma de pagamento</h2>
              </div>
              <div className="px-6 py-5 space-y-3">

                {(["pix","boleto","credit"] as PaymentMethod[]).map((method) => {
                  const cfgMap = {
                    pix:    { icon: Smartphone,  color: "text-green-500",   label: "PIX",                sub: "Pagamento instantâneo",          badge: "5% OFF",  badgeCls: "bg-green-100 text-green-700"   },
                    boleto: { icon: FileText,     color: "text-orange-500",  label: "Boleto bancário",    sub: "Vencimento em até 3 dias úteis",  badge: null,      badgeCls: ""                              },
                    credit: { icon: CreditCard,   color: "text-blue-500",    label: "Cartão de crédito",  sub: "Parcelamento disponível",         badge: null,      badgeCls: ""                              },
                  };
                  const c = cfgMap[method];
                  const Icon = c.icon;
                  return (
                    <div key={method}>
                      <label className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-colors
                        ${payment===method ? "border-gray-900 bg-gray-50" : "border-gray-200 hover:border-gray-300"}`}>
                        <input type="radio" name="pay" value={method} checked={payment===method}
                          onChange={() => { setPayment(method); setParcelas(1); }}
                          className="accent-gray-900 w-4 h-4 shrink-0" />
                        <Icon className={`h-5 w-5 ${c.color} shrink-0`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800">{c.label}</p>
                          <p className="text-xs text-gray-500">{c.sub}</p>
                        </div>
                        {c.badge && <span className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 whitespace-nowrap ${c.badgeCls}`}>{c.badge}</span>}
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
                          <AlertCircle className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
                          <p className="text-xs text-orange-700">
                            O boleto será gerado após confirmar o pedido.
                            Pague em qualquer banco, lotérica ou pelo app do seu banco.
                          </p>
                        </div>
                      )}

                      {method==="credit" && payment==="credit" && (
                        <div className="ml-4 mt-2 space-y-3">

                          {/* ── Dados do cartão ── */}
                          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                            <p className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
                              <Lock className="h-3 w-3" /> Dados do cartão
                            </p>

                            {/* Número do cartão */}
                            <div>
                              <label className="text-xs text-gray-500 block mb-1">Número do cartão</label>
                              <div className="relative">
                                <input
                                  type="text" inputMode="numeric" autoComplete="cc-number"
                                  placeholder="0000 0000 0000 0000"
                                  value={cardNumber}
                                  onChange={e => {
                                    const v = e.target.value.replace(/\D/g,"").slice(0,16);
                                    setCardNumber(v.replace(/(.{4})/g,"$1 ").trim());
                                  }}
                                  className={inputCls + " pr-16 font-mono tracking-widest" + (errors.cardNumber ? " border-red-400" : "")}
                                />
                                {cardBrand && (
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                                    {cardBrand}
                                  </span>
                                )}
                              </div>
                              {errors.cardNumber && <p className="text-xs text-red-500 mt-1">{errors.cardNumber}</p>}
                            </div>

                            {/* Nome no cartão */}
                            <div>
                              <label className="text-xs text-gray-500 block mb-1">Nome no cartão</label>
                              <input
                                type="text" autoComplete="cc-name"
                                placeholder="Como está impresso no cartão"
                                value={cardName}
                                onChange={e => setCardName(e.target.value.toUpperCase())}
                                className={inputCls + " uppercase" + (errors.cardName ? " border-red-400" : "")}
                              />
                              {errors.cardName && <p className="text-xs text-red-500 mt-1">{errors.cardName}</p>}
                            </div>

                            {/* Validade + CVV */}
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-xs text-gray-500 block mb-1">Validade (MM/AA)</label>
                                <input
                                  type="text" inputMode="numeric" autoComplete="cc-exp"
                                  placeholder="MM/AA"
                                  value={cardExpiry}
                                  onChange={e => {
                                    const v = e.target.value.replace(/\D/g,"").slice(0,4);
                                    setCardExpiry(v.length > 2 ? v.slice(0,2) + "/" + v.slice(2) : v);
                                  }}
                                  className={inputCls + " font-mono" + (errors.cardExpiry ? " border-red-400" : "")}
                                />
                                {errors.cardExpiry && <p className="text-xs text-red-500 mt-1">{errors.cardExpiry}</p>}
                              </div>
                              <div>
                                <label className="text-xs text-gray-500 block mb-1">CVV</label>
                                <input
                                  type="text" inputMode="numeric" autoComplete="cc-csc"
                                  placeholder="000"
                                  value={cardCvv}
                                  onChange={e => setCardCvv(e.target.value.replace(/\D/g,"").slice(0,4))}
                                  className={inputCls + " font-mono" + (errors.cardCvv ? " border-red-400" : "")}
                                />
                                {errors.cardCvv && <p className="text-xs text-red-500 mt-1">{errors.cardCvv}</p>}
                              </div>
                            </div>
                          </div>

                          {/* ── Parcelamento ── */}
                          <p className="text-xs font-semibold text-gray-500 px-1">Escolha o parcelamento:</p>
                          <div className="grid grid-cols-2 gap-1.5">
                            {parcelaOpts.map(p => (
                              <button
                                key={p.parcelas}
                                type="button"
                                onClick={() => setParcelas(p.parcelas)}
                                className={`text-left text-[11px] px-3 py-2 rounded-lg border-2 transition-colors leading-tight ${
                                  parcelas === p.parcelas
                                    ? "border-gray-900 bg-gray-50 text-gray-900"
                                    : "border-gray-200 hover:border-gray-300 text-gray-600"
                                }`}
                              >
                                <span className="font-bold text-xs">{p.parcelas}x</span>{" "}
                                <span>{fmt(p.valorParcela)}</span>
                                {p.temJuros
                                  ? <span className="text-amber-600 ml-1 text-[10px]">(+juros)</span>
                                  : <span className="text-green-600 ml-1 text-[10px]">sem juros</span>}
                              </button>
                            ))}
                          </div>
                          {parcelaSel?.temJuros && (
                            <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                              Total com juros: <strong>{fmt(parcelaSel.totalFinal)}</strong>
                              {" "}(acréscimo de {fmt(parcelaSel.totalFinal - baseTotal)})
                            </p>
                          )}
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

              {/* Cupom de desconto */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-700">Cupom de desconto</p>
                {cupomAplicado ? (
                  <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-green-700 font-mono">{cupomAplicado.codigo}</p>
                      <p className="text-xs text-green-600">-{fmt(cupomDesconto)}</p>
                    </div>
                    <button onClick={handleRemoveCupom} className="text-gray-400 hover:text-gray-600 transition-colors">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex gap-2">
                      <input
                        value={cupomInput}
                        onChange={e => { setCupomInput(e.target.value.toUpperCase()); setCupomError(""); }}
                        onKeyDown={e => e.key === "Enter" && handleApplyCupom()}
                        placeholder="Codigo do cupom"
                        className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900/20 font-mono uppercase"
                      />
                      <button
                        onClick={handleApplyCupom}
                        disabled={cupomLoading || !cupomInput.trim()}
                        className="px-3 py-2 bg-gray-800 hover:bg-gray-900 text-white text-xs font-semibold rounded-xl transition-colors disabled:opacity-50 shrink-0"
                      >
                        {cupomLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Aplicar"}
                      </button>
                    </div>
                    {cupomError && (
                      <p className="text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3 shrink-0" />{cupomError}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="h-px bg-gray-100" />

              {/* Valores */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal ({count})</span>
                  <span className="text-gray-700">{fmt(total)}</span>
                </div>
                {cupomDesconto > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-green-600 font-medium">Cupom {cupomAplicado?.codigo}</span>
                    <span className="text-green-600 font-medium">-{fmt(cupomDesconto)}</span>
                  </div>
                )}
                {payment === "pix" && pixDiscount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-green-600 font-medium">Desconto PIX (5%)</span>
                    <span className="text-green-600 font-medium">-{fmt(pixDiscount)}</span>
                  </div>
                )}
                {payment === "credit" && creditFee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-amber-600 font-medium">Taxa cartão ({parcelas}x)</span>
                    <span className="text-amber-600 font-medium">+{fmt(creditFee)}</span>
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
                className="w-full bg-gray-900 hover:bg-black text-white font-bold py-3 rounded-full
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
