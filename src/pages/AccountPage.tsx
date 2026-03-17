import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ChevronRight, User, ShoppingBag, LogOut, CheckCircle2,
  Package, Loader2, AlertCircle, ChevronDown, ChevronUp,  Save,
  Truck, Copy, Check, ExternalLink, Smartphone, FileText, XCircle, MapPin, Search,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { fetchUserOrders, updateOrderStatus, STATUS_LABEL, STATUS_COLOR } from "@/services/ordersService";
import { isLocalOrder } from "@/services/shippingService";
import Header from "@/components/Header";
import type { Order } from "@/services/ordersService";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "long", year: "numeric",
  });
}

function maskCPF(v: string) {
  return v.replace(/\D/g, "").slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}
function maskPhone(v: string) {
  return v.replace(/\D/g, "").slice(0, 11)
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}
function maskCEP(v: string) {
  return v.replace(/\D/g, "").slice(0, 8)
    .replace(/(\d{5})(\d)/, "$1-$2");
}

type Tab = "profile" | "orders";

const inputCls =
  "w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 " +
  "placeholder-gray-300 bg-white focus:outline-none focus:border-gray-900 " +
  "focus:ring-1 focus:ring-gray-900/10 transition-colors";

const UF_OPTIONS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS",
  "MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC",
  "SP","SE","TO",
];

/* ── Tab: Dados pessoais ─────────────────────────────────────── */
function ProfileTab() {
  const { user, profile, updateProfile } = useAuth();
  const [name,         setName]         = useState(profile?.name  ?? "");
  const [cpf,          setCpf]          = useState(profile?.cpf   ?? "");
  const [phone,        setPhone]        = useState(profile?.phone ?? "");
  const [birthDate,    setBirthDate]    = useState(profile?.birth_date ?? "");
  const [addrCep,          setAddrCep]          = useState(profile?.address_cep ?? "");
  const [addrStreet,       setAddrStreet]       = useState(profile?.address_street ?? "");
  const [addrNumber,       setAddrNumber]       = useState(profile?.address_number ?? "");
  const [addrComplement,   setAddrComplement]   = useState(profile?.address_complement ?? "");
  const [addrNeighborhood, setAddrNeighborhood] = useState(profile?.address_neighborhood ?? "");
  const [addrCity,         setAddrCity]         = useState(profile?.address_city ?? "");
  const [addrState,        setAddrState]        = useState(profile?.address_state ?? "");
  const [loadingCep,   setLoadingCep]   = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [success,      setSuccess]      = useState(false);
  const [error,        setError]        = useState("");

  useEffect(() => {
    if (profile?.name)       setName(profile.name);
    if (profile?.cpf)        setCpf(profile.cpf);
    if (profile?.phone)      setPhone(profile.phone);
    if (profile?.birth_date) setBirthDate(profile.birth_date);
    if (profile?.address_cep)          setAddrCep(profile.address_cep);
    if (profile?.address_street)       setAddrStreet(profile.address_street);
    if (profile?.address_number)       setAddrNumber(profile.address_number);
    if (profile?.address_complement)   setAddrComplement(profile.address_complement);
    if (profile?.address_neighborhood) setAddrNeighborhood(profile.address_neighborhood);
    if (profile?.address_city)         setAddrCity(profile.address_city);
    if (profile?.address_state)        setAddrState(profile.address_state);
  }, [profile]);

  async function handleCepSearch() {
    const raw = addrCep.replace(/\D/g, "");
    if (raw.length !== 8) return;
    setLoadingCep(true);
    try {
      const res  = await fetch(`https://viacep.com.br/ws/${raw}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setAddrStreet(data.logradouro || "");
        setAddrNeighborhood(data.bairro || "");
        setAddrCity(data.localidade || "");
        setAddrState(data.uf || "");
      }
    } catch { /* silencioso */ }
    finally { setLoadingCep(false); }
  }

  async function handleSave() {
    if (!name.trim()) { setError("O nome é obrigatório."); return; }
    setSaving(true);
    setError("");
    const res = await updateProfile({
      name, cpf, phone, birth_date: birthDate,
      address_cep:          addrCep          || null,
      address_street:       addrStreet       || null,
      address_number:       addrNumber       || null,
      address_complement:   addrComplement   || null,
      address_neighborhood: addrNeighborhood || null,
      address_city:         addrCity         || null,
      address_state:        addrState        || null,
    });
    setSaving(false);
    if (res.error) { setError(res.error); return; }
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  }

  return (
    <div className="divide-y divide-gray-100">

      {/* ── Dados pessoais ── */}
      <div className="pb-7">
        <div className="flex items-center gap-2 mb-5">
          <User className="h-4 w-4 text-gray-400" />
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Dados pessoais</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-gray-500 block mb-1.5">Nome completo *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Seu nome completo" className={inputCls} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1.5">E-mail</label>
            <input value={user?.email ?? ""} disabled className={inputCls + " bg-gray-50 cursor-not-allowed text-gray-400"} />
            <p className="text-[11px] text-gray-400 mt-1">O e-mail não pode ser alterado.</p>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1.5">CPF</label>
            <input value={cpf} onChange={e => setCpf(maskCPF(e.target.value))} placeholder="000.000.000-00" className={inputCls} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1.5">Telefone / WhatsApp</label>
            <input value={phone} onChange={e => setPhone(maskPhone(e.target.value))} placeholder="(00) 00000-0000" className={inputCls} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1.5">Data de nascimento</label>
            <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} className={inputCls} />
          </div>
        </div>
      </div>

      {/* ── Endereço de entrega ── */}
      <div className="py-7">
        <div className="flex items-center gap-2 mb-1.5">
          <MapPin className="h-4 w-4 text-gray-400" />
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Endereço de entrega</h3>
        </div>
        <p className="text-xs text-gray-400 mb-5 ml-6">
          Salve seu endereço para agilizar suas compras. Ele será preenchido automaticamente no checkout.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-gray-500 block mb-1.5">CEP</label>
            <div className="flex gap-2">
              <input
                value={addrCep}
                onChange={e => setAddrCep(maskCEP(e.target.value))}
                onKeyDown={e => e.key === "Enter" && handleCepSearch()}
                placeholder="00000-000"
                maxLength={9}
                className={inputCls}
              />
              <button
                onClick={handleCepSearch}
                disabled={loadingCep || addrCep.replace(/\D/g, "").length !== 8}
                className="px-4 py-2.5 bg-gray-900 hover:bg-gray-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-40 shrink-0 flex items-center gap-1.5"
              >
                {loadingCep ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Buscar
              </button>
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-gray-500 block mb-1.5">Logradouro</label>
            <input value={addrStreet} onChange={e => setAddrStreet(e.target.value)} placeholder="Rua, avenida..." className={inputCls} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1.5">Número</label>
            <input value={addrNumber} onChange={e => setAddrNumber(e.target.value)} placeholder="123" className={inputCls} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1.5">
              Complemento <span className="text-gray-300 font-normal">(opcional)</span>
            </label>
            <input value={addrComplement} onChange={e => setAddrComplement(e.target.value)} placeholder="Apto, bloco..." className={inputCls} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1.5">Bairro</label>
            <input value={addrNeighborhood} onChange={e => setAddrNeighborhood(e.target.value)} placeholder="Centro" className={inputCls} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1.5">Cidade</label>
            <input value={addrCity} onChange={e => setAddrCity(e.target.value)} placeholder="Sua cidade" className={inputCls} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1.5">Estado</label>
            <select value={addrState} onChange={e => setAddrState(e.target.value)}
              className={inputCls + " appearance-none"}>
              <option value="">Selecione...</option>
              {UF_OPTIONS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* ── Feedback + Salvar ── */}
      <div className="pt-6 space-y-4">
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3.5 py-2.5">
            <AlertCircle className="h-4 w-4 shrink-0" />{error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-3.5 py-2.5">
            <CheckCircle2 className="h-4 w-4 shrink-0" />Dados atualizados com sucesso.
          </div>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-gray-900 hover:bg-gray-700 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors text-sm disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "Salvando..." : "Salvar alterações"}
        </button>
      </div>

    </div>
  );
}

/* ── Copiar codigo ───────────────────────────────────────────── */
function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button
      onClick={copy}
      className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-md transition-all ${
        copied ? "bg-green-100 text-green-700" : "bg-gray-100 hover:bg-gray-200 text-gray-600"
      }`}
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copiado" : "Copiar"}
    </button>
  );
}

/* ── Helpers de expiração ────────────────────────────────────── */
const PIX_EXPIRY_MS    = 24 * 60 * 60 * 1000;
const BOLETO_EXPIRY_MS = 3  * 24 * 60 * 60 * 1000;

function isPaymentExpired(createdAt: string, method: string): boolean {
  const created = new Date(createdAt).getTime();
  const expiry  = method === "boleto" ? BOLETO_EXPIRY_MS : PIX_EXPIRY_MS;
  return Date.now() > created + expiry;
}

/* ── Secao de pagamento pendente ─────────────────────────────── */
function PendingPaymentSection({ order }: { order: Order }) {
  if (order.status !== "pending" || !order.payment_code) return null;

  if (isPaymentExpired(order.created_at, order.payment_method)) {
    const label = order.payment_method === "boleto" ? "Boleto" : "Código PIX";
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-semibold text-gray-600">{label} expirado</p>
          <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">
            O prazo para pagamento deste pedido encerrou. Entre em contato com a loja para reprocessar o pagamento.
          </p>
        </div>
      </div>
    );
  }

  if (order.payment_method === "pix") {
    const qrSrc =
      order.payment_qr_url ||
      `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(order.payment_code)}&bgcolor=ffffff&margin=8`;
    const expiresAt = new Date(order.created_at).getTime() + PIX_EXPIRY_MS;
    const msLeft    = Math.max(0, expiresAt - Date.now());
    const hLeft     = Math.floor(msLeft / 3_600_000);
    const mLeft     = Math.floor((msLeft % 3_600_000) / 60_000);
    const timeLabel = hLeft > 0 ? `${hLeft}h ${mLeft}min` : `${mLeft} min`;

    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-green-800 flex items-center gap-1.5">
            <Smartphone className="h-3.5 w-3.5" /> PIX — aguardando pagamento
          </p>
          <span className="text-[11px] font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
            expira em {timeLabel}
          </span>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="bg-white rounded-xl p-2 border border-green-200 shadow-sm shrink-0">
            <img
              src={qrSrc}
              alt="QR Code PIX"
              className="w-36 h-36 rounded-lg"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(order.payment_code ?? "PIX")}&bgcolor=ffffff&margin=8`;
              }}
            />
          </div>
          <div className="flex-1 space-y-3 w-full">
            <p className="text-xs text-green-700 leading-relaxed">
              Escaneie o QR Code ou copie o código abaixo para pagar no app do seu banco.
            </p>
            <div className="bg-white border border-green-200 rounded-xl p-3 flex items-start gap-2">
              <p className="flex-1 text-[11px] font-mono text-gray-500 break-all select-all leading-relaxed">
                {order.payment_code}
              </p>
              <CopyCode code={order.payment_code} />
            </div>
            <p className="text-[11px] text-green-600">
              Abra o banco · Acesse PIX · Escaneie ou cole o código
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (order.payment_method === "boleto") {
    const dueDate  = new Date(new Date(order.created_at).getTime() + BOLETO_EXPIRY_MS);
    const dueFmt   = dueDate.toLocaleDateString("pt-BR");
    const msLeft   = Math.max(0, dueDate.getTime() - Date.now());
    const daysLeft = Math.ceil(msLeft / (24 * 60 * 60 * 1000));
    const urgency  = daysLeft <= 1;

    return (
      <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
        <p className="text-xs font-bold text-orange-800 mb-3 flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5" /> Boleto — aguardando pagamento
        </p>
        <div className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 mb-3 ${
          urgency ? "bg-red-100 text-red-700 border border-red-200" : "bg-orange-100 text-orange-700"
        }`}>
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          Vencimento: <strong>{dueFmt}</strong>
          {daysLeft > 0 && (
            <span className="ml-1">— {daysLeft === 1 ? "vence hoje!" : `${daysLeft} dias restantes`}</span>
          )}
        </div>
        <div className="bg-white border border-orange-200 rounded-xl p-3 flex items-start gap-2">
          <p className="flex-1 text-[11px] font-mono text-gray-500 break-all select-all leading-relaxed">
            {order.payment_code}
          </p>
          <CopyCode code={order.payment_code} />
        </div>
        <p className="text-[11px] text-orange-600 mt-2">
          Pague em qualquer banco, lotérica ou app de internet banking.
        </p>
      </div>
    );
  }

  return null;
}

/* ── Card de pedido ──────────────────────────────────────────── */
function OrderCard({ order, onCancelled }: { order: Order; onCancelled: () => void }) {
  const [open,          setOpen]          = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling,    setCancelling]    = useState(false);
  const [cancelError,   setCancelError]   = useState("");

  const paymentLabel: Record<string, string> = {
    pix:    "PIX",
    credit: "Cartão de crédito",
    boleto: "Boleto bancário",
  };

  async function handleCancel() {
    setCancelling(true);
    setCancelError("");
    try {
      await updateOrderStatus(order.id, "cancelled");
      onCancelled();
    } catch {
      setCancelError("Não foi possível cancelar. Tente novamente.");
      setCancelling(false);
      setConfirmCancel(false);
    }
  }

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      {/* Cabeçalho */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50/80 transition-colors text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-sm font-bold text-gray-900">{order.order_number}</span>
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${STATUS_COLOR[order.status]}`}>
              {STATUS_LABEL[order.status]}
            </span>
          </div>
          <p className="text-xs text-gray-400">
            {fmtDate(order.created_at)} · {order.order_items?.length ?? 0}{" "}
            {order.order_items?.length === 1 ? "produto" : "produtos"} · {paymentLabel[order.payment_method]}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-bold text-gray-900">{fmt(order.total)}</p>
          <p className="text-xs text-gray-400">
            {order.payment_method === "credit" && order.payment_installments > 1
              ? `${order.payment_installments}× ${fmt(order.total / order.payment_installments)}`
              : "À vista"}
          </p>
        </div>
        {open
          ? <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" />
          : <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />}
      </button>

      {/* Detalhes */}
      {open && (
        <div className="border-t border-gray-100 px-5 py-5 bg-gray-50/50 space-y-4">

          {/* Itens */}
          <div>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">Itens do pedido</p>
            <ul className="space-y-2.5">
              {(order.order_items ?? []).map((item) => (
                <li key={item.id} className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-lg border border-gray-200 shrink-0 overflow-hidden">
                    <img src={item.product_image} alt={item.product_name}
                      className="w-full h-full object-contain p-0.5"
                      onError={e => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 font-medium line-clamp-1">{item.product_name}</p>
                    <p className="text-xs text-gray-400">{item.product_brand} · {item.product_quantity}</p>
                  </div>
                  <p className="text-sm font-semibold text-gray-800 shrink-0">
                    {item.quantity}× {fmt(item.unit_price)}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          {/* Pagamento pendente */}
          <PendingPaymentSection order={order} />

          {/* Rastreio */}
          {!isLocalOrder(order.shipping_city, order.shipping_state) && order.tracking_code ? (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3.5">
              <p className="text-xs font-semibold text-blue-700 mb-2 flex items-center gap-1.5">
                <Truck className="h-3.5 w-3.5" /> Rastreamento
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-sm font-bold text-gray-800 tracking-wider">
                  {order.tracking_code}
                </span>
                <CopyCode code={order.tracking_code} />
                <a
                  href={`https://rastreamento.correios.com.br/app/resultado.app?objetos=${order.tracking_code}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <ExternalLink className="h-3 w-3" /> Rastrear
                </a>
              </div>
            </div>
          ) : !isLocalOrder(order.shipping_city, order.shipping_state) && (order.status === "shipped" || order.status === "processing") ? (
            <div className="bg-white border border-gray-100 rounded-xl p-3.5 flex items-center gap-2">
              <Truck className="h-4 w-4 text-gray-300 shrink-0" />
              <p className="text-xs text-gray-400">Código de rastreio será disponibilizado em breve.</p>
            </div>
          ) : null}

          {/* Entrega */}
          <div>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Entrega</p>
            <p className="text-sm text-gray-600">
              {order.shipping_address}, {order.shipping_number}
              {order.shipping_complement ? `, ${order.shipping_complement}` : ""} —{" "}
              {order.shipping_neighborhood ? `${order.shipping_neighborhood}, ` : ""}
              {order.shipping_city}/{order.shipping_state} — CEP {order.shipping_cep}
            </p>
          </div>

          {/* Valores */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-1.5">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Subtotal</span><span>{fmt(order.subtotal)}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-xs text-green-600">
                <span>Desconto</span><span>-{fmt(order.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-xs">
              <span className={order.shipping_cost > 0 ? "text-gray-500" : "text-green-600"}>Frete</span>
              <span className={order.shipping_cost > 0 ? "text-gray-700" : "text-green-600"}>
                {order.shipping_cost > 0 ? fmt(order.shipping_cost) : "Grátis"}
              </span>
            </div>
            <div className="flex justify-between text-sm font-bold text-gray-900 pt-2 border-t border-gray-100 mt-1">
              <span>Total</span><span>{fmt(order.total)}</span>
            </div>
          </div>

          {/* Cancelar pedido */}
          {order.status === "pending" && (
            <div className="pt-1">
              {!confirmCancel ? (
                <button
                  onClick={() => setConfirmCancel(true)}
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 transition-colors"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Cancelar pedido
                </button>
              ) : (
                <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3.5 space-y-3">
                  <p className="text-xs font-semibold text-red-700 flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    Confirmar cancelamento?
                  </p>
                  <p className="text-[11px] text-red-500 leading-relaxed">
                    Esta ação não pode ser desfeita. Caso já tenha efetuado o pagamento,
                    entre em contato com a loja para solicitar o estorno.
                  </p>
                  {cancelError && <p className="text-[11px] text-red-600 font-medium">{cancelError}</p>}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCancel}
                      disabled={cancelling}
                      className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors disabled:opacity-60"
                    >
                      {cancelling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                      {cancelling ? "Cancelando..." : "Sim, cancelar"}
                    </button>
                    <button
                      onClick={() => { setConfirmCancel(false); setCancelError(""); }}
                      disabled={cancelling}
                      className="text-xs text-gray-500 hover:text-gray-700 font-medium px-3 py-2 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors disabled:opacity-60"
                    >
                      Manter pedido
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Tab: Pedidos ────────────────────────────────────────────── */
function OrdersTab() {
  const { user } = useAuth();
  const [orders,  setOrders]  = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    fetchUserOrders(user.id).then((data) => {
      setOrders(data);
      setLoading(false);
    });
  }, [user]);

  function handleOrderCancelled(orderId: string) {
    setOrders((prev) =>
      prev.map((o) => o.id === orderId ? { ...o, status: "cancelled" as const } : o),
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-7 w-7 text-gray-400 animate-spin" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center">
          <Package className="h-6 w-6 text-gray-300" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-700">Nenhum pedido encontrado</p>
          <p className="text-xs text-gray-400 mt-1">Quando você fizer um pedido, ele aparecerá aqui.</p>
        </div>
        <Link
          to="/"
          className="mt-1 bg-gray-900 hover:bg-gray-700 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors text-sm"
        >
          Explorar produtos
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {orders.map((order) => (
        <OrderCard
          key={order.id}
          order={order}
          onCancelled={() => handleOrderCancelled(order.id)}
        />
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   ACCOUNT PAGE
══════════════════════════════════════════════════════════════ */
export default function AccountPage() {
  const { user, profile, loading, signOut } = useAuth();
  const [tab, setTab] = useState<Tab>("profile");
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/entrar", { state: { from: "/minha-conta" } });
    }
  }, [loading, user, navigate]);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  async function handleSignOut() {
    await signOut();
    navigate("/");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-gray-300 animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const initials = (profile?.name ?? user.email ?? "U")
    .split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();

  const tabs = [
    { key: "profile" as Tab, icon: User,        label: "Dados pessoais" },
    { key: "orders"  as Tab, icon: ShoppingBag, label: "Meus pedidos"   },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="container mx-auto px-4 py-8 max-w-5xl">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-gray-400 mb-8">
          <Link to="/" className="hover:text-gray-700 transition-colors">Página inicial</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-gray-600">Minha conta</span>
        </nav>

        <div className="flex flex-col lg:flex-row gap-6 items-start">

          {/* ── Sidebar ──────────────────────────────────────────── */}
          <div className="w-full lg:w-60 shrink-0 space-y-3">

            {/* Perfil resumido */}
            <div className="bg-white border border-gray-100 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center text-white text-sm font-bold shrink-0 select-none">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {profile?.name?.split(" ")[0] || "Usuário"}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{user.email}</p>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center justify-center gap-2 text-xs text-gray-500 hover:text-gray-800 border border-gray-200 hover:border-gray-300 px-3 py-2 rounded-lg transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sair da conta
              </button>
            </div>

            {/* Navegação */}
            <nav className="bg-white border border-gray-100 rounded-xl overflow-hidden">
              {tabs.map(({ key, icon: Icon, label }) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 text-sm transition-colors text-left border-l-2 ${
                    tab === key
                      ? "border-gray-900 bg-gray-50 text-gray-900 font-semibold"
                      : "border-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-700 font-medium"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </button>
              ))}
            </nav>
          </div>

          {/* ── Conteúdo ─────────────────────────────────────────── */}
          <div className="flex-1 min-w-0 bg-white border border-gray-100 rounded-xl p-6 lg:p-8">
            <h2 className="text-base font-bold text-gray-900 mb-6">
              {tab === "profile" ? "Dados pessoais" : "Meus pedidos"}
            </h2>
            {tab === "profile" ? <ProfileTab /> : <OrdersTab />}
          </div>

        </div>
      </div>
    </div>
  );
}
