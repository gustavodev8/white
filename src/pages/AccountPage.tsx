import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ChevronRight, User, ShoppingBag, LogOut, CheckCircle2,
  Package, Loader2, AlertCircle, ChevronDown, ChevronUp, Edit3, Save,
  Truck, Copy, Check, ExternalLink, Smartphone, FileText, XCircle,
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

/* ── Abas ─────────────────────────────────────────────────────── */
type Tab = "profile" | "orders";

/* ── Tab: Dados pessoais ─────────────────────────────────────── */
function ProfileTab() {
  const { user, profile, updateProfile } = useAuth();
  const [name,      setName]      = useState(profile?.name  ?? "");
  const [cpf,       setCpf]       = useState(profile?.cpf   ?? "");
  const [phone,     setPhone]     = useState(profile?.phone ?? "");
  const [birthDate, setBirthDate] = useState(profile?.birth_date ?? "");
  const [saving,    setSaving]    = useState(false);
  const [success,   setSuccess]   = useState(false);
  const [error,     setError]     = useState("");

  useEffect(() => {
    if (profile?.name)       setName(profile.name);
    if (profile?.cpf)        setCpf(profile.cpf);
    if (profile?.phone)      setPhone(profile.phone);
    if (profile?.birth_date) setBirthDate(profile.birth_date);
  }, [profile]);

  async function handleSave() {
    if (!name.trim()) { setError("O nome é obrigatório."); return; }
    setSaving(true);
    setError("");
    const res = await updateProfile({ name, cpf, phone, birth_date: birthDate });
    setSaving(false);
    if (res.error) { setError(res.error); return; }
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  }

  const inputCls = "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:border-[#e8001c] focus:ring-1 focus:ring-[#e8001c]/20 transition-colors";

  return (
    <div className="space-y-5">
      {/* Avatar / nome */}
      <div className="flex items-center gap-4 bg-gray-50 rounded-2xl p-4">
        <div className="w-14 h-14 rounded-full bg-[#e8001c] flex items-center justify-center text-white text-xl font-bold shrink-0">
          {name.charAt(0).toUpperCase() || "U"}
        </div>
        <div>
          <p className="font-semibold text-gray-800">{name || "Usuário"}</p>
          <p className="text-sm text-gray-500">{user?.email}</p>
        </div>
      </div>

      {/* Formulário */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-gray-500 block mb-1">Nome completo *</label>
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="Seu nome completo" className={inputCls} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">E-mail</label>
          <input value={user?.email ?? ""} disabled className={inputCls + " bg-gray-50 cursor-not-allowed text-gray-400"} />
          <p className="text-[11px] text-gray-400 mt-1">O e-mail não pode ser alterado.</p>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">CPF</label>
          <input value={cpf} onChange={e=>setCpf(maskCPF(e.target.value))} placeholder="000.000.000-00" className={inputCls} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Telefone</label>
          <input value={phone} onChange={e=>setPhone(maskPhone(e.target.value))} placeholder="(00) 00000-0000" className={inputCls} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Data de nascimento</label>
          <input type="date" value={birthDate} onChange={e=>setBirthDate(e.target.value)} className={inputCls} />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
          <AlertCircle className="h-4 w-4 shrink-0" />{error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-3 py-2.5">
          <CheckCircle2 className="h-4 w-4 shrink-0" />Dados atualizados com sucesso!
        </div>
      )}

      <button onClick={handleSave} disabled={saving}
        className="flex items-center gap-2 bg-[#e8001c] hover:bg-[#c4001a] text-white font-bold px-6 py-2.5 rounded-full transition-colors text-sm disabled:opacity-60">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {saving ? "Salvando..." : "Salvar alterações"}
      </button>
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
      className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg transition-all ${
        copied ? "bg-green-100 text-green-700" : "bg-gray-100 hover:bg-gray-200 text-gray-600"
      }`}
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copiado" : "Copiar"}
    </button>
  );
}

/* ── Helpers de expiração ────────────────────────────────────── */
const PIX_EXPIRY_MS    = 24 * 60 * 60 * 1000;       // 24 horas
const BOLETO_EXPIRY_MS = 3  * 24 * 60 * 60 * 1000;  // 3 dias

function isPaymentExpired(createdAt: string, method: string): boolean {
  const created = new Date(createdAt).getTime();
  const expiry  = method === "boleto" ? BOLETO_EXPIRY_MS : PIX_EXPIRY_MS;
  return Date.now() > created + expiry;
}

/* ── Secao de pagamento pendente ─────────────────────────────── */
function PendingPaymentSection({ order }: { order: Order }) {
  if (order.status !== "pending" || !order.payment_code) return null;

  /* Código expirado ───────────────────────────────────────────── */
  if (isPaymentExpired(order.created_at, order.payment_method)) {
    const label = order.payment_method === "boleto" ? "Boleto" : "Código PIX";
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-semibold text-gray-600">
            {label} expirado
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">
            O prazo para pagamento deste pedido encerrou. Entre em contato com
            a loja para reprocessar o pagamento.
          </p>
        </div>
      </div>
    );
  }

  /* PIX ───────────────────────────────────────────────────────── */
  if (order.payment_method === "pix") {
    const qrSrc =
      order.payment_qr_url ||
      `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
        order.payment_code,
      )}&bgcolor=ffffff&margin=8`;

    // tempo restante até expirar
    const expiresAt  = new Date(order.created_at).getTime() + PIX_EXPIRY_MS;
    const msLeft     = Math.max(0, expiresAt - Date.now());
    const hLeft      = Math.floor(msLeft / 3_600_000);
    const mLeft      = Math.floor((msLeft % 3_600_000) / 60_000);
    const timeLabel  = hLeft > 0 ? `${hLeft}h ${mLeft}min` : `${mLeft} min`;

    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-green-800 flex items-center gap-1.5">
            <Smartphone className="h-3.5 w-3.5" /> PIX — aguardando pagamento
          </p>
          <span className="text-[11px] font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
            ⏱ expira em {timeLabel}
          </span>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          {/* QR Code */}
          <div className="bg-white rounded-xl p-2 border border-green-200 shadow-sm shrink-0">
            <img
              src={qrSrc}
              alt="QR Code PIX"
              className="w-36 h-36 rounded-lg"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                    order.payment_code ?? "PIX",
                  )}&bgcolor=ffffff&margin=8`;
              }}
            />
          </div>
          {/* Código copia e cola */}
          <div className="flex-1 space-y-3 w-full">
            <p className="text-xs text-green-700 leading-relaxed">
              Escaneie o QR Code ou copie o código abaixo para pagar no app do
              seu banco.
            </p>
            <div className="bg-white border border-green-200 rounded-xl p-3 flex items-start gap-2">
              <p className="flex-1 text-[11px] font-mono text-gray-500 break-all select-all leading-relaxed">
                {order.payment_code}
              </p>
              <CopyCode code={order.payment_code} />
            </div>
            <p className="text-[11px] text-green-600">
              ✓ Abra o banco · Acesse PIX · Escaneie ou cole o código
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* Boleto ────────────────────────────────────────────────────── */
  if (order.payment_method === "boleto") {
    const dueDate = new Date(
      new Date(order.created_at).getTime() + BOLETO_EXPIRY_MS,
    );
    const dueFmt = dueDate.toLocaleDateString("pt-BR");

    // dias restantes
    const msLeft  = Math.max(0, dueDate.getTime() - Date.now());
    const daysLeft = Math.ceil(msLeft / (24 * 60 * 60 * 1000));
    const urgency  = daysLeft <= 1;

    return (
      <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
        <p className="text-xs font-bold text-orange-800 mb-3 flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5" /> Boleto — aguardando pagamento
        </p>
        <div className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 mb-3 ${
          urgency
            ? "bg-red-100 text-red-700 border border-red-200"
            : "bg-orange-100 text-orange-700"
        }`}>
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          Vencimento: <strong>{dueFmt}</strong>
          {daysLeft > 0 && (
            <span className="ml-1">
              — {daysLeft === 1 ? "vence hoje!" : `${daysLeft} dias restantes`}
            </span>
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
    <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
      {/* Cabeçalho */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-sm font-bold text-gray-800">{order.order_number}</span>
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${STATUS_COLOR[order.status]}`}>
              {STATUS_LABEL[order.status]}
            </span>
          </div>
          <p className="text-xs text-gray-400">
            {fmtDate(order.created_at)} · {order.order_items?.length ?? 0} {order.order_items?.length === 1 ? "produto" : "produtos"} ·{" "}
            {paymentLabel[order.payment_method]}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-base font-extrabold text-gray-800">{fmt(order.total)}</p>
          <p className="text-xs text-gray-400">{order.payment_method === "credit" && order.payment_installments > 1
            ? `${order.payment_installments}× ${fmt(order.total / order.payment_installments)}`
            : "À vista"}</p>
        </div>
        {open
          ? <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" />
          : <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />}
      </button>

      {/* Detalhes */}
      {open && (
        <div className="border-t border-gray-100 px-5 py-4 bg-gray-50 space-y-4">
          {/* Itens */}
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Itens do pedido</p>
            <ul className="space-y-2">
              {(order.order_items ?? []).map((item) => (
                <li key={item.id} className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-lg border border-gray-200 shrink-0 overflow-hidden">
                    <img src={item.product_image} alt={item.product_name}
                      className="w-full h-full object-contain p-0.5"
                      onError={e=>{(e.target as HTMLImageElement).src="/placeholder.svg"}} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 font-medium line-clamp-1">{item.product_name}</p>
                    <p className="text-xs text-gray-400">{item.product_brand} · {item.product_quantity}</p>
                  </div>
                  <p className="text-sm font-semibold text-gray-800 shrink-0">
                    {item.quantity}× {fmt(item.unit_price)}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          {/* Pagamento pendente — QR Code PIX ou boleto */}
          <PendingPaymentSection order={order} />

          {/* Rastreio — apenas para pedidos fora de Alagoinhas/BA */}
          {!isLocalOrder(order.shipping_city, order.shipping_state) && order.tracking_code ? (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
              <p className="text-xs font-semibold text-blue-700 mb-2 flex items-center gap-1.5">
                <Truck className="h-3.5 w-3.5" /> Rastreamento do pedido
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
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-center gap-2">
              <Truck className="h-4 w-4 text-gray-400 shrink-0" />
              <p className="text-xs text-gray-500">
                Codigo de rastreio sera disponibilizado em breve.
              </p>
            </div>
          ) : null}

          {/* Entrega */}
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Entrega</p>
            <p className="text-sm text-gray-600">
              {order.shipping_address}, {order.shipping_number}
              {order.shipping_complement ? `, ${order.shipping_complement}` : ""} —{" "}
              {order.shipping_neighborhood ? `${order.shipping_neighborhood}, ` : ""}
              {order.shipping_city}/{order.shipping_state} — CEP {order.shipping_cep}
            </p>
          </div>

          {/* Valores */}
          <div className="bg-white rounded-xl border border-gray-100 p-3 space-y-1.5">
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
            <div className="flex justify-between text-sm font-bold text-gray-800 pt-1 border-t border-gray-100">
              <span>Total</span><span>{fmt(order.total)}</span>
            </div>
          </div>

          {/* ── Cancelar pedido (somente quando aguardando pagamento) ── */}
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
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 space-y-2.5">
                  <p className="text-xs font-semibold text-red-700 flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    Tem certeza que deseja cancelar este pedido?
                  </p>
                  <p className="text-[11px] text-red-500 leading-relaxed">
                    Esta ação não pode ser desfeita. Caso já tenha efetuado o pagamento,
                    entre em contato com a loja para solicitar o estorno.
                  </p>
                  {cancelError && (
                    <p className="text-[11px] text-red-600 font-medium">{cancelError}</p>
                  )}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCancel}
                      disabled={cancelling}
                      className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2 rounded-full transition-colors disabled:opacity-60"
                    >
                      {cancelling
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <XCircle className="h-3.5 w-3.5" />}
                      {cancelling ? "Cancelando..." : "Sim, cancelar"}
                    </button>
                    <button
                      onClick={() => { setConfirmCancel(false); setCancelError(""); }}
                      disabled={cancelling}
                      className="text-xs text-gray-500 hover:text-gray-700 font-medium px-3 py-2 rounded-full border border-gray-200 hover:border-gray-300 transition-colors disabled:opacity-60"
                    >
                      Não, manter
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
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 text-[#e8001c] animate-spin" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
          <Package className="h-8 w-8 text-gray-300" />
        </div>
        <p className="text-base font-semibold text-gray-600">Nenhum pedido encontrado</p>
        <p className="text-sm text-gray-400">Quando você fizer um pedido, ele aparecerá aqui.</p>
        <Link
          to="/"
          className="mt-2 bg-[#e8001c] hover:bg-[#c4001a] text-white font-semibold px-6 py-2.5 rounded-full transition-colors text-sm"
        >
          Ir às compras
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
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
   ACCOUNT PAGE PRINCIPAL
══════════════════════════════════════════════════════════════ */
export default function AccountPage() {
  const { user, profile, loading, signOut } = useAuth();
  const [tab, setTab] = useState<Tab>("profile");
  const navigate = useNavigate();

  // Redireciona para login se não logado
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-10 w-10 text-[#e8001c] animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm text-gray-400 mb-6">
          <Link to="/" className="hover:text-[#e8001c] transition-colors">Página inicial</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-gray-700 font-medium">Minha conta</span>
        </nav>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Minha conta</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Olá, <span className="font-semibold text-gray-700">{profile?.name?.split(" ")[0] || "usuário"}</span>! 👋
            </p>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#e8001c] border border-gray-200 hover:border-[#e8001c] px-4 py-2 rounded-full transition-colors"
          >
            <LogOut className="h-4 w-4" /> Sair da conta
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-6 items-start">

          {/* ── Sidebar de navegação ──────────────────────────────── */}
          <div className="w-full sm:w-48 shrink-0">
            <nav className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {[
                { key: "profile" as Tab, icon: User,        label: "Dados pessoais" },
                { key: "orders"  as Tab, icon: ShoppingBag, label: "Meus pedidos"   },
              ].map(({ key, icon: Icon, label }) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 text-sm font-medium transition-colors text-left
                    border-l-2 ${tab === key
                      ? "border-[#e8001c] bg-red-50 text-[#e8001c]"
                      : "border-transparent text-gray-600 hover:bg-gray-50"}`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </button>
              ))}
            </nav>
          </div>

          {/* ── Conteúdo da aba ───────────────────────────────────── */}
          <div className="flex-1 min-w-0 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            {tab === "profile" ? <ProfileTab /> : <OrdersTab />}
          </div>

        </div>
      </div>
    </div>
  );
}
