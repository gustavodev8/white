import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { STORE_NAME } from "@/config/storeConfig";
import { supabase } from "@/services/supabaseClient";
import { fetchAllProducts, toggleProductActive, deleteProduct, updateProduct } from "@/services/productsService";
import {
  fetchAllSections, createSection, updateSection,
  toggleSectionActive, deleteSection, reorderSections,
} from "@/services/sectionsService";
import type { Section } from "@/services/sectionsService";
import {
  fetchAllBanners, uploadBanner, deleteBanner,
  toggleBannerActive, reorderBanners, validateBannerResolution,
} from "@/services/bannersService";
import type { Banner } from "@/services/bannersService";
import {
  fetchAllOrders, createOrder, updateOrderStatus, updateOrderTracking,
  STATUS_LABEL, STATUS_COLOR,
} from "@/services/ordersService";
import { refundPayment, checkPaymentStatus } from "@/services/paymentService";
import { isLocalOrder } from "@/services/shippingService";
import {
  fetchFluxoCombinado, createTransacao, deleteTransacao,
  CATEGORIAS_ENTRADA, CATEGORIAS_SAIDA, FORMAS_PAGAMENTO,
} from "@/services/fluxoCaixaService";
import type { EntradaFluxo, TipoTransacao } from "@/services/fluxoCaixaService";
import {
  fetchColaboradores, createColaborador, updateColaborador,
  toggleColaboradorAtivo, deleteColaborador,
} from "@/services/colaboradoresService";
import type { Colaborador } from "@/services/colaboradoresService";
import { fetchEstoque, ajustarEstoque } from "@/services/estoqueService";
import type { EstoqueProduto } from "@/services/estoqueService";
import { fetchMeta, saveMeta } from "@/services/metasService";
import type { Meta } from "@/services/metasService";
import {
  fetchConfig, saveConfigCartao, calcularParcelas,
} from "@/services/configService";
import type { AppConfig, ConfigCartao } from "@/services/configService";
import {
  fetchCupons, createCupom, toggleCupomAtivo, deleteCupom,
} from "@/services/cuponsService";
import type { Cupom, CupomInput } from "@/services/cuponsService";
import {
  fetchContas, createConta, updateContaStatus, deleteConta,
  CATEGORIAS_PAGAR, CATEGORIAS_RECEBER,
} from "@/services/contasService";
import type { Conta, ContaInput, ContaTipo } from "@/services/contasService";
import { restGet, restPost, restPatch } from "@/services/supabaseRest";
import type { Order } from "@/services/ordersService";
import AdminProductForm from "@/components/AdminProductForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  Heart, LogOut, Plus, Pencil, Trash2,
  ChevronUp, ChevronDown, LayoutList, Search, X,
  Image as ImageIcon, Download, Package, ShoppingBag,
  TrendingUp, TrendingDown, Clock, BarChart2, ExternalLink, RefreshCw,
  ChevronRight, ChevronLeft, Truck, CheckCircle2, XCircle, AlertCircle,
  Link as LinkIcon, Save, ShoppingCart, Users, Menu, Minus, Receipt,
  Wallet, ArrowUpCircle, ArrowDownCircle, CalendarDays,
  UserPlus, UserCheck, UserX, Target, FileBarChart2, Boxes,
  Tag, BadgePercent, DollarSign, CalendarClock, Award, BadgeCheck,
  Ban, CreditCard, FileDown, Settings, SlidersHorizontal, MessageSquare,
  Smartphone, Building2, Landmark, CalendarCheck, Hash, PhoneCall,
  LockKeyhole, LockKeyholeOpen, Banknote, AlertTriangle,
  KeyRound, ShieldCheck, ShieldOff, ShieldAlert, Eye, EyeOff, RotateCcw,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { gerarRelatorioPDF } from "@/services/pdfService";
import type { PDFSecoes } from "@/services/pdfService";
import { gerarRecibo } from "@/services/receiptService";
import type { ReceiptData } from "@/services/receiptService";
import {
  fetchFornecedores, createFornecedor, updateFornecedor,
} from "@/services/fornecedoresService";
import type { Fornecedor, FornecedorInput } from "@/services/fornecedoresService";
import {
  fetchUserRole, fetchColaboradorAcesso,
  createColaboradorUser, updatePermissoes, toggleAcesso,
  updatePassword, deleteColaboradorUser, gerarSenhaAleatoria,
  ABAS_COLABORADOR,
} from "@/services/userRolesService";
import type { UserRole } from "@/services/userRolesService";
import {
  fetchOuCriarCaixaHoje, fetchFechamentos, fetchCaixasPendentes,
  salvarCaixa, calcularResumoHoje,
} from "@/services/caixaService";
import type { CaixaFechamento } from "@/services/caixaService";
import { produtosVencendoEm } from "@/services/estoqueService";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { fmt, fmtDate, fmtDateTime, PAYMENT_LABELS } from "@/lib/formatters";

// ─── Tipo produto admin ───────────────────────────────────────────────────────
interface AdminProduct {
  id: string; name: string; brand: string; quantity: string;
  price: number; originalPrice: number; discount: number;
  image: string; category: string; sections: string[]; isActive: boolean;
  stock: number | null;
  sizeStock?: Record<string, number> | null;
}

// ─── Tipo perfil de cliente ───────────────────────────────────────────────────
interface Profile {
  id: string;
  name: string | null;
  cpf: string | null;
  phone: string | null;
  created_at: string;
}

// ─── Item do carrinho (PDV) ───────────────────────────────────────────────────
interface CartItem {
  product: AdminProduct;
  qty: number;
  selectedSize?: string | null;
  cartKey: string; // `${product.id}_${selectedSize ?? ""}`
}

function pdvCartKey(productId: string, selectedSize?: string | null): string {
  return `${productId}_${selectedSize ?? ""}`;
}

function pdvParseSizes(quantity: string): string[] {
  if (!quantity.includes("/")) return [];
  return quantity.split("/").map((s) => s.trim()).filter(Boolean);
}

function pdvSizeStock(product: AdminProduct, size: string | null | undefined): number {
  if (size && product.sizeStock) {
    const s = product.sizeStock[size];
    if (s !== undefined) return s;
  }
  return product.stock ?? 0;
}

// ─── Login ────────────────────────────────────────────────────────────────────
function LoginForm() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) setError(authError.message);
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black text-gray-900 tracking-tight">{STORE_NAME}</span>
          </div>
          <p className="text-sm text-gray-400 uppercase tracking-widest text-xs font-semibold">Painel Administrativo</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@sualojaaqui.com.br" required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="password">Senha</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          {error && <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </Button>
        </form>
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function SkeletonRow({ cols = 6 }: { cols?: number }) {
  return (
    <TableRow>
      {Array.from({ length: cols }).map((_, i) => (
        <TableCell key={i}>
          <div className="h-4 bg-muted animate-pulse rounded-md" style={{ width: `${60 + (i % 3) * 20}%` }} />
        </TableCell>
      ))}
    </TableRow>
  );
}

// ─── Ícone por status ─────────────────────────────────────────────────────────
function StatusIcon({ status }: { status: Order["status"] }) {
  const cls = "h-3.5 w-3.5 shrink-0";
  switch (status) {
    case "pending":    return <Clock className={cls} />;
    case "processing": return <RefreshCw className={cls} />;
    case "shipped":    return <Truck className={cls} />;
    case "delivered":  return <CheckCircle2 className={cls} />;
    case "cancelled":  return <XCircle className={cls} />;
  }
}

// ─── Aba Dashboard ────────────────────────────────────────────────────────────
function DashboardTab({ isActive }: { isActive: boolean }) {
  const [orders,   setOrders]   = useState<Order[]>([]);
  const [lowStock, setLowStock] = useState<EstoqueProduto[]>([]);
  const [meta,     setMeta]     = useState<Meta | null>(null);
  const [fluxoMes, setFluxoMes] = useState<{ entradas: number; saidas: number }>({ entradas: 0, saidas: 0 });
  const [loading,  setLoading]  = useState(false);
  const loaded = useRef(false);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();
      const mes = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const [ordersData, estoqueData, metaData, fluxoData] = await Promise.all([
        fetchAllOrders(),
        fetchEstoque(),
        fetchMeta(mes),
        fetchFluxoCombinado(mes),
      ]);
      setOrders(ordersData);
      setLowStock(
        estoqueData
          .filter(p => p.is_active && p.stock <= p.stock_min)
          .sort((a, b) => a.stock - b.stock)
          .slice(0, 6),
      );
      setMeta(metaData);
      const entradas = fluxoData.filter(f => f.tipo === "entrada").reduce((s, f) => s + f.valor, 0);
      const saidas   = fluxoData.filter(f => f.tipo === "saida").reduce((s, f) => s + f.valor, 0);
      setFluxoMes({ entradas, saidas });
      loaded.current = true;
    } catch (err) {
      console.error("[DashboardTab] Erro ao carregar dados:", err);
      toast.error("Erro ao carregar o dashboard.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (isActive && !loaded.current) loadOrders();
  }, [isActive, loadOrders]);

  // ── Métricas ──
  const now          = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const active       = orders.filter(o => o.status !== "cancelled");
  const monthOrders  = active.filter(o => new Date(o.created_at) >= startOfMonth);
  const todayOrders  = orders.filter(o => new Date(o.created_at) >= startOfToday);
  const pending      = orders.filter(o => o.status === "pending");

  const revenueMonth = monthOrders.reduce((s, o) => s + Number(o.total), 0);
  const avgTicket    = active.length > 0
    ? active.reduce((s, o) => s + Number(o.total), 0) / active.length
    : 0;

  const recentOrders = [...orders].slice(0, 6);

  const pctFat = meta && meta.meta_faturamento > 0 ? (revenueMonth / meta.meta_faturamento) * 100 : 0;
  const pctPed = meta && meta.meta_pedidos     > 0 ? (monthOrders.length / meta.meta_pedidos) * 100 : 0;

  const barColor = (pct: number) =>
    pct >= 100 ? "bg-foreground" : pct >= 70 ? "bg-foreground/70" : pct >= 40 ? "bg-foreground/45" : "bg-foreground/25";

  const statusCounts: Record<Order["status"], number> = {
    pending: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0,
  };
  orders.forEach(o => { statusCounts[o.status] = (statusCounts[o.status] ?? 0) + 1; });

  const metrics = [
    {
      label:    "Receita do mês",
      value:    fmt(revenueMonth),
      sub:      `${monthOrders.length} pedido${monthOrders.length !== 1 ? "s" : ""} no mês`,
      icon:     TrendingUp,
      color:    "text-foreground",
      bg:       "bg-secondary",
    },
    {
      label:    "Total de pedidos",
      value:    String(orders.length),
      sub:      `${todayOrders.length} hoje`,
      icon:     ShoppingBag,
      color:    "text-foreground",
      bg:       "bg-secondary",
    },
    {
      label:    "Aguardando pagamento",
      value:    String(pending.length),
      sub:      pending.length > 0 ? "Requerem atenção" : "Nenhum pendente",
      icon:     AlertCircle,
      color:    "text-foreground",
      bg:       "bg-secondary",
    },
    {
      label:    "Ticket médio",
      value:    fmt(avgTicket),
      sub:      `${active.length} pedido${active.length !== 1 ? "s" : ""} ativos`,
      icon:     BarChart2,
      color:    "text-foreground",
      bg:       "bg-secondary",
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-background rounded-xl border border-border p-5 space-y-3">
            <div className="h-8 w-8 bg-muted animate-pulse rounded-lg" />
            <div className="h-7 bg-muted animate-pulse rounded w-24" />
            <div className="h-3 bg-muted animate-pulse rounded w-32" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cards de métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <div key={m.label} className="bg-background rounded-xl border border-border p-5">
              <div className={`inline-flex items-center justify-center w-9 h-9 rounded-lg ${m.bg} mb-3`}>
                <Icon className={`h-4 w-4 ${m.color}`} />
              </div>
              <p className="text-2xl font-bold text-foreground leading-tight">{m.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{m.label}</p>
              <p className="text-[11px] text-muted-foreground/70 mt-0.5">{m.sub}</p>
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Pedidos recentes */}
        <div className="lg:col-span-2 bg-background rounded-xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold text-sm">Pedidos recentes</h3>
            <span className="text-xs text-muted-foreground">{recentOrders.length} de {orders.length}</span>
          </div>
          {orders.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-muted-foreground">
              Nenhum pedido encontrado.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recentOrders.map((order) => (
                <div key={order.id} className="px-5 py-3.5 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{order.order_number}</p>
                    <p className="text-xs text-muted-foreground truncate">{order.customer_name}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold">{fmt(Number(order.total))}</p>
                    <p className="text-[11px] text-muted-foreground">{fmtDate(order.created_at)}</p>
                  </div>
                  <span className={`hidden sm:inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[order.status]}`}>
                    <StatusIcon status={order.status} />
                    {STATUS_LABEL[order.status]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pedidos por status */}
        <div className="bg-background rounded-xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-semibold text-sm">Por status</h3>
          </div>
          <div className="p-5 space-y-3">
            {(Object.entries(statusCounts) as [Order["status"], number][]).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between gap-2">
                <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[status]}`}>
                  <StatusIcon status={status} />
                  {STATUS_LABEL[status]}
                </span>
                <span className="text-sm font-bold text-foreground">{count}</span>
              </div>
            ))}
            {orders.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-2">Sem dados ainda</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Meta do mês + Estoque critico ─────────────────────────── */}
      {(meta || lowStock.length > 0) && (
        <div className="grid lg:grid-cols-2 gap-4">

          {/* Meta do mês */}
          {meta && (
            <div className="bg-background rounded-xl border border-border overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center gap-2">
                <Target className="h-4 w-4 text-foreground" />
                <h3 className="font-semibold text-sm">Meta do mês</h3>
                <span className="ml-auto text-xs text-muted-foreground">
                  {new Date().toLocaleString("pt-BR", { month: "long", year: "numeric" })}
                </span>
              </div>
              <div className="p-5 space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-1.5 text-xs">
                    <span className="text-muted-foreground">Faturamento</span>
                    <span className="font-medium">{fmt(revenueMonth)} / {fmt(meta.meta_faturamento)}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${barColor(pctFat)}`}
                      style={{ width: `${Math.min(100, pctFat)}%` }} />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">{pctFat.toFixed(1)}% atingido</p>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5 text-xs">
                    <span className="text-muted-foreground">Pedidos</span>
                    <span className="font-medium">{monthOrders.length} / {meta.meta_pedidos}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${barColor(pctPed)}`}
                      style={{ width: `${Math.min(100, pctPed)}%` }} />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">{pctPed.toFixed(1)}% atingido</p>
                </div>
              </div>
            </div>
          )}

          {/* Estoque critico */}
          {lowStock.length > 0 && (
            <div className="bg-background rounded-xl border border-border overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center gap-2">
                <Boxes className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold text-sm">Estoque critico</h3>
                <span className="ml-auto text-[11px] font-medium text-muted-foreground">
                  {lowStock.filter(p => p.stock === 0).length > 0
                    ? `${lowStock.filter(p => p.stock === 0).length} esgotado(s)`
                    : `${lowStock.length} com estoque baixo`}
                </span>
              </div>
              <div className="divide-y divide-border">
                {lowStock.map(p => (
                  <div key={p.id} className="px-5 py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{p.name}</p>
                      <p className="text-[11px] text-muted-foreground">{p.brand}</p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${
                      p.stock === 0 ? "bg-secondary text-muted-foreground" : "bg-secondary text-foreground"
                    }`}>
                      {p.stock === 0 ? "Esgotado" : `${p.stock} un.`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Resumo financeiro do mês ──────────────────────────────── */}
      <div className="bg-background rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <Wallet className="h-4 w-4 text-foreground" />
          <h3 className="font-semibold text-sm">Resumo financeiro</h3>
          <span className="ml-auto text-xs text-muted-foreground">
            {new Date().toLocaleString("pt-BR", { month: "long", year: "numeric" })}
          </span>
        </div>
        <div className="p-5 grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-[11px] text-muted-foreground mb-1">Entradas</p>
            <p className="text-lg font-bold text-foreground">{fmt(fluxoMes.entradas)}</p>
          </div>
          <div className="text-center">
            <p className="text-[11px] text-muted-foreground mb-1">Saidas</p>
            <p className="text-lg font-bold text-muted-foreground">{fmt(fluxoMes.saidas)}</p>
          </div>
          <div className="text-center">
            <p className="text-[11px] text-muted-foreground mb-1">Saldo</p>
            <p className="text-lg font-bold text-foreground">
              {fmt(fluxoMes.entradas - fluxoMes.saidas)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Aba de Pedidos (Admin) ───────────────────────────────────────────────────
type StatusFilter = Order["status"] | "all";

const STATUS_OPTIONS: { value: Order["status"]; label: string }[] = [
  { value: "pending",    label: "Aguardando pagamento" },
  { value: "processing", label: "Em processamento" },
  { value: "shipped",    label: "Enviado" },
  { value: "delivered",  label: "Entregue" },
  { value: "cancelled",  label: "Cancelado" },
];

function AdminOrdersTab({ isActive, isAdmin = true }: { isActive: boolean; isAdmin?: boolean }) {
  const [orders, setOrders]           = useState<Order[]>([]);
  const [loading, setLoading]         = useState(false);
  const loaded = useRef(false);
  const [search, setSearch]           = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [updatingId, setUpdatingId]       = useState<string | null>(null);
  const [expandedId, setExpandedId]       = useState<string | null>(null);
  const [trackingEdits, setTrackingEdits] = useState<Record<string, string>>({});
  const [savingTracking, setSavingTracking] = useState<string | null>(null);
  const [refundingId, setRefundingId]       = useState<string | null>(null);
  const [refundConfirm, setRefundConfirm]   = useState<Order | null>(null);
  const [checkingId, setCheckingId]         = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAllOrders();
      setOrders(data);
      loaded.current = true;
    } catch { toast.error("Erro ao carregar pedidos"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (isActive && !loaded.current) loadOrders();
  }, [isActive, loadOrders]);

  async function handleStatusChange(orderId: string, status: Order["status"]) {
    setUpdatingId(orderId);
    try {
      await updateOrderStatus(orderId, status);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
      toast.success("Status atualizado");
      // Expande automaticamente ao marcar como enviado para facilitar inserir o rastreio
      if (status === "shipped") setExpandedId(orderId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar status");
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleSaveTracking(orderId: string) {
    const code = (trackingEdits[orderId] ?? "").trim();
    setSavingTracking(orderId);
    try {
      await updateOrderTracking(orderId, code);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, tracking_code: code || null } : o));
      toast.success(code ? "Codigo de rastreio salvo" : "Codigo de rastreio removido");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar rastreio");
    } finally {
      setSavingTracking(null);
    }
  }

  async function handleRefund(order: Order) {
    if (!order.payment_code) return;
    setRefundConfirm(null);
    setRefundingId(order.id);
    try {
      const result = await refundPayment(order.payment_code);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      await updateOrderStatus(order.id, "cancelled");
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: "cancelled" } : o));
      toast.success("Estorno realizado com sucesso.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao estornar pagamento.");
    } finally {
      setRefundingId(null);
    }
  }

  // Mapeamento MP status → Order status
  const MP_TO_ORDER: Record<string, Order["status"]> = {
    approved:     "processing",
    refunded:     "cancelled",
    charged_back: "cancelled",
    cancelled:    "cancelled",
  };

  async function handleCheckStatus(order: Order) {
    if (!order.payment_code) return;
    setCheckingId(order.id);
    try {
      const result = await checkPaymentStatus(order.payment_code);
      if (result.error) { toast.error(result.error); return; }

      const newStatus = MP_TO_ORDER[result.mpStatus ?? ""];
      if (!newStatus) {
        toast.info(`Status no Mercado Pago: "${result.mpStatus}" — nenhuma alteração necessária.`);
        return;
      }
      if (order.status === newStatus) {
        toast.info("Pedido já está com o status correto.");
        return;
      }
      await updateOrderStatus(order.id, newStatus);
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: newStatus } : o));
      toast.success(`Status atualizado para "${STATUS_LABEL[newStatus]}".`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao verificar pagamento.");
    } finally {
      setCheckingId(null);
    }
  }

  const filtered = orders.filter(o => {
    const matchStatus  = statusFilter === "all" || o.status === statusFilter;
    const q            = search.toLowerCase();
    const matchSearch  = !q
      || o.order_number.toLowerCase().includes(q)
      || o.customer_name.toLowerCase().includes(q)
      || o.customer_email.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const paymentLabel = PAYMENT_LABELS;

  return (
    <>
      {/* Barra de filtros */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por pedido ou cliente..."
            className="pl-9"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {([
            { value: "all" as const, label: "Todos" },
            ...STATUS_OPTIONS,
          ]).map(opt => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value as StatusFilter)}
              className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                statusFilter === opt.value
                  ? "bg-foreground text-background border-foreground"
                  : "bg-background text-muted-foreground border-border hover:border-foreground hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {filtered.length} pedido{filtered.length !== 1 ? "s" : ""}
          </span>
          <Button variant="outline" size="sm" onClick={loadOrders} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Atualizar
          </Button>
        </div>
      </div>

      <div className="bg-background rounded-xl border border-border overflow-hidden">
        {loading ? (
          <Table>
            <TableHeader>
              <TableRow>
                {["Pedido", "Data", "Cliente", "Pagamento", "Total", "Status", ""].map(h => (
                  <TableHead key={h}>{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} cols={7} />)}
            </TableBody>
          </Table>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-sm">
            {orders.length === 0
              ? "Nenhum pedido encontrado. Os pedidos aparecerão aqui assim que forem realizados."
              : `Nenhum pedido corresponde ao filtro selecionado.`}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pedido</TableHead>
                <TableHead className="hidden md:table-cell">Data</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="hidden sm:table-cell">Pagamento</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(order => (
                <>
                  <TableRow
                    key={order.id}
                    className="cursor-pointer hover:bg-secondary/50 transition-colors"
                    onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                  >
                    <TableCell>
                      <p className="font-mono text-xs font-semibold">{order.order_number}</p>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                      {fmtDateTime(order.created_at)}
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-medium truncate max-w-[160px]">{order.customer_name}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[160px]">{order.customer_email}</p>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant="outline" className="text-xs">{paymentLabel[order.payment_method]}</Badge>
                    </TableCell>
                    <TableCell className="font-semibold text-sm">{fmt(Number(order.total))}</TableCell>
                    <TableCell onClick={e => e.stopPropagation()}>
                      <select
                        value={order.status}
                        disabled={updatingId === order.id}
                        onChange={e => handleStatusChange(order.id, e.target.value as Order["status"])}
                        className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 ${STATUS_COLOR[order.status]}`}
                      >
                        {STATUS_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </TableCell>
                    <TableCell>
                      <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${expandedId === order.id ? "rotate-90" : ""}`} />
                    </TableCell>
                  </TableRow>

                  {/* Detalhes expandidos */}
                  {expandedId === order.id && (
                    <TableRow key={`${order.id}-detail`} className="bg-secondary/30 hover:bg-secondary/30">
                      <TableCell colSpan={7} className="p-0">
                        <div className="px-6 py-4 grid sm:grid-cols-2 gap-5">
                          {/* Codigo de rastreio — apenas para pedidos fora da cidade */}
                          {!isLocalOrder(order.shipping_city, order.shipping_state) && (
                          <div className="sm:col-span-2 bg-background border border-border rounded-xl p-4">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                              <Truck className="h-3.5 w-3.5" /> Codigo de rastreio
                            </p>
                            <div className="flex items-center gap-2">
                              <input
                                value={trackingEdits[order.id] ?? order.tracking_code ?? ""}
                                onChange={e => setTrackingEdits(prev => ({ ...prev, [order.id]: e.target.value }))}
                                onKeyDown={e => e.key === "Enter" && handleSaveTracking(order.id)}
                                placeholder="Ex: BR123456789BR, JD014600152BR..."
                                className="flex-1 border border-border rounded-lg px-3 py-2 text-sm bg-secondary focus:outline-none focus:border-foreground font-mono"
                              />
                              <Button
                                size="sm"
                                className="gap-1.5 shrink-0"
                                disabled={savingTracking === order.id}
                                onClick={() => handleSaveTracking(order.id)}
                              >
                                <Save className="h-3.5 w-3.5" />
                                {savingTracking === order.id ? "Salvando..." : "Salvar"}
                              </Button>
                            </div>
                            {order.tracking_code && !(order.id in trackingEdits) && (
                              <div className="mt-2 flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">Link para o cliente:</span>
                                <a
                                  href={`https://rastreamento.correios.com.br/app/resultado.app?objetos=${order.tracking_code}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-foreground font-medium hover:underline flex items-center gap-1"
                                >
                                  <LinkIcon className="h-3 w-3" />
                                  Abrir rastreamento
                                </a>
                              </div>
                            )}
                            {!order.tracking_code && (
                              <p className="text-[11px] text-muted-foreground mt-1.5">
                                Informe o codigo apos postar o pacote nos Correios ou transportadora.
                              </p>
                            )}
                          </div>
                          )}

                          {/* Itens */}
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                              Itens do pedido
                            </p>
                            <ul className="space-y-2">
                              {(order.order_items ?? []).map(item => (
                                <li key={item.id} className="flex items-center gap-2">
                                  <div className="w-8 h-8 bg-background rounded border border-border shrink-0 overflow-hidden">
                                    <img src={item.product_image} alt={item.product_name}
                                      className="w-full h-full object-contain p-0.5"
                                      onError={e => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium truncate">{item.product_name}</p>
                                    <p className="text-[11px] text-muted-foreground">{item.quantity}x {fmt(Number(item.unit_price))}</p>
                                  </div>
                                  <p className="text-xs font-semibold shrink-0">{fmt(Number(item.total))}</p>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Entrega + Contato */}
                          <div className="space-y-4">
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                                Entrega
                              </p>
                              <p className="text-xs text-foreground">
                                {order.shipping_address}, {order.shipping_number}
                                {order.shipping_complement ? `, ${order.shipping_complement}` : ""}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {order.shipping_neighborhood ? `${order.shipping_neighborhood} · ` : ""}
                                {order.shipping_city}/{order.shipping_state} · CEP {order.shipping_cep}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                                Contato
                              </p>
                              <p className="text-xs text-foreground">{order.customer_phone}</p>
                              <p className="text-xs text-muted-foreground">CPF: {order.customer_cpf}</p>
                            </div>
                          </div>

                          {/* ── Resumo financeiro ── */}
                          <div className="sm:col-span-2 bg-background border border-border rounded-xl overflow-hidden">
                            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                <DollarSign className="h-3.5 w-3.5" /> Resumo financeiro
                              </p>
                              {/* Forma de pagamento em destaque */}
                              <div className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-secondary text-foreground">
                                {order.payment_method === "pix"    ? <Smartphone className="h-3 w-3" /> :
                                 order.payment_method === "boleto" ? <FileDown className="h-3 w-3" /> :
                                 <CreditCard className="h-3 w-3" />}
                                {order.payment_method === "pix"    ? "PIX" :
                                 order.payment_method === "boleto" ? "Boleto" :
                                 order.payment_installments > 1
                                   ? `Cartão ${order.payment_installments}x de ${fmt(Number(order.total) / order.payment_installments)}`
                                   : "Cartão à vista"}
                              </div>
                            </div>

                            <div className="px-4 py-3 grid sm:grid-cols-2 gap-x-8 gap-y-0.5">
                              {/* Coluna esquerda — cálculo */}
                              <div className="space-y-1.5">
                                <div className="flex justify-between text-xs text-muted-foreground">
                                  <span>Subtotal</span>
                                  <span>{fmt(Number(order.subtotal))}</span>
                                </div>
                                {Number(order.discount) > 0 && (
                                  <div className="flex justify-between text-xs text-foreground">
                                    <span>
                                      Desconto
                                      {order.cupom_codigo && (
                                        <span className="ml-1.5 bg-secondary text-foreground text-[10px] font-bold px-1.5 py-0.5 rounded uppercase">
                                          {order.cupom_codigo}
                                        </span>
                                      )}
                                    </span>
                                    <span>-{fmt(Number(order.discount))}</span>
                                  </div>
                                )}
                                {Number(order.shipping_cost) > 0 ? (
                                  <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>Frete</span>
                                    <span>{fmt(Number(order.shipping_cost))}</span>
                                  </div>
                                ) : (
                                  <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>Frete</span>
                                    <span>Grátis</span>
                                  </div>
                                )}
                                <div className="flex justify-between text-sm font-bold text-foreground border-t border-border pt-2 mt-1">
                                  <span>Total</span>
                                  <span>{fmt(Number(order.total))}</span>
                                </div>
                                {order.payment_installments > 1 && (
                                  <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>{order.payment_installments}x de</span>
                                    <span className="font-medium">{fmt(Number(order.total) / order.payment_installments)}</span>
                                  </div>
                                )}
                              </div>

                              {/* Coluna direita — informações extras */}
                              <div className="space-y-1.5 mt-3 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-t-0 sm:border-l border-border sm:pl-8">
                                {order.vendedor_nome && (
                                  <div className="flex items-center gap-2 text-xs">
                                    <span className="text-muted-foreground w-16 shrink-0">Vendedor</span>
                                    <span className="font-medium text-foreground">{order.vendedor_nome}</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="text-muted-foreground w-16 shrink-0">Canal</span>
                                  <span className="font-medium text-foreground">
                                    {order.vendedor_nome ? "PDV — Presencial" : "Loja Online"}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="text-muted-foreground w-16 shrink-0">Status</span>
                                  <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[order.status]}`}>
                                    <StatusIcon status={order.status} />
                                    {STATUS_LABEL[order.status]}
                                  </span>
                                </div>
                                {order.cupom_codigo && !Number(order.discount) && (
                                  <div className="flex items-center gap-2 text-xs">
                                    <span className="text-muted-foreground w-16 shrink-0">Cupom</span>
                                    <span className="bg-secondary text-foreground text-[10px] font-bold px-1.5 py-0.5 rounded uppercase">{order.cupom_codigo}</span>
                                  </div>
                                )}
                                {(order as Order & { observacoes?: string | null }).observacoes && (
                                  <div className="flex items-start gap-2 text-xs mt-1">
                                    <span className="text-muted-foreground w-16 shrink-0 pt-0.5">Obs.</span>
                                    <span className="text-foreground italic leading-relaxed">
                                      {(order as Order & { observacoes?: string | null }).observacoes}
                                    </span>
                                  </div>
                                )}
                                {/* Botões de pagamento MP */}
                                {order.payment_code && (
                                  <div className="pt-3 border-t border-border mt-2 flex flex-col gap-2">
                                    {/* Verificar status */}
                                    {order.status === "pending" && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="gap-1.5 w-full"
                                        disabled={checkingId === order.id}
                                        onClick={() => handleCheckStatus(order)}
                                      >
                                        <RefreshCw className={`h-3.5 w-3.5 ${checkingId === order.id ? "animate-spin" : ""}`} />
                                        {checkingId === order.id ? "Verificando..." : "Verificar pagamento"}
                                      </Button>
                                    )}
                                    {/* Estornar */}
                                    {order.status !== "cancelled" && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="gap-1.5 text-destructive border-destructive/40 hover:bg-destructive/10 w-full"
                                        disabled={refundingId === order.id}
                                        onClick={() => setRefundConfirm(order)}
                                      >
                                        <RotateCcw className="h-3.5 w-3.5" />
                                        {refundingId === order.id ? "Estornando..." : "Estornar pagamento"}
                                      </Button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* ── Dialog de confirmação de estorno ── */}
      <AlertDialog open={!!refundConfirm} onOpenChange={open => { if (!open) setRefundConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar estorno</AlertDialogTitle>
            <AlertDialogDescription>
              Isso irá estornar <strong>R$ {Number(refundConfirm?.total ?? 0).toFixed(2).replace(".", ",")}</strong> do pedido <strong>{refundConfirm?.order_number}</strong> diretamente via Mercado Pago e cancelar o pedido. Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => refundConfirm && handleRefund(refundConfirm)}
            >
              Sim, estornar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─── Aba de Produtos ──────────────────────────────────────────────────────────
function ProductsTab({ isActive }: { isActive: boolean }) {
  const [products, setProducts]             = useState<AdminProduct[]>([]);
  const [search, setSearch]                 = useState("");
  const [loading, setLoading]               = useState(false);
  const [loadError, setLoadError]           = useState<string | null>(null);
  const loaded = useRef(false);
  const [dialogOpen, setDialogOpen]         = useState(false);
  const [editingProduct, setEditingProduct] = useState<AdminProduct | undefined>();
  const [deleteTarget, setDeleteTarget]     = useState<AdminProduct | undefined>();
  const [filterOpen,      setFilterOpen]      = useState(false);
  const [filterStatus,    setFilterStatus]    = useState<"todos" | "ativo" | "inativo">("todos");
  const [filterEstoque,   setFilterEstoque]   = useState<"todos" | "com" | "sem" | "baixo">("todos");
  const [filterCategoria, setFilterCategoria] = useState("");

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchAllProducts();
      setProducts(data as AdminProduct[]);
      loaded.current = true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao carregar produtos";
      setLoadError(msg);
      toast.error(msg);
    }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (isActive && !loaded.current) loadProducts();
  }, [isActive, loadProducts]);

  async function handleToggleActive(p: AdminProduct) {
    try {
      await toggleProductActive(p.id, !p.isActive);
      setProducts(prev => prev.map(x => x.id === p.id ? { ...x, isActive: !p.isActive } : x));
      toast.success(!p.isActive ? "Produto ativado" : "Produto desativado");
    } catch { toast.error("Erro ao alterar status"); }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteProduct(deleteTarget.id);
      setProducts(prev => prev.filter(x => x.id !== deleteTarget.id));
      toast.success("Produto excluído");
    } catch { toast.error("Erro ao excluir produto"); }
    finally { setDeleteTarget(undefined); }
  }

  const categorias = useMemo(
    () => [...new Set(products.map(p => p.category))].sort(),
    [products],
  );

  const activeFilters =
    (filterStatus    !== "todos" ? 1 : 0) +
    (filterEstoque   !== "todos" ? 1 : 0) +
    (filterCategoria              ? 1 : 0);

  const filtered = products.filter(p => {
    if (search.trim() && !(
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.brand.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase())
    )) return false;
    if (filterStatus === "ativo"   && !p.isActive) return false;
    if (filterStatus === "inativo" &&  p.isActive) return false;
    if (filterEstoque === "com"   && !(p.stock === null || p.stock > 0))                     return false;
    if (filterEstoque === "sem"   && !(p.stock !== null && p.stock === 0))                   return false;
    if (filterEstoque === "baixo" && !(p.stock !== null && p.stock > 0 && p.stock <= 5))     return false;
    if (filterCategoria && p.category !== filterCategoria) return false;
    return true;
  });

  const chipCls = (active: boolean) =>
    `px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
      active
        ? "bg-foreground text-background border-foreground"
        : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
    }`;

  return (
    <>
      {/* ── Toolbar ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar produto, marca..." className="pl-9" />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Botão filtros */}
        <button
          onClick={() => setFilterOpen(o => !o)}
          className={`flex items-center gap-1.5 px-3 h-10 rounded-lg border text-sm font-medium transition-colors shrink-0 ${
            filterOpen || activeFilters > 0
              ? "border-foreground/40 text-foreground bg-secondary"
              : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
          }`}>
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Filtros</span>
          {activeFilters > 0 && (
            <span className="flex items-center justify-center w-4 h-4 rounded-full bg-foreground text-background text-[10px] font-bold leading-none">
              {activeFilters}
            </span>
          )}
        </button>

        <p className="text-sm text-muted-foreground whitespace-nowrap hidden sm:block">
          {filtered.length} produto{filtered.length !== 1 ? "s" : ""}
        </p>
        <Button onClick={() => { setEditingProduct(undefined); setDialogOpen(true); }} className="gap-1.5 shrink-0">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Novo produto</span>
        </Button>
      </div>

      {/* ── Painel de filtros ───────────────────────────────────── */}
      {filterOpen && (
        <div className="mb-4 border border-border rounded-xl p-4 space-y-4 bg-background">

          {/* Status */}
          <div className="space-y-2">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Status</p>
            <div className="flex gap-2">
              {(["todos", "ativo", "inativo"] as const).map(v => (
                <button key={v} onClick={() => setFilterStatus(v)} className={chipCls(filterStatus === v)}>
                  {v === "todos" ? "Todos" : v === "ativo" ? "Ativos" : "Inativos"}
                </button>
              ))}
            </div>
          </div>

          {/* Estoque */}
          <div className="space-y-2">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Estoque</p>
            <div className="flex flex-wrap gap-2">
              {([
                { id: "todos", label: "Todos"         },
                { id: "com",   label: "Com estoque"   },
                { id: "sem",   label: "Sem estoque"   },
                { id: "baixo", label: "Estoque baixo" },
              ] as const).map(({ id, label }) => (
                <button key={id} onClick={() => setFilterEstoque(id)} className={chipCls(filterEstoque === id)}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Categoria */}
          {categorias.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Categoria</p>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setFilterCategoria("")} className={chipCls(!filterCategoria)}>
                  Todas
                </button>
                {categorias.map(cat => (
                  <button key={cat} onClick={() => setFilterCategoria(cat)} className={chipCls(filterCategoria === cat)}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Limpar */}
          {activeFilters > 0 && (
            <button
              onClick={() => { setFilterStatus("todos"); setFilterEstoque("todos"); setFilterCategoria(""); }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors underline-offset-2 hover:underline">
              Limpar filtros
            </button>
          )}
        </div>
      )}

      <div className="bg-background rounded-xl border border-border overflow-hidden">
        {loading ? (
          /* ── skeleton ─ */
          <div className="divide-y divide-border">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
                <div className="w-11 h-11 rounded-lg bg-muted shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-muted rounded w-2/3" />
                  <div className="h-2.5 bg-muted rounded w-1/3" />
                </div>
                <div className="h-3 bg-muted rounded w-16 shrink-0" />
              </div>
            ))}
          </div>
        ) : loadError ? (
          <div className="p-12 text-center space-y-3">
            <p className="text-destructive font-medium">{loadError}</p>
            <Button variant="outline" size="sm" onClick={loadProducts}>Tentar novamente</Button>
          </div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            Nenhum produto. <button onClick={() => setDialogOpen(true)} className="text-foreground underline">Criar agora</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            Nenhum resultado para &quot;{search}&quot;
          </div>
        ) : (
          <>
            {/* ── MOBILE: lista de cards ──────────────────────────── */}
            <ul className="sm:hidden divide-y divide-border">
              {filtered.map(p => (
                <li key={p.id} className="flex items-center gap-3 px-3 py-3">
                  {/* thumb */}
                  <img
                    src={p.image || "/placeholder.svg"}
                    alt={p.name}
                    className="w-11 h-11 rounded-lg object-cover bg-secondary shrink-0"
                    onError={e => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }}
                  />
                  {/* info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate leading-tight">{p.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{p.brand}</p>
                  </div>
                  {/* preço */}
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold">{fmt(p.price)}</p>
                    {p.discount > 0 && <p className="text-[10px] text-muted-foreground font-medium">-{p.discount}%</p>}
                  </div>
                  {/* toggle */}
                  <Switch checked={p.isActive} onCheckedChange={() => handleToggleActive(p)} className="shrink-0" />
                  {/* ações */}
                  <div className="flex shrink-0">
                    <button onClick={() => { setEditingProduct(p); setDialogOpen(true); }}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => setDeleteTarget(p)}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            {/* ── DESKTOP: tabela ─────────────────────────────────── */}
            <div className="hidden sm:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Foto</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead className="hidden md:table-cell">Categoria</TableHead>
                    <TableHead className="hidden lg:table-cell">Seções</TableHead>
                    <TableHead>Preço</TableHead>
                    <TableHead className="hidden md:table-cell">Estoque</TableHead>
                    <TableHead>Ativo</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(p => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <img src={p.image || "/placeholder.svg"} alt={p.name}
                          className="w-11 h-11 object-cover rounded-lg bg-secondary"
                          onError={e => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }} />
                      </TableCell>
                      <TableCell className="max-w-[180px]">
                        <p className="font-medium truncate">{p.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{p.brand} · {p.quantity}</p>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="outline" className="capitalize text-xs">{p.category}</Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell max-w-[140px]">
                        <div className="flex flex-wrap gap-1">
                          {p.sections.length === 0
                            ? <span className="text-xs text-muted-foreground">—</span>
                            : p.sections.slice(0, 2).map(s => <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>)}
                          {p.sections.length > 2 && <Badge variant="secondary" className="text-xs">+{p.sections.length - 2}</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-semibold whitespace-nowrap">{fmt(p.price)}</p>
                        {p.discount > 0 && <p className="text-xs text-muted-foreground">-{p.discount}%</p>}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {p.stock === null ? (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Package className="h-3.5 w-3.5" /> Livre
                          </span>
                        ) : p.stock === 0 ? (
                          <Badge variant="outline" className="text-xs text-muted-foreground border-border">Sem estoque</Badge>
                        ) : p.stock <= 5 ? (
                          <Badge variant="outline" className="text-xs text-foreground border-border">{p.stock} rest.</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs text-foreground border-border">{p.stock} un.</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Switch checked={p.isActive} onCheckedChange={() => handleToggleActive(p)} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => { setEditingProduct(p); setDialogOpen(true); }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(p)} className="text-muted-foreground hover:text-foreground">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingProduct ? "Editar produto" : "Novo produto"}</DialogTitle>
          </DialogHeader>
          <AdminProductForm
            product={editingProduct}
            onSuccess={() => { setDialogOpen(false); toast.success(editingProduct ? "Produto atualizado!" : "Produto criado!"); loadProducts(); }}
            onCancel={() => setDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={o => !o && setDeleteTarget(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir produto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. <strong>{deleteTarget?.name}</strong> será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-foreground text-background hover:bg-foreground/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─── Aba de Seções ────────────────────────────────────────────────────────────
type SectionProduct = { id: string; name: string; brand: string; image: string; isActive: boolean; sections: string[] };

function SectionsTab({ isActive }: { isActive: boolean }) {
  const [sections, setSections]         = useState<Section[]>([]);
  const [loading, setLoading]           = useState(false);
  const loaded = useRef(false);
  const [newName, setNewName]           = useState("");
  const [adding, setAdding]             = useState(false);
  const [editingId, setEditingId]       = useState<string | null>(null);
  const [editingName, setEditingName]   = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Section | undefined>();

  // ── Product picker ─────────────────────────────────────────────────────────
  const [pickerSection,  setPickerSection]  = useState<Section | null>(null);
  const [allProducts,    setAllProducts]    = useState<SectionProduct[]>([]);
  const [pickedIds,      setPickedIds]      = useState<Set<string>>(new Set());
  const [originalIds,    setOriginalIds]    = useState<Set<string>>(new Set());
  const [loadingProds,   setLoadingProds]   = useState(false);
  const [savingProds,    setSavingProds]    = useState(false);
  const [prodSearch,     setProdSearch]     = useState("");

  const filteredProds = useMemo(() => {
    const q = prodSearch.toLowerCase();
    const inSection  = allProducts.filter(p => pickedIds.has(p.id) && (!q || p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q)));
    const outSection = allProducts.filter(p => !pickedIds.has(p.id) && (!q || p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q)));
    return [...inSection, ...outSection];
  }, [allProducts, pickedIds, prodSearch]);

  async function openPicker(section: Section) {
    setPickerSection(section);
    setProdSearch("");
    setLoadingProds(true);
    try {
      const prods = await fetchAllProducts() as SectionProduct[];
      setAllProducts(prods);
      const ids = new Set(prods.filter(p => p.sections.includes(section.name)).map(p => p.id));
      setPickedIds(ids);
      setOriginalIds(new Set(ids));
    } catch { toast.error("Erro ao carregar produtos"); }
    finally { setLoadingProds(false); }
  }

  function togglePicked(id: string) {
    setPickedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function savePicker() {
    if (!pickerSection) return;
    setSavingProds(true);
    try {
      const changed = allProducts.filter(p => originalIds.has(p.id) !== pickedIds.has(p.id));
      await Promise.all(changed.map(p => {
        const newSections = pickedIds.has(p.id)
          ? [...p.sections, pickerSection.name]
          : p.sections.filter(s => s !== pickerSection.name);
        return updateProduct(p.id, { sections: newSections });
      }));
      toast.success(`${changed.length} produto(s) atualizado(s)!`);
      setPickerSection(null);
    } catch { toast.error("Erro ao salvar produtos"); }
    finally { setSavingProds(false); }
  }

  const loadSections = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAllSections();
      setSections(data);
      loaded.current = true;
    } catch { toast.error("Erro ao carregar seções"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (isActive && !loaded.current) loadSections();
  }, [isActive, loadSections]);

  async function handleAdd() {
    const name = newName.trim();
    if (!name) return;
    setAdding(true);
    try {
      const maxOrder = sections.reduce((m, s) => Math.max(m, s.displayOrder), -1);
      const created  = await createSection(name, maxOrder + 1);
      setSections(prev => [...prev, created]);
      setNewName("");
      toast.success("Seção criada!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar seção");
    } finally { setAdding(false); }
  }

  async function handleRename(id: string) {
    const name = editingName.trim();
    if (!name) return;
    try {
      const updated = await updateSection(id, { name });
      setSections(prev => prev.map(s => s.id === id ? updated : s));
      setEditingId(null);
      toast.success("Seção renomeada!");
    } catch { toast.error("Erro ao renomear"); }
  }

  async function handleToggle(section: Section) {
    try {
      await toggleSectionActive(section.id, !section.isActive);
      setSections(prev => prev.map(s => s.id === section.id ? { ...s, isActive: !section.isActive } : s));
      toast.success(!section.isActive ? "Seção ativada" : "Seção desativada");
    } catch { toast.error("Erro ao alterar status"); }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteSection(deleteTarget.id);
      setSections(prev => prev.filter(s => s.id !== deleteTarget.id));
      toast.success("Seção excluída!");
    } catch { toast.error("Erro ao excluir"); }
    finally { setDeleteTarget(undefined); }
  }

  async function move(index: number, dir: "up" | "down") {
    const swapIndex = dir === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= sections.length) return;
    const updated = [...sections];
    [updated[index], updated[swapIndex]] = [updated[swapIndex], updated[index]];
    const reordered = updated.map((s, i) => ({ ...s, displayOrder: i }));
    setSections(reordered);
    try {
      await reorderSections(reordered.map(s => ({ id: s.id, displayOrder: s.displayOrder })));
    } catch { toast.error("Erro ao reordenar"); loadSections(); }
  }

  return (
    <>
      {/* ── Criar nova seção ─────────────────────────────────── */}
      <div className="flex gap-2 mb-4">
        <Input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="Nome da nova seção..."
          onKeyDown={e => e.key === "Enter" && handleAdd()}
          className="flex-1"
        />
        <Button onClick={handleAdd} disabled={adding || !newName.trim()} className="gap-1.5 shrink-0">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">{adding ? "Criando..." : "Criar seção"}</span>
        </Button>
      </div>

      {loading ? (
        <div className="bg-background rounded-xl border border-border overflow-hidden divide-y divide-border">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
              <div className="h-3 bg-muted rounded w-1/2" />
              <div className="ml-auto h-5 w-10 bg-muted rounded-full" />
            </div>
          ))}
        </div>
      ) : sections.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">Nenhuma seção cadastrada.</div>
      ) : (
        <div className="bg-background rounded-xl border border-border overflow-hidden">
          <ul className="divide-y divide-border">
            {sections.map((section, index) => (
              <li key={section.id} className="flex items-center gap-2 px-3 py-3">
                {/* reorder */}
                <div className="flex flex-col shrink-0">
                  <button onClick={() => move(index, "up")} disabled={index === 0}
                    className="p-0.5 rounded hover:bg-secondary disabled:opacity-25 transition-colors">
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button onClick={() => move(index, "down")} disabled={index === sections.length - 1}
                    className="p-0.5 rounded hover:bg-secondary disabled:opacity-25 transition-colors">
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>

                {/* nome / edição */}
                <div className="flex-1 min-w-0">
                  {editingId === section.id ? (
                    <div className="flex items-center gap-1.5">
                      <Input value={editingName} onChange={e => setEditingName(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") handleRename(section.id); if (e.key === "Escape") setEditingId(null); }}
                        autoFocus className="h-8 text-sm flex-1 min-w-0" />
                      <Button size="sm" onClick={() => handleRename(section.id)} className="shrink-0">Salvar</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="shrink-0">✕</Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-medium text-sm truncate">{section.name}</span>
                      {!section.isActive && <Badge variant="secondary" className="text-xs shrink-0">inativa</Badge>}
                    </div>
                  )}
                </div>

                {/* toggle */}
                <Switch checked={section.isActive} onCheckedChange={() => handleToggle(section)} className="shrink-0" />

                {/* ações */}
                <div className="flex shrink-0">
                  <button onClick={() => openPicker(section)} title="Produtos da seção"
                    className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                    <LayoutList className="h-4 w-4" />
                  </button>
                  <button onClick={() => { setEditingId(section.id); setEditingName(section.name); }}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => setDeleteTarget(section)}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={o => !o && setDeleteTarget(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir seção?</AlertDialogTitle>
            <AlertDialogDescription>
              A seção <strong>{deleteTarget?.name}</strong> será removida. Os produtos que estavam nela não serão excluídos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-foreground text-background hover:bg-foreground/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Product picker dialog ─────────────────────────────────────────── */}
      <Dialog open={Boolean(pickerSection)} onOpenChange={o => !o && setPickerSection(null)}>
        <DialogContent className="max-w-4xl w-full flex flex-col gap-0 p-0 max-h-[92vh]">

          {/* Header */}
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
            <DialogTitle className="text-xl font-semibold tracking-tight">
              {pickerSection?.name}
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-0.5">
              Selecione os produtos que aparecerão nesta seção do carrossel
            </p>
          </DialogHeader>

          {/* Search */}
          <div className="px-6 py-4 border-b border-border shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                value={prodSearch}
                onChange={e => setProdSearch(e.target.value)}
                placeholder="Buscar por nome ou marca..."
                className="pl-10 h-10 text-sm"
              />
              {prodSearch && (
                <button
                  onClick={() => setProdSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Product grid */}
          <div className="flex-1 overflow-y-auto px-6 py-5 min-h-0">
            {loadingProds ? (
              <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
                <div className="h-7 w-7 border-[3px] border-current border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">Carregando produtos...</span>
              </div>
            ) : filteredProds.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 gap-2 text-muted-foreground">
                <Package className="h-10 w-10 opacity-20" />
                <p className="text-sm">Nenhum produto encontrado.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {filteredProds.map(p => {
                  const checked = pickedIds.has(p.id);
                  return (
                    <div
                      key={p.id}
                      onClick={() => togglePicked(p.id)}
                      className={`
                        relative rounded-xl overflow-hidden border-2 cursor-pointer
                        transition-all duration-150 select-none
                        ${checked
                          ? "border-foreground shadow-md shadow-primary/10"
                          : "border-border hover:border-muted-foreground/50 hover:shadow-sm"}
                      `}
                    >
                      {/* Checkmark badge */}
                      <div className={`
                        absolute top-2 right-2 z-10 h-6 w-6 rounded-full flex items-center justify-center
                        transition-all duration-150 border-2
                        ${checked
                          ? "bg-foreground border-foreground text-background scale-100"
                          : "bg-background/80 border-border text-transparent scale-90"}
                      `}>
                        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                      </div>

                      {/* Product image */}
                      <div className="aspect-[3/4] bg-muted overflow-hidden">
                        <img
                          src={p.image}
                          alt={p.name}
                          className={`w-full h-full object-cover transition-transform duration-200 ${checked ? "scale-105" : "hover:scale-103"}`}
                          onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }}
                        />
                      </div>

                      {/* Product info */}
                      <div className={`px-2.5 py-2.5 transition-colors ${checked ? "bg-foreground/5" : "bg-background"}`}>
                        <p className="text-xs font-semibold leading-snug line-clamp-2 mb-0.5">{p.name}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide truncate">{p.brand}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-border flex items-center justify-between shrink-0">
            <p className="text-sm text-muted-foreground">
              <span className="text-foreground font-semibold">{pickedIds.size}</span>
              {" "}de{" "}
              <span className="text-foreground font-semibold">{allProducts.length}</span>
              {" "}produto{allProducts.length !== 1 ? "s" : ""} selecionado{pickedIds.size !== 1 ? "s" : ""}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPickerSection(null)} disabled={savingProds}>
                Cancelar
              </Button>
              <Button onClick={savePicker} disabled={savingProds || loadingProds}>
                {savingProds ? "Salvando..." : "Salvar alterações"}
              </Button>
            </div>
          </div>

        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Aba de Banners ───────────────────────────────────────────────────────────
function BannersTab({ isActive }: { isActive: boolean }) {
  const [banners, setBanners]           = useState<Banner[]>([]);
  const [loading, setLoading]           = useState(false);
  const loaded = useRef(false);
  const [uploading, setUploading]       = useState(false);
  const [uploadError, setUploadError]   = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Banner | undefined>();
  const fileInputRef                    = useRef<HTMLInputElement>(null);

  const loadBanners = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAllBanners();
      setBanners(data);
      loaded.current = true;
    } catch { toast.error("Erro ao carregar banners"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (isActive && !loaded.current) loadBanners();
  }, [isActive, loadBanners]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    const { ok, w, h } = await validateBannerResolution(file);
    if (!ok) {
      setUploadError(`Resolução inválida: ${w}×${h}px. O banner deve ter exatamente 1200×400px.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setUploading(true);
    try {
      await uploadBanner(file);
      toast.success("Banner enviado com sucesso!");
      loadBanners();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar banner");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleToggleActive(banner: Banner) {
    try {
      await toggleBannerActive(banner.id, !banner.isActive);
      setBanners(prev => prev.map(b => b.id === banner.id ? { ...b, isActive: !banner.isActive } : b));
      toast.success(!banner.isActive ? "Banner ativado" : "Banner desativado");
    } catch { toast.error("Erro ao alterar status"); }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteBanner(deleteTarget.id, deleteTarget.fileName);
      setBanners(prev => prev.filter(b => b.id !== deleteTarget.id));
      toast.success("Banner excluído!");
    } catch { toast.error("Erro ao excluir banner"); }
    finally { setDeleteTarget(undefined); }
  }

  async function handleExport(banner: Banner) {
    try {
      const res  = await fetch(banner.url);
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = banner.fileName || "banner.png";
      a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error("Erro ao exportar banner"); }
  }

  async function move(index: number, dir: "up" | "down") {
    const swapIndex = dir === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= banners.length) return;
    const updated = [...banners];
    [updated[index], updated[swapIndex]] = [updated[swapIndex], updated[index]];
    const reordered = updated.map((b, i) => ({ ...b, displayOrder: i }));
    setBanners(reordered);
    try {
      await reorderBanners(reordered.map(b => ({ id: b.id, displayOrder: b.displayOrder })));
    } catch { toast.error("Erro ao reordenar"); loadBanners(); }
  }

  return (
    <>
      <div className="mb-8">
        <h3 className="text-base font-semibold mb-1">Enviar novo banner</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Resolução obrigatória: <strong>1200 × 400 px</strong> · Formatos: PNG, JPG ou WebP
        </p>
        <label className={`inline-flex items-center gap-2 cursor-pointer px-5 py-2.5 rounded-lg border-2 border-dashed transition-colors select-none ${
          uploading
            ? "border-foreground/40 bg-foreground/5 pointer-events-none text-muted-foreground"
            : "border-border hover:border-foreground hover:bg-foreground/5 text-foreground"
        }`}>
          <ImageIcon className="h-5 w-5 shrink-0" />
          <span className="text-sm font-medium">{uploading ? "Enviando..." : "Selecionar imagem"}</span>
          <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp"
            className="hidden" onChange={handleFileChange} disabled={uploading} />
        </label>
        {uploadError && (
          <div className="mt-3 flex items-start gap-2 bg-destructive/10 text-destructive rounded-lg px-4 py-3 text-sm max-w-md">
            <X className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-background rounded-xl border border-border flex items-center gap-4 p-3">
              <div className="w-40 h-[53px] bg-muted animate-pulse rounded-lg shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted animate-pulse rounded w-48" />
                <div className="h-3 bg-muted animate-pulse rounded w-24" />
              </div>
            </div>
          ))}
        </div>
      ) : banners.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">Nenhum banner cadastrado. Envie o primeiro acima.</div>
      ) : (
        <div className="grid gap-3">
          {banners.map((banner, index) => (
            <div key={banner.id} className={`bg-background rounded-xl border border-border flex items-center gap-4 p-3 transition-opacity ${!banner.isActive ? "opacity-50" : ""}`}>
              <div className="flex flex-col gap-0.5 shrink-0">
                <button onClick={() => move(index, "up")} disabled={index === 0}
                  className="p-1 rounded hover:bg-secondary disabled:opacity-30 transition-colors">
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button onClick={() => move(index, "down")} disabled={index === banners.length - 1}
                  className="p-1 rounded hover:bg-secondary disabled:opacity-30 transition-colors">
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
              <div className="shrink-0 w-40 h-[53px] rounded-lg overflow-hidden bg-secondary">
                <img src={banner.url} alt={`Banner ${index + 1}`} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{banner.fileName}</p>
                <p className="text-xs text-muted-foreground">
                  Posição {banner.displayOrder + 1}
                  {!banner.isActive && <Badge variant="secondary" className="text-xs ml-2">Inativo</Badge>}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    {banner.isActive ? "Ativo" : "Inativo"}
                  </span>
                  <Switch checked={banner.isActive} onCheckedChange={() => handleToggleActive(banner)} />
                </div>
                <Button variant="outline" size="icon" title="Exportar" onClick={() => handleExport(banner)}>
                  <Download className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" title="Excluir" onClick={() => setDeleteTarget(banner)}
                  className="text-muted-foreground hover:text-foreground">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={o => !o && setDeleteTarget(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir banner?</AlertDialogTitle>
            <AlertDialogDescription>
              O arquivo <strong>{deleteTarget?.fileName}</strong> será removido permanentemente do storage e do banco de dados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-foreground text-background hover:bg-foreground/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─── PDV: Nova Venda ──────────────────────────────────────────────────────────
function PDVTab({ isActive }: { isActive: boolean }) {
  const [search,          setSearch]          = useState("");
  const [allProducts,     setAllProducts]     = useState<AdminProduct[]>([]);
  const [colaboradores,   setColaboradores]   = useState<Colaborador[]>([]);
  const [cart,            setCart]            = useState<CartItem[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [custName,        setCustName]        = useState("");
  const [custPhone,       setCustPhone]       = useState("");
  const [custCPF,         setCustCPF]         = useState("");
  const [vendedor,        setVendedor]        = useState("");
  const [payMethod,       setPayMethod]       = useState<"dinheiro" | "cartao" | "pix">("dinheiro");
  const [discountPct,     setDiscountPct]     = useState("");
  const [submitting,      setSubmitting]      = useState(false);
  const [successNum,      setSuccessNum]      = useState<string | null>(null);
  const [valorRecebido,   setValorRecebido]   = useState<string>("");
  const [lastReceipt,     setLastReceipt]     = useState<ReceiptData | null>(null);
  const [parcelas,        setParcelas]        = useState(1);
  const [observacoes,     setObservacoes]     = useState("");
  const [cfgCartao,       setCfgCartao]       = useState<ConfigCartao>({ taxa_pct: 2.5, parcelas_max: 6, juros_a_partir_de: 2 });
  const [sizePickerProduct, setSizePickerProduct] = useState<AdminProduct | null>(null);
  const [pickedSize,      setPickedSize]      = useState<string | null>(null);
  const loaded = useRef(false);

  const loadProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const [prodData, colabData, appCfg] = await Promise.all([
        fetchAllProducts(),
        fetchColaboradores(),
        fetchConfig(),
      ]);
      setAllProducts(prodData.filter(p => p.isActive));
      setColaboradores(colabData.filter(c => c.ativo));
      setCfgCartao(appCfg.cartao);
      loaded.current = true;
    } catch { toast.error("Erro ao carregar produtos"); }
    finally { setLoadingProducts(false); }
  }, []);

  useEffect(() => {
    if (isActive && !loaded.current) loadProducts();
  }, [isActive, loadProducts]);

  const filtered = allProducts.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.brand.toLowerCase().includes(search.toLowerCase()),
  );

  function addToCart(product: AdminProduct) {
    const sizes = pdvParseSizes(product.quantity);
    if (sizes.length > 0) {
      // Has sizes — open the size picker dialog
      setPickedSize(null);
      setSizePickerProduct(product);
      return;
    }
    const stockDisp = product.stock ?? 0;
    if (product.stock !== null && stockDisp === 0) {
      toast.warning("Produto sem estoque.");
      return;
    }
    const key = pdvCartKey(product.id, null);
    setCart(prev => {
      const found = prev.find(i => i.cartKey === key);
      if (found) {
        if (product.stock !== null && found.qty >= stockDisp) {
          toast.warning(`Estoque máximo atingido (${stockDisp} un.)`);
          return prev;
        }
        return prev.map(i => i.cartKey === key ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { product, qty: 1, selectedSize: null, cartKey: key }];
    });
  }

  function addToCartWithSize(product: AdminProduct, size: string) {
    const stockDisp = pdvSizeStock(product, size);
    if (stockDisp === 0) {
      toast.warning(`Tamanho ${size} sem estoque.`);
      return;
    }
    const key = pdvCartKey(product.id, size);
    setCart(prev => {
      const found = prev.find(i => i.cartKey === key);
      if (found) {
        if (found.qty >= stockDisp) {
          toast.warning(`Estoque máximo atingido (${stockDisp} un.)`);
          return prev;
        }
        return prev.map(i => i.cartKey === key ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { product, qty: 1, selectedSize: size, cartKey: key }];
    });
    setSizePickerProduct(null);
  }

  function updateQty(cartKey: string, delta: number) {
    setCart(prev => {
      if (delta > 0) {
        const item = prev.find(i => i.cartKey === cartKey);
        if (item) {
          const lim = pdvSizeStock(item.product, item.selectedSize);
          if (item.product.stock !== null && item.qty >= lim) {
            toast.warning(`Estoque máximo atingido (${lim} un.)`);
            return prev;
          }
        }
      }
      return prev
        .map(i => i.cartKey === cartKey ? { ...i, qty: Math.max(0, i.qty + delta) } : i)
        .filter(i => i.qty > 0);
    });
  }

  const subtotal = cart.reduce((s, i) => s + i.product.price * i.qty, 0);
  const discountNum = Math.min(100, Math.max(0, Number(discountPct) || 0));
  const discount = subtotal * (discountNum / 100);
  const total    = subtotal - discount;
  const troco    = payMethod === "dinheiro" && valorRecebido
    ? Math.max(0, Number(valorRecebido) - total)
    : 0;

  // Parcelas com taxa
  const parcelaOpts = calcularParcelas(total, cfgCartao);
  const parcelaSel  = parcelaOpts.find(p => p.parcelas === parcelas) ?? parcelaOpts[0];
  const totalCartao = payMethod === "cartao" && parcelaSel ? parcelaSel.totalFinal : total;

  async function handleSale() {
    if (cart.length === 0) { toast.error("Adicione pelo menos um produto."); return; }
    if (!custName.trim()) { toast.error("Informe o nome do cliente."); return; }

    // Segurança PDV: valor recebido não pode ser menor que o total
    if (payMethod === "dinheiro") {
      const recebido = Number(valorRecebido);
      if (!valorRecebido || isNaN(recebido)) {
        toast.error("Informe o valor recebido do cliente.");
        return;
      }
      if (recebido < total) {
        const falta = (total - recebido).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
        toast.error(`Valor insuficiente — faltam ${falta} para cobrir o total.`);
        return;
      }
    }

    setSubmitting(true);
    setSuccessNum(null);
    setLastReceipt(null);
    const saleItems = cart.map(i => ({
      product_id:       i.product.id,
      product_name:     i.selectedSize
        ? `${i.product.name} — Tam. ${i.selectedSize}`
        : i.product.name,
      product_image:    i.product.image,
      product_brand:    i.product.brand,
      product_quantity: i.selectedSize ?? i.product.quantity,
      unit_price:       i.product.price,
      quantity:         i.qty,
      total:            i.product.price * i.qty,
    }));
    const payMap = { dinheiro: "credit" as const, cartao: "credit" as const, pix: "pix" as const };
    try {
      const result = await createOrder({
        customer_name:        custName.trim(),
        customer_email:       "pdv@atendimento.local",
        customer_cpf:         custCPF  || "000.000.000-00",
        customer_phone:       custPhone || "(00) 00000-0000",
        shipping_cep:         "48000000",
        shipping_address:     "Atendimento Presencial",
        shipping_number:      "S/N",
        shipping_city:        "Alagoinhas",
        shipping_state:       "BA",
        payment_method:       payMap[payMethod],
        payment_installments: payMethod === "cartao" ? parcelas : 1,
        subtotal,
        discount,
        shipping_cost:        0,
        total:                totalCartao,
        vendedor_nome:        vendedor || null,
        observacoes:          observacoes.trim() || null,
        items: saleItems,
      });
      if (result.order) {
        await updateOrderStatus(result.order.id, "delivered");
        setSuccessNum(result.order.order_number);
        setLastReceipt({
          orderNumber:    result.order.order_number,
          customerName:   custName.trim(),
          vendedor:       vendedor || null,
          paymentMethod:  payMethod,
          parcelas:       payMethod === "cartao" ? parcelas : undefined,
          items: cart.map(i => ({
            name:      i.selectedSize ? `${i.product.name} — ${i.selectedSize}` : i.product.name,
            qty:       i.qty,
            unitPrice: i.product.price,
            total:     i.product.price * i.qty,
          })),
          subtotal,
          discount,
          total:         totalCartao,
          troco:         payMethod === "dinheiro" && valorRecebido ? troco : null,
          valorRecebido: payMethod === "dinheiro" && valorRecebido ? Number(valorRecebido) : null,
          date:          new Date(),
        });
        setCart([]);
        setCustName(""); setCustPhone(""); setCustCPF(""); setDiscountPct(0);
        setVendedor(""); setValorRecebido(""); setParcelas(1); setObservacoes("");
        toast.success(`Venda ${result.order.order_number} registrada!`);
      } else {
        toast.error(result.error ?? "Erro ao registrar venda");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao registrar venda");
    } finally { setSubmitting(false); }
  }

  return (
    <div className="grid lg:grid-cols-5 gap-6 h-[calc(100vh-160px)] min-h-[480px]">
      {/* ── Lista de produtos ── */}
      <div className="lg:col-span-3 flex flex-col min-h-0 gap-3">
        <div className="relative shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar produto por nome ou marca..." className="pl-9" />
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        {loadingProducts ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-28 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {filtered.map(p => {
              const hasSizes = pdvParseSizes(p.quantity).length > 0;
              const allSizesOos = hasSizes && p.sizeStock != null &&
                pdvParseSizes(p.quantity).every(s => (p.sizeStock![s] ?? 1) === 0);
              const sem = !hasSizes && p.stock !== null && (p.stock ?? 0) === 0;
              const esgotado = sem || allSizesOos;
              const baixo = !esgotado && !hasSizes && p.stock !== null && (p.stock ?? 0) <= 5;
              return (
                <button key={p.id} onClick={() => addToCart(p)} disabled={esgotado}
                  className={`relative bg-background border rounded-xl p-3 text-left transition-colors group ${
                    esgotado
                      ? "border-border opacity-50 cursor-not-allowed"
                      : "border-border hover:border-foreground"
                  }`}>
                  {esgotado && (
                    <span className="absolute top-1.5 right-1.5 text-[9px] font-bold bg-secondary text-muted-foreground px-1.5 py-0.5 rounded-full">Esgotado</span>
                  )}
                  {baixo && (
                    <span className="absolute top-1.5 right-1.5 text-[9px] font-bold bg-secondary text-foreground px-1.5 py-0.5 rounded-full">Ult. {p.stock}</span>
                  )}
                  {hasSizes && !esgotado && (
                    <span className="absolute top-1.5 right-1.5 text-[9px] font-bold bg-secondary text-foreground px-1.5 py-0.5 rounded-full">Tamanhos</span>
                  )}
                  <img src={p.image || "/placeholder.svg"} alt={p.name}
                    className="w-full h-16 object-cover mb-2 rounded-lg bg-secondary"
                    onError={e => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }} />
                  <p className="text-xs font-semibold line-clamp-2 group-hover:text-foreground leading-snug">{p.name}</p>
                  <p className="text-xs text-foreground font-bold mt-1">{fmt(p.price)}</p>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div className="col-span-3 py-10 text-center text-sm text-muted-foreground">
                {search ? `Nenhum produto para "${search}"` : "Nenhum produto ativo cadastrado"}
              </div>
            )}
          </div>
        )}
        </div>{/* fim scroll container */}
      </div>

      {/* ── Carrinho + Cliente + Pagamento ── */}
      <div className="lg:col-span-2 space-y-4 overflow-y-auto pr-0.5">

        {/* Carrinho */}
        <div className="bg-background border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold text-sm flex items-center gap-1.5">
              <ShoppingCart className="h-4 w-4" /> Carrinho ({cart.reduce((s, i) => s + i.qty, 0)} itens)
            </h3>
            {cart.length > 0 && (
              <button onClick={() => setCart([])}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Limpar
              </button>
            )}
          </div>
          {cart.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Clique em um produto para adicionar
            </div>
          ) : (
            <div className="divide-y divide-border max-h-52 overflow-y-auto">
              {cart.map(item => {
                const lim = pdvSizeStock(item.product, item.selectedSize);
                return (
                  <div key={item.cartKey} className="flex items-center gap-2 px-4 py-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium line-clamp-1">{item.product.name}</p>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1 flex-wrap">
                        {fmt(item.product.price)} × {item.qty}
                        {item.selectedSize && (
                          <span className="font-bold bg-gray-100 text-gray-600 px-1 rounded uppercase text-[9px]">
                            {item.selectedSize}
                          </span>
                        )}
                        {item.product.stock !== null && !item.selectedSize && (
                          <span className={`${item.qty >= lim ? "text-muted-foreground font-medium" : ""}`}>
                            (est. {lim})
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => updateQty(item.cartKey, -1)}
                        className="w-5 h-5 rounded-full border border-border flex items-center justify-center hover:bg-secondary">
                        <Minus className="h-2.5 w-2.5" />
                      </button>
                      <span className="text-xs font-bold w-5 text-center">{item.qty}</span>
                      <button onClick={() => updateQty(item.cartKey, 1)}
                        className="w-5 h-5 rounded-full border border-border flex items-center justify-center hover:bg-secondary">
                        <Plus className="h-2.5 w-2.5" />
                      </button>
                    </div>
                    <p className="text-xs font-bold shrink-0 w-14 text-right">{fmt(item.product.price * item.qty)}</p>
                    <button onClick={() => setCart(prev => prev.filter(i => i.cartKey !== item.cartKey))}
                      className="text-muted-foreground hover:text-foreground transition-colors">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Vendedor */}
        {colaboradores.length > 0 && (
          <div className="bg-background border border-border rounded-xl p-4 space-y-2">
            <h3 className="font-semibold text-sm flex items-center gap-1.5">
              <UserPlus className="h-4 w-4" /> Vendedor
            </h3>
            <select value={vendedor} onChange={e => setVendedor(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm">
              <option value="">Nenhum / Não informado</option>
              {colaboradores.map(c => (
                <option key={c.id} value={c.nome}>{c.nome}</option>
              ))}
            </select>
          </div>
        )}

        {/* Cliente */}
        <div className="bg-background border border-border rounded-xl p-4 space-y-3">
          <h3 className="font-semibold text-sm flex items-center gap-1.5">
            <Users className="h-4 w-4" /> Cliente
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2">
              <Label className="text-xs">Nome *</Label>
              <Input value={custName} onChange={e => setCustName(e.target.value)}
                placeholder="Nome do cliente" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Telefone</Label>
              <Input value={custPhone} onChange={e => setCustPhone(e.target.value)}
                placeholder="(00) 00000-0000" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">CPF</Label>
              <Input value={custCPF} onChange={e => setCustCPF(e.target.value)}
                placeholder="Opcional" className="mt-1" />
            </div>
            <div className="col-span-2">
              <Label className="text-xs flex items-center gap-1">
                <MessageSquare className="h-3 w-3" /> Observações
              </Label>
              <Textarea
                value={observacoes}
                onChange={e => setObservacoes(e.target.value)}
                placeholder="Anotações internas sobre o pedido (opcional)..."
                className="mt-1 resize-none text-xs"
                rows={2}
              />
            </div>
          </div>
        </div>

        {/* Pagamento + Total */}
        <div className="bg-background border border-border rounded-xl p-4 space-y-3">
          <h3 className="font-semibold text-sm flex items-center gap-1.5">
            <Receipt className="h-4 w-4" /> Pagamento
          </h3>
          <div className="grid grid-cols-3 gap-1.5">
            {(["dinheiro", "cartao", "pix"] as const).map(m => {
              const labels = { dinheiro: "Dinheiro", cartao: "Cartão", pix: "PIX" };
              return (
                <button key={m} onClick={() => setPayMethod(m)}
                  className={`text-xs font-semibold py-2 rounded-lg border-2 transition-colors ${
                    payMethod === m
                      ? "border-foreground bg-foreground/10 text-foreground"
                      : "border-border hover:border-foreground/50 text-muted-foreground"
                  }`}>
                  {labels[m]}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <Label className="text-xs whitespace-nowrap">Desconto (%)</Label>
            <Input
              type="number" min={0} max={100}
              value={discountPct}
              placeholder="0"
              onChange={e => {
                const raw = e.target.value;
                if (raw === "") { setDiscountPct(""); return; }
                const clamped = Math.min(100, Math.max(0, Number(raw)));
                setDiscountPct(String(clamped));
              }}
              className="w-20 text-right" />
          </div>

          {/* Parcelas — só aparece para cartão */}
          {payMethod === "cartao" && cart.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs">Parcelas</Label>
              <div className="grid grid-cols-2 gap-1.5">
                {parcelaOpts.map(p => (
                  <button
                    key={p.parcelas}
                    onClick={() => setParcelas(p.parcelas)}
                    className={`text-left text-[11px] px-2.5 py-2 rounded-lg border-2 transition-colors leading-tight ${
                      parcelas === p.parcelas
                        ? "border-foreground bg-foreground/10 text-foreground"
                        : "border-border hover:border-foreground/40 text-muted-foreground"
                    }`}
                  >
                    <span className="font-bold">{p.parcelas}x</span>{" "}
                    {fmt(p.valorParcela)}
                    {p.temJuros
                      ? <span className="text-muted-foreground ml-1">(+juros)</span>
                      : <span className="text-foreground ml-1">s/ juros</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Troco — só aparece para dinheiro */}
          {payMethod === "dinheiro" && cart.length > 0 && (
            <div className="flex items-center gap-2">
              <Label className="text-xs whitespace-nowrap">Valor recebido</Label>
              <Input type="number" min={0} step="0.01" value={valorRecebido}
                onChange={e => setValorRecebido(e.target.value)}
                placeholder="0,00" className="w-28 text-right" />
            </div>
          )}

          <div className="space-y-1 text-sm border-t border-border pt-3">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span><span>{fmt(subtotal)}</span>
            </div>
            {discountNum > 0 && (
              <div className="flex justify-between text-foreground">
                <span>Desconto ({discountNum}%)</span><span>-{fmt(discount)}</span>
              </div>
            )}
            {payMethod === "cartao" && parcelaSel?.temJuros && (
              <div className="flex justify-between text-muted-foreground text-xs">
                <span>Taxa cartão ({parcelas}x)</span>
                <span>+{fmt(parcelaSel.totalFinal - total)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base pt-1 border-t border-border">
              <span>Total</span>
              <span>{fmt(payMethod === "cartao" ? totalCartao : total)}</span>
            </div>
            {payMethod === "cartao" && parcelas > 1 && (
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{parcelas}x de</span>
                <span className="font-medium">{fmt((payMethod === "cartao" ? totalCartao : total) / parcelas)}</span>
              </div>
            )}
            {payMethod === "dinheiro" && Number(valorRecebido) > 0 && (
              <div className={`flex justify-between font-semibold pt-1 ${
                Number(valorRecebido) >= total ? "text-foreground" : "text-muted-foreground"
              }`}>
                <span>Troco</span><span>{fmt(troco)}</span>
              </div>
            )}
          </div>

          {successNum && (
            <div className="bg-secondary border border-border rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm text-foreground">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                Venda <strong>{successNum}</strong> registrada com sucesso!
              </div>
              {lastReceipt && (
                <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs"
                  onClick={() => gerarRecibo(lastReceipt)}>
                  <FileDown className="h-3.5 w-3.5" />
                  Imprimir recibo
                </Button>
              )}
            </div>
          )}

          <Button onClick={handleSale} disabled={submitting || cart.length === 0} className="w-full gap-1.5">
            {submitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Receipt className="h-4 w-4" />}
            {submitting ? "Registrando..." : "Registrar venda"}
          </Button>
        </div>
      </div>

      {/* ── Seletor de Tamanho (PDV) ── */}
      <Dialog open={!!sizePickerProduct} onOpenChange={(open) => { if (!open) setSizePickerProduct(null); }}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Selecionar tamanho</DialogTitle>
          </DialogHeader>
          {sizePickerProduct && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground line-clamp-2">{sizePickerProduct.name}</p>
              <div className="flex flex-wrap gap-2">
                {pdvParseSizes(sizePickerProduct.quantity).map(s => {
                  const stock = pdvSizeStock(sizePickerProduct, s);
                  const oos   = sizePickerProduct.sizeStock != null && stock === 0;
                  return (
                    <button
                      key={s}
                      disabled={oos}
                      onClick={() => { setPickedSize(s); addToCartWithSize(sizePickerProduct, s); }}
                      className={`min-w-[48px] h-10 px-3 border text-sm font-bold rounded transition-colors ${
                        oos
                          ? "border-gray-200 text-gray-300 cursor-not-allowed line-through"
                          : pickedSize === s
                            ? "border-foreground bg-foreground text-background"
                            : "border-border hover:border-foreground"
                      }`}
                    >
                      {s}
                      {oos && <span className="block text-[9px] font-normal">esgotado</span>}
                    </button>
                  );
                })}
              </div>
              <Button variant="outline" className="w-full" onClick={() => setSizePickerProduct(null)}>
                Cancelar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Fluxo de Caixa ───────────────────────────────────────────────────────────
function FluxoCaixaTab({ isActive }: { isActive: boolean }) {
  const hoje = new Date().toISOString().slice(0, 7); // YYYY-MM
  const [entradas,    setEntradas]    = useState<EntradaFluxo[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [mes,         setMes]         = useState(hoje);
  const [tipoFiltro,  setTipoFiltro]  = useState<"todos" | TipoTransacao>("todos");
  const [search,      setSearch]      = useState("");

  // Modal nova transação manual
  const [addOpen,     setAddOpen]     = useState(false);
  const [tipo,        setTipo]        = useState<TipoTransacao>("saida");
  const [categoria,   setCategoria]   = useState("");
  const [descricao,   setDescricao]   = useState("");
  const [valor,       setValor]       = useState("");
  const [dataLanc,    setDataLanc]    = useState(new Date().toISOString().slice(0, 10));
  const [formaPag,    setFormaPag]    = useState("");
  const [obs,         setObs]         = useState("");
  const [saving,      setSaving]      = useState(false);

  // Confirmação de exclusão
  const [deleteId,    setDeleteId]    = useState<string | null>(null);
  const [deleting,    setDeleting]    = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchFluxoCombinado(mes);
      setEntradas(data);
    } catch { toast.error("Erro ao carregar fluxo de caixa"); }
    finally { setLoading(false); }
  }, [mes]);

  useEffect(() => {
    if (isActive) load();
  }, [isActive, mes, load]);

  const filtered = entradas.filter(t => {
    const matchTipo = tipoFiltro === "todos" || t.tipo === tipoFiltro;
    const q = search.toLowerCase();
    const matchQ = !q || t.descricao.toLowerCase().includes(q) || t.categoria.toLowerCase().includes(q);
    return matchTipo && matchQ;
  });

  const totalEntradas  = entradas.filter(t => t.tipo === "entrada").reduce((s, t) => s + t.valor, 0);
  const totalSaidas    = entradas.filter(t => t.tipo === "saida").reduce((s, t) => s + t.valor, 0);
  const totalVendas    = entradas.filter(t => t.source === "order").reduce((s, t) => s + t.valor, 0);
  const saldo          = totalEntradas - totalSaidas;

  function resetForm() {
    setTipo("saida"); setCategoria(""); setDescricao(""); setValor("");
    setDataLanc(new Date().toISOString().slice(0, 10)); setFormaPag(""); setObs("");
  }

  async function handleAdd() {
    if (!descricao.trim()) { toast.error("Informe a descrição."); return; }
    if (!categoria)        { toast.error("Selecione a categoria."); return; }
    const v = parseFloat(valor.replace(",", "."));
    if (!v || v <= 0)      { toast.error("Informe um valor válido."); return; }
    setSaving(true);
    try {
      const result = await createTransacao({
        tipo, categoria, descricao: descricao.trim(),
        valor: v, data: dataLanc,
        forma_pagamento: formaPag || undefined,
        observacao:      obs.trim() || undefined,
      });
      if (result.transacao) {
        toast.success("Lançamento registrado!");
        setAddOpen(false);
        resetForm();
        await load();
      } else {
        toast.error(result.error ?? "Erro ao registrar");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    } finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await deleteTransacao(deleteId);
      toast.success("Lançamento removido.");
      setEntradas(prev => prev.filter(t => t.id !== deleteId));
    } catch { toast.error("Erro ao remover lançamento"); }
    finally { setDeleting(false); setDeleteId(null); }
  }

  const categorias = tipo === "entrada" ? CATEGORIAS_ENTRADA : CATEGORIAS_SAIDA;

  return (
    <>
      {/* Modal novo lançamento manual */}
      <Dialog open={addOpen} onOpenChange={v => { setAddOpen(v); if (!v) resetForm(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo lançamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => { setTipo("entrada"); setCategoria(""); }}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-semibold transition-colors
                  ${tipo === "entrada" ? "bg-foreground text-background border-foreground" : "border-border hover:bg-secondary"}`}>
                <ArrowUpCircle className="h-4 w-4" /> Entrada
              </button>
              <button onClick={() => { setTipo("saida"); setCategoria(""); }}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-semibold transition-colors
                  ${tipo === "saida" ? "bg-foreground text-background border-foreground" : "border-border hover:bg-secondary"}`}>
                <ArrowDownCircle className="h-4 w-4" /> Saída
              </button>
            </div>
            <div className="space-y-1">
              <Label>Descrição *</Label>
              <Input value={descricao} onChange={e => setDescricao(e.target.value)}
                placeholder={tipo === "saida" ? "Ex: Sangria, Conta de luz..." : "Ex: Suprimento de caixa..."} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>Categoria *</Label>
                <select value={categoria} onChange={e => setCategoria(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm">
                  <option value="">Selecionar...</option>
                  {categorias.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <Label>Valor (R$) *</Label>
                <Input value={valor} onChange={e => setValor(e.target.value)} placeholder="0,00" type="number" min="0" step="0.01" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>Data *</Label>
                <Input value={dataLanc} onChange={e => setDataLanc(e.target.value)} type="date" />
              </div>
              <div className="space-y-1">
                <Label>Forma de pagamento</Label>
                <select value={formaPag} onChange={e => setFormaPag(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm">
                  <option value="">Opcional</option>
                  {FORMAS_PAGAMENTO.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Observação</Label>
              <Input value={obs} onChange={e => setObs(e.target.value)} placeholder="Opcional" />
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setAddOpen(false)} disabled={saving}>Cancelar</Button>
              <Button className="flex-1" onClick={handleAdd} disabled={saving}>
                {saving ? "Salvando..." : "Registrar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmação exclusão */}
      <AlertDialog open={!!deleteId} onOpenChange={v => { if (!v) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover lançamento?</AlertDialogTitle>
            <AlertDialogDescription>Essa ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}
              className="bg-foreground text-background hover:bg-foreground/90">
              {deleting ? "Removendo..." : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cards resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <div className="bg-background border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
            <ArrowUpCircle className="h-5 w-5 text-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Entradas</p>
            <p className="text-base font-bold text-foreground truncate">{fmt(totalEntradas)}</p>
          </div>
        </div>
        <div className="bg-background border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
            <ArrowDownCircle className="h-5 w-5 text-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Saídas</p>
            <p className="text-base font-bold text-foreground truncate">{fmt(totalSaidas)}</p>
          </div>
        </div>
        <div className="bg-background border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
            <Receipt className="h-5 w-5 text-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Vendas concluídas</p>
            <p className="text-base font-bold text-foreground truncate">{fmt(totalVendas)}</p>
          </div>
        </div>
        <div className="bg-background border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
            {saldo >= 0
              ? <TrendingUp className="h-5 w-5 text-foreground" />
              : <TrendingDown className="h-5 w-5 text-muted-foreground" />}
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Saldo</p>
            <p className="text-base font-bold text-foreground truncate">{fmt(saldo)}</p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-1.5">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <input type="month" value={mes} onChange={e => setMes(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm" />
        </div>
        <div className="flex gap-1">
          {(["todos", "entrada", "saida"] as const).map(t => (
            <button key={t} onClick={() => setTipoFiltro(t)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                ${tipoFiltro === t ? "bg-foreground text-background" : "bg-secondary hover:bg-secondary/80"}`}>
              {t === "todos" ? "Todos" : t === "entrada" ? "Entradas" : "Saídas"}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-40 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." className="pl-9" />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={load} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" /> Atualizar
        </Button>
        <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Lançamento
        </Button>
      </div>

      {/* Tabela */}
      <div className="bg-background rounded-xl border border-border overflow-hidden">
        {loading ? (
          <Table>
            <TableHeader>
              <TableRow>{["Data","Tipo","Categoria","Descrição","Forma","Valor",""].map(h => <TableHead key={h}>{h}</TableHead>)}</TableRow>
            </TableHeader>
            <TableBody>{Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={7} />)}</TableBody>
          </Table>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            {search || tipoFiltro !== "todos" ? "Nenhum lançamento encontrado." : "Nenhum lançamento neste mês."}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="hidden sm:table-cell">Categoria</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="hidden md:table-cell">Forma</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(t => (
                <TableRow key={t.id}>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(t.data + "T12:00:00").toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-secondary text-foreground`}>
                      {t.tipo === "entrada" ? <ArrowUpCircle className="h-3 w-3" /> : <ArrowDownCircle className="h-3 w-3" />}
                      {t.tipo === "entrada" ? "Entrada" : "Saída"}
                    </span>
                    {t.source === "order" && (
                      <span className="ml-1 text-[10px] text-muted-foreground">(auto)</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm">{t.categoria}</TableCell>
                  <TableCell className="text-sm">
                    <div className="truncate max-w-[200px]">{t.descricao}</div>
                    {t.observacao && <div className="text-xs text-muted-foreground">{t.observacao}</div>}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{t.forma_pagamento ?? "—"}</TableCell>
                  <TableCell className="text-right font-semibold text-sm text-foreground">
                    {t.tipo === "entrada" ? "+" : "-"}{fmt(t.valor)}
                  </TableCell>
                  <TableCell>
                    {t.source === "manual" && (
                      <button onClick={() => setDeleteId(t.id)}
                        className="text-muted-foreground hover:text-foreground transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </>
  );
}

// ─── Colaboradores ────────────────────────────────────────────────────────────
function ColaboradoresTab({ isActive, isAdmin = true }: { isActive: boolean; isAdmin?: boolean }) {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [loading,       setLoading]       = useState(false);
  const [search,        setSearch]        = useState("");
  const [filtroAtivo,   setFiltroAtivo]   = useState<"todos" | "ativo" | "inativo">("todos");
  const loaded = useRef(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editando,  setEditando]  = useState<Colaborador | null>(null);
  const [nome,      setNome]      = useState("");
  const [telefone,  setTelefone]  = useState("");
  const [email,     setEmail]     = useState("");
  const [cpf,       setCpf]       = useState("");
  const [salario,   setSalario]   = useState("");
  const [admissao,  setAdmissao]  = useState("");
  const [obs,       setObs]       = useState("");
  const [saving,    setSaving]    = useState(false);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ── Acesso ao sistema ──────────────────────────────────────────────────────
  const [acessoMap,     setAcessoMap]     = useState<Record<string, UserRole>>({});
  const [acessoDialog,  setAcessoDialog]  = useState(false);
  const [colabSel,      setColabSel]      = useState<Colaborador | null>(null);
  const [acessoAtual,   setAcessoAtual]   = useState<UserRole | null | "loading">("loading");
  const [acessoEmail,   setAcessoEmail]   = useState("");
  const [acessoSenha,   setAcessoSenha]   = useState("");
  const [showSenha,     setShowSenha]     = useState(false);
  const [acessoPerms,   setAcessoPerms]   = useState<string[]>([]);
  const [acessoSaving,  setAcessoSaving]  = useState(false);
  const [novaSenha,     setNovaSenha]     = useState("");
  const [showNovaSenha, setShowNovaSenha] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const colabs = await fetchColaboradores();
      setColaboradores(colabs);
      loaded.current = true;
      // Carregar mapa de acessos (quais colaboradores têm login)
      if (colabs.length > 0) {
        const { data } = await supabase
          .from("user_roles")
          .select("*")
          .in("colaborador_id", colabs.map(c => c.id));
        const map: Record<string, UserRole> = {};
        (data ?? []).forEach((r: UserRole) => { if (r.colaborador_id) map[r.colaborador_id] = r; });
        setAcessoMap(map);
      }
    } catch { toast.error("Erro ao carregar colaboradores"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (isActive && !loaded.current) load();
  }, [isActive, load]);

  const filtered = colaboradores.filter(c => {
    const q = search.toLowerCase();
    const matchQ = !q || c.nome.toLowerCase().includes(q);
    const matchAtivo = filtroAtivo === "todos" || (filtroAtivo === "ativo" ? c.ativo : !c.ativo);
    return matchQ && matchAtivo;
  });

  const ativos   = colaboradores.filter(c => c.ativo).length;
  const inativos = colaboradores.length - ativos;

  function openCreate() {
    setEditando(null);
    setNome(""); setTelefone(""); setEmail(""); setCpf(""); setSalario(""); setAdmissao(""); setObs("");
    setModalOpen(true);
  }

  function openEdit(c: Colaborador) {
    setEditando(c);
    setNome(c.nome); setTelefone(c.telefone || ""); setEmail(c.email || "");
    setCpf(c.cpf || ""); setSalario(c.salario ? String(c.salario) : "");
    setAdmissao(c.data_admissao || ""); setObs(c.observacao || "");
    setModalOpen(true);
  }

  async function handleSave() {
    if (!nome.trim()) { toast.error("Informe o nome."); return; }
    setSaving(true);
    try {
      const payload = {
        nome:          nome.trim(),
        telefone:      telefone.trim()  || undefined,
        email:         email.trim()     || undefined,
        cpf:           cpf.trim()       || undefined,
        salario:       salario ? parseFloat(salario.replace(",", ".")) : null,
        data_admissao: admissao         || null,
        observacao:    obs.trim()       || undefined,
      };
      if (editando) {
        await updateColaborador(editando.id, payload);
        toast.success("Colaborador atualizado!");
        setColaboradores(prev => prev.map(c => c.id === editando.id ? { ...c, ...payload } : c));
      } else {
        const result = await createColaborador(payload);
        if (result.colaborador) {
          toast.success("Colaborador criado!");
          setColaboradores(prev => [result.colaborador!, ...prev]);
        } else { toast.error(result.error ?? "Erro ao criar"); return; }
      }
      setModalOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    } finally { setSaving(false); }
  }

  async function handleToggleAtivo(c: Colaborador) {
    try {
      await toggleColaboradorAtivo(c.id, !c.ativo);
      setColaboradores(prev => prev.map(x => x.id === c.id ? { ...x, ativo: !c.ativo } : x));
      toast.success(c.ativo ? "Colaborador desativado." : "Colaborador ativado.");
    } catch { toast.error("Erro ao alterar status."); }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await deleteColaborador(deleteId);
      toast.success("Colaborador removido.");
      setColaboradores(prev => prev.filter(c => c.id !== deleteId));
    } catch { toast.error("Erro ao remover colaborador."); }
    finally { setDeleting(false); setDeleteId(null); }
  }

  // ── Gerenciamento de acesso ──────────────────────────────────────────────
  async function openAcessoDialog(c: Colaborador) {
    setColabSel(c);
    setAcessoEmail(c.email || "");
    setAcessoSenha(""); setNovaSenha("");
    setShowSenha(false); setShowNovaSenha(false);
    setAcessoAtual("loading");
    setAcessoDialog(true);
    try {
      const acesso = await fetchColaboradorAcesso(c.id);
      setAcessoAtual(acesso);
      setAcessoPerms(acesso?.permissoes ?? []);
    } catch { setAcessoAtual(null); setAcessoPerms([]); }
  }

  async function handleCriarAcesso() {
    if (!colabSel || !acessoEmail.trim() || acessoSenha.length < 6) {
      toast.error("Informe e-mail e senha (mín. 6 caracteres).");
      return;
    }
    setAcessoSaving(true);
    try {
      await createColaboradorUser({
        email: acessoEmail.trim(),
        password: acessoSenha,
        colaborador_id: colabSel.id,
        permissoes: acessoPerms,
      });
      const acesso = await fetchColaboradorAcesso(colabSel.id);
      setAcessoAtual(acesso);
      setAcessoMap(prev => acesso ? { ...prev, [colabSel.id]: acesso } : prev);
      setAcessoSenha("");
      toast.success("Acesso criado! Compartilhe o e-mail e a senha com o colaborador.");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Erro ao criar acesso"); }
    finally { setAcessoSaving(false); }
  }

  async function handleSalvarPermissoes() {
    if (!acessoAtual || acessoAtual === "loading") return;
    setAcessoSaving(true);
    try {
      await updatePermissoes(acessoAtual.user_id, acessoPerms);
      const updated = { ...acessoAtual, permissoes: acessoPerms };
      setAcessoAtual(updated);
      setAcessoMap(prev => colabSel ? { ...prev, [colabSel.id]: updated } : prev);
      toast.success("Permissões atualizadas!");
    } catch { toast.error("Erro ao salvar permissões"); }
    finally { setAcessoSaving(false); }
  }

  async function handleAlterarSenha() {
    if (!acessoAtual || acessoAtual === "loading" || novaSenha.length < 6) {
      toast.error("Senha deve ter pelo menos 6 caracteres."); return;
    }
    setAcessoSaving(true);
    try {
      await updatePassword(acessoAtual.user_id, novaSenha);
      setNovaSenha("");
      toast.success("Senha alterada com sucesso!");
    } catch { toast.error("Erro ao alterar senha"); }
    finally { setAcessoSaving(false); }
  }

  async function handleToggleAcesso() {
    if (!acessoAtual || acessoAtual === "loading") return;
    setAcessoSaving(true);
    try {
      const novoAtivo = !acessoAtual.ativo;
      await toggleAcesso(acessoAtual.user_id, novoAtivo);
      const updated = { ...acessoAtual, ativo: novoAtivo };
      setAcessoAtual(updated);
      setAcessoMap(prev => colabSel ? { ...prev, [colabSel.id]: updated } : prev);
      toast.success(novoAtivo ? "Acesso reativado!" : "Acesso revogado!");
    } catch { toast.error("Erro ao alterar acesso"); }
    finally { setAcessoSaving(false); }
  }

  async function handleDeletarAcesso() {
    if (!acessoAtual || acessoAtual === "loading") return;
    setAcessoSaving(true);
    try {
      await deleteColaboradorUser(acessoAtual.user_id);
      setAcessoAtual(null);
      setAcessoPerms([]);
      setAcessoMap(prev => {
        const next = { ...prev };
        if (colabSel) delete next[colabSel.id];
        return next;
      });
      toast.success("Conta de acesso removida.");
    } catch { toast.error("Erro ao remover conta"); }
    finally { setAcessoSaving(false); }
  }

  return (
    <>
      {/* ── Dialog: Acesso ao Sistema ───────────────────────────────────── */}
      <Dialog open={acessoDialog} onOpenChange={v => { if (!acessoSaving) setAcessoDialog(v); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-foreground" />
              Acesso — {colabSel?.nome}
            </DialogTitle>
          </DialogHeader>

          {acessoAtual === "loading" ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-2" />Carregando...
            </div>
          ) : acessoAtual === null ? (
            /* ── Criar novo acesso ─────────────────────────────────────── */
            <div className="space-y-4 pt-1">
              <div className="bg-secondary rounded-lg p-3 flex items-center gap-2">
                <ShieldOff className="h-4 w-4 text-muted-foreground shrink-0" />
                <p className="text-sm text-muted-foreground">Colaborador sem acesso ao sistema.</p>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">E-mail de login *</Label>
                  <Input value={acessoEmail} onChange={e => setAcessoEmail(e.target.value)}
                    placeholder="colaborador@email.com" type="email" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Senha *</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input value={acessoSenha} onChange={e => setAcessoSenha(e.target.value)}
                        type={showSenha ? "text" : "password"} placeholder="Mín. 6 caracteres" className="pr-9" />
                      <button type="button" onClick={() => setShowSenha(v => !v)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <Button type="button" variant="outline" size="sm" className="shrink-0"
                      onClick={() => { const s = gerarSenhaAleatoria(); setAcessoSenha(s); setShowSenha(true); }}>
                      Gerar
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Abas permitidas</p>
                  <button type="button" className="text-xs text-primary hover:underline"
                    onClick={() => setAcessoPerms(
                      acessoPerms.length === ABAS_COLABORADOR.length ? [] : ABAS_COLABORADOR.map(a => a.id)
                    )}>
                    {acessoPerms.length === ABAS_COLABORADOR.length ? "Desmarcar tudo" : "Selecionar tudo"}
                  </button>
                </div>
                <div className="space-y-1.5">
                  {ABAS_COLABORADOR.map(aba => (
                    <label key={aba.id} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-secondary cursor-pointer">
                      <input type="checkbox" className="rounded"
                        checked={acessoPerms.includes(aba.id)}
                        onChange={e => setAcessoPerms(prev =>
                          e.target.checked ? [...prev, aba.id] : prev.filter(x => x !== aba.id)
                        )}
                      />
                      <span className="text-sm flex-1">{aba.label}</span>
                      <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">{aba.grupo}</span>
                    </label>
                  ))}
                </div>
              </div>

              <Button className="w-full gap-2" onClick={handleCriarAcesso} disabled={acessoSaving}>
                {acessoSaving ? <><RefreshCw className="h-4 w-4 animate-spin" />Criando...</>
                  : <><ShieldCheck className="h-4 w-4" />Criar acesso</>}
              </Button>
            </div>
          ) : (
            /* ── Gerenciar acesso existente ────────────────────────────── */
            <div className="space-y-5 pt-1">
              {/* Status badge */}
              <div className="flex items-center gap-2 rounded-lg p-3 bg-secondary border border-border">
                {acessoAtual.ativo
                  ? <ShieldCheck className="h-4 w-4 text-foreground shrink-0" />
                  : <ShieldAlert className="h-4 w-4 text-muted-foreground shrink-0" />}
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {acessoAtual.ativo ? "Acesso ativo" : "Acesso revogado"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Login: {colabSel?.email || "e-mail cadastrado no colaborador"}
                  </p>
                </div>
              </div>

              {/* Alterar senha */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Alterar senha</p>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input value={novaSenha} onChange={e => setNovaSenha(e.target.value)}
                      type={showNovaSenha ? "text" : "password"} placeholder="Nova senha (mín. 6 car.)" className="pr-9" />
                    <button type="button" onClick={() => setShowNovaSenha(v => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showNovaSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <Button type="button" variant="outline" size="sm" className="shrink-0"
                    onClick={() => { const s = gerarSenhaAleatoria(); setNovaSenha(s); setShowNovaSenha(true); }}>
                    Gerar
                  </Button>
                </div>
                <Button variant="outline" size="sm" className="gap-1.5 w-full"
                  onClick={handleAlterarSenha} disabled={acessoSaving || !novaSenha}>
                  <KeyRound className="h-3.5 w-3.5" /> Atualizar senha
                </Button>
              </div>

              {/* Permissões */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Abas permitidas</p>
                  <button type="button" className="text-xs text-primary hover:underline"
                    onClick={() => setAcessoPerms(
                      acessoPerms.length === ABAS_COLABORADOR.length ? [] : ABAS_COLABORADOR.map(a => a.id)
                    )}>
                    {acessoPerms.length === ABAS_COLABORADOR.length ? "Desmarcar tudo" : "Selecionar tudo"}
                  </button>
                </div>
                <div className="space-y-1.5">
                  {ABAS_COLABORADOR.map(aba => (
                    <label key={aba.id} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-secondary cursor-pointer">
                      <input type="checkbox" className="rounded"
                        checked={acessoPerms.includes(aba.id)}
                        onChange={e => setAcessoPerms(prev =>
                          e.target.checked ? [...prev, aba.id] : prev.filter(x => x !== aba.id)
                        )}
                      />
                      <span className="text-sm flex-1">{aba.label}</span>
                      <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">{aba.grupo}</span>
                    </label>
                  ))}
                </div>
                <Button size="sm" className="gap-1.5 w-full" onClick={handleSalvarPermissoes} disabled={acessoSaving}>
                  <ShieldCheck className="h-3.5 w-3.5" /> Salvar permissões
                </Button>
              </div>

              {/* Revogar / Remover */}
              <div className="border-t border-border pt-4 flex gap-2">
                <Button variant="outline" size="sm" className="flex-1 gap-1.5"
                  onClick={handleToggleAcesso} disabled={acessoSaving}>
                  {acessoAtual.ativo
                    ? <><ShieldOff className="h-3.5 w-3.5" />Revogar acesso</>
                    : <><ShieldCheck className="h-3.5 w-3.5" />Reativar acesso</>}
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5"
                  onClick={handleDeletarAcesso} disabled={acessoSaving}>
                  <Trash2 className="h-3.5 w-3.5" /> Remover conta
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal criar/editar */}
      <Dialog open={modalOpen} onOpenChange={v => setModalOpen(v)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar colaborador" : "Novo colaborador"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2 space-y-1">
                <Label>Nome completo *</Label>
                <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome completo" />
              </div>
              <div className="space-y-1">
                <Label>CPF</Label>
                <Input value={cpf} onChange={e => setCpf(e.target.value)} placeholder="000.000.000-00" />
              </div>
              <div className="space-y-1">
                <Label>Telefone</Label>
                <Input value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="(00) 00000-0000" />
              </div>
              <div className="space-y-1">
                <Label>E-mail</Label>
                <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="email@exemplo.com" type="email" />
              </div>
              <div className="space-y-1">
                <Label>Salário (R$)</Label>
                <Input value={salario} onChange={e => setSalario(e.target.value)} placeholder="0,00" type="number" min="0" step="0.01" />
              </div>
              <div className="space-y-1">
                <Label>Data de admissão</Label>
                <Input value={admissao} onChange={e => setAdmissao(e.target.value)} type="date" />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Observações</Label>
                <Input value={obs} onChange={e => setObs(e.target.value)} placeholder="Opcional" />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setModalOpen(false)} disabled={saving}>Cancelar</Button>
              <Button className="flex-1" onClick={handleSave} disabled={saving}>
                {saving ? "Salvando..." : editando ? "Salvar alterações" : "Criar colaborador"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmação exclusão */}
      <AlertDialog open={!!deleteId} onOpenChange={v => { if (!v) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover colaborador?</AlertDialogTitle>
            <AlertDialogDescription>Essa ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}
              className="bg-foreground text-background hover:bg-foreground/90">
              {deleting ? "Removendo..." : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cards */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-background border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
            <Users className="h-5 w-5 text-foreground" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-lg font-bold">{colaboradores.length}</p>
          </div>
        </div>
        <div className="bg-background border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
            <UserCheck className="h-5 w-5 text-foreground" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Ativos</p>
            <p className="text-lg font-bold text-foreground">{ativos}</p>
          </div>
        </div>
        <div className="bg-background border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
            <UserX className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Inativos</p>
            <p className="text-lg font-bold text-foreground">{inativos}</p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome..." className="pl-9" />
          {search && (
            <button onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="flex gap-1">
          {(["todos", "ativo", "inativo"] as const).map(f => (
            <button key={f} onClick={() => setFiltroAtivo(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                ${filtroAtivo === f ? "bg-foreground text-background" : "bg-secondary hover:bg-secondary/80"}`}>
              {f === "todos" ? "Todos" : f === "ativo" ? "Ativos" : "Inativos"}
            </button>
          ))}
        </div>
        <span className="text-sm text-muted-foreground ml-auto">
          {filtered.length} colaborador{filtered.length !== 1 ? "es" : ""}
        </span>
        <Button variant="outline" size="sm" onClick={load} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" /> Atualizar
        </Button>
        <Button size="sm" onClick={openCreate} className="gap-1.5">
          <UserPlus className="h-3.5 w-3.5" /> Novo colaborador
        </Button>
      </div>

      {/* Tabela */}
      <div className="bg-background rounded-xl border border-border overflow-hidden">
        {loading ? (
          <Table>
            <TableHeader>
              <TableRow>{["Nome","Telefone","CPF","Admissão","Salário","Status",""].map(h => <TableHead key={h}>{h}</TableHead>)}</TableRow>
            </TableHeader>
            <TableBody>{Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={7} />)}</TableBody>
          </Table>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            {search ? `Nenhum colaborador encontrado para "${search}"` : "Nenhum colaborador cadastrado ainda."}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead className="hidden sm:table-cell">Telefone</TableHead>
                <TableHead className="hidden md:table-cell">CPF</TableHead>
                <TableHead className="hidden md:table-cell">Admissão</TableHead>
                <TableHead className="hidden lg:table-cell text-right">Salário</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(c => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                        ${c.ativo ? "bg-secondary text-foreground" : "bg-muted text-muted-foreground"}`}>
                        {c.nome.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="font-medium text-sm">{c.nome}</p>
                          {acessoMap[c.id] && (
                            <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                              acessoMap[c.id].ativo ? "bg-foreground text-background" : "bg-secondary text-muted-foreground"
                            }`}>
                              {acessoMap[c.id].ativo
                                ? <><ShieldCheck className="h-2.5 w-2.5" />Login</>
                                : <><ShieldAlert className="h-2.5 w-2.5" />Revogado</>}
                            </span>
                          )}
                        </div>
                        {c.email && <p className="text-xs text-muted-foreground">{c.email}</p>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{c.telefone ?? "—"}</TableCell>
                  <TableCell className="hidden md:table-cell text-xs font-mono text-muted-foreground">{c.cpf ?? "—"}</TableCell>
                  <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                    {c.data_admissao ? new Date(c.data_admissao + "T12:00:00").toLocaleDateString("pt-BR") : "—"}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-right text-sm font-semibold">
                    {c.salario ? Number(c.salario).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—"}
                  </TableCell>
                  <TableCell className="text-center">
                    <button onClick={() => handleToggleAtivo(c)}
                      className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full transition-colors
                        ${c.ativo ? "bg-foreground text-background hover:bg-foreground/90" : "bg-secondary text-muted-foreground hover:bg-muted"}`}>
                      {c.ativo ? <UserCheck className="h-3 w-3" /> : <UserX className="h-3 w-3" />}
                      {c.ativo ? "Ativo" : "Inativo"}
                    </button>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 justify-end">
                      {isAdmin && (
                        <button onClick={() => openAcessoDialog(c)}
                          title="Gerenciar acesso ao sistema"
                          className="text-muted-foreground hover:text-foreground transition-colors p-1">
                          <KeyRound className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button onClick={() => openEdit(c)}
                        className="text-muted-foreground hover:text-foreground transition-colors p-1">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setDeleteId(c.id)}
                        className="text-muted-foreground hover:text-foreground transition-colors p-1">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </>
  );
}

// ─── Clientes ─────────────────────────────────────────────────────────────────
function ClientesTab({ isActive }: { isActive: boolean }) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [orders,   setOrders]   = useState<Order[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [search,   setSearch]   = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const loaded = useRef(false);

  // Modal de novo cliente
  const [createOpen,    setCreateOpen]    = useState(false);
  const [newName,       setNewName]       = useState("");
  const [newCPF,        setNewCPF]        = useState("");
  const [newPhone,      setNewPhone]      = useState("");
  const [newEmail,      setNewEmail]      = useState("");
  const [creating,      setCreating]      = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [profileData, orderData] = await Promise.all([
        restGet<Profile>("profiles", { select: "*", order: "created_at.desc" }),
        fetchAllOrders(),
      ]);
      setProfiles(profileData);
      setOrders(orderData);
      loaded.current = true;
    } catch { toast.error("Erro ao carregar clientes"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (isActive && !loaded.current) load();
  }, [isActive, load]);

  async function handleCreateClient() {
    if (!newName.trim()) { toast.error("Informe o nome do cliente."); return; }
    setCreating(true);
    try {
      await restPost("profiles", {
        id:    crypto.randomUUID(),
        name:  newName.trim(),
        cpf:   newCPF.trim()   || null,
        phone: newPhone.trim() || null,
        email: newEmail.trim() || null,
      });
      toast.success("Cliente criado com sucesso!");
      setCreateOpen(false);
      setNewName(""); setNewCPF(""); setNewPhone(""); setNewEmail("");
      loaded.current = false;
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar cliente");
    } finally { setCreating(false); }
  }

  const filtered = profiles.filter(p => {
    const q = search.toLowerCase();
    return (
      p.name?.toLowerCase().includes(q) ||
      p.phone?.includes(q) ||
      p.cpf?.includes(q)
    );
  });

  const ordersByUser = (userId: string) => orders.filter(o => o.user_id === userId);
  const totalSpent   = (userId: string) =>
    ordersByUser(userId)
      .filter(o => o.status !== "cancelled")
      .reduce((s, o) => s + Number(o.total), 0);

  return (
    <>
      {/* Modal novo cliente */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <div className="space-y-1">
              <Label>Nome *</Label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nome completo" />
            </div>
            <div className="space-y-1">
              <Label>CPF</Label>
              <Input value={newCPF} onChange={e => setNewCPF(e.target.value)} placeholder="000.000.000-00" />
            </div>
            <div className="space-y-1">
              <Label>Telefone</Label>
              <Input value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="(00) 00000-0000" />
            </div>
            <div className="space-y-1">
              <Label>E-mail</Label>
              <Input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="cliente@email.com" type="email" />
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setCreateOpen(false)} disabled={creating}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={handleCreateClient} disabled={creating}>
                {creating ? "Salvando..." : "Criar cliente"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome, telefone ou CPF..." className="pl-9" />
          {search && (
            <button onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <span className="text-sm text-muted-foreground ml-auto">
          {filtered.length} cliente{filtered.length !== 1 ? "s" : ""}
        </span>
        <Button variant="outline" size="sm" onClick={load} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" /> Atualizar
        </Button>
        <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Novo cliente
        </Button>
      </div>

      <div className="bg-background rounded-xl border border-border overflow-hidden">
        {loading ? (
          <Table>
            <TableHeader>
              <TableRow>
                {["Cliente","Telefone","CPF","Pedidos","Total gasto","Cadastro"].map(h => (
                  <TableHead key={h}>{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={6} />)}
            </TableBody>
          </Table>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            {search ? `Nenhum cliente encontrado para "${search}"` : "Nenhum cliente cadastrado ainda."}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead className="hidden sm:table-cell">Telefone</TableHead>
                <TableHead className="hidden md:table-cell">CPF</TableHead>
                <TableHead className="text-center">Pedidos</TableHead>
                <TableHead className="text-right">Total gasto</TableHead>
                <TableHead className="hidden lg:table-cell">Cadastro</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(p => {
                const userOrders = ordersByUser(p.id);
                const isExp      = expanded === p.id;
                return (
                  <>
                    <TableRow key={p.id}
                      className="cursor-pointer hover:bg-secondary/50"
                      onClick={() => setExpanded(isExp ? null : p.id)}>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-secondary text-foreground flex items-center justify-center text-xs font-bold shrink-0">
                            {p.name?.charAt(0)?.toUpperCase() ?? "?"}
                          </div>
                          <p className="font-medium text-sm">{p.name ?? "Sem nome"}</p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm">{p.phone ?? "—"}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm font-mono text-muted-foreground">{p.cpf ?? "—"}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{userOrders.length}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-sm">{fmt(totalSpent(p.id))}</TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">{fmtDate(p.created_at)}</TableCell>
                      <TableCell>
                        {isExp
                          ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                      </TableCell>
                    </TableRow>

                    {/* Pedidos do cliente (expandido) */}
                    {isExp && (
                      <TableRow key={`${p.id}-orders`}>
                        <TableCell colSpan={7} className="bg-secondary/50 px-6 py-3">
                          {userOrders.length === 0 ? (
                            <p className="text-sm text-muted-foreground">Nenhum pedido encontrado.</p>
                          ) : (
                            <div className="space-y-1.5">
                              <p className="text-xs font-semibold text-muted-foreground mb-2">
                                Histórico de pedidos
                              </p>
                              {userOrders.map(o => (
                                <div key={o.id} className="flex items-center gap-3 text-sm bg-background rounded-lg px-3 py-2 border border-border">
                                  <span className="font-mono text-xs font-semibold text-foreground">{o.order_number}</span>
                                  <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[o.status]}`}>
                                    <StatusIcon status={o.status} />
                                    {STATUS_LABEL[o.status]}
                                  </span>
                                  <span className="text-xs text-muted-foreground">{fmtDate(o.created_at)}</span>
                                  <span className="ml-auto font-semibold">{fmt(Number(o.total))}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </>
  );
}

// ─── Aba Estoque ─────────────────────────────────────────────────────────────
const GRADE_PRESETS: Record<string, { label: string; sizes: string[] }> = {
  calcados_adulto:   { label: "Calçados Adulto",  sizes: ["33","34","35","36","37","38","39","40","41","42","43","44","45"] },
  calcados_infantil: { label: "Calçados Infantil", sizes: ["15","16","17","18","19","20","21","22","23","24","25","26","27","28","29","30","31","32"] },
  roupas_adulto:     { label: "Roupas Adulto",     sizes: ["PP","P","M","G","GG","XGG"] },
  roupas_infantil:   { label: "Roupas Infantil",   sizes: ["2","4","6","8","10","12","14","16"] },
};

function EstoqueTab({ isActive, isAdmin = true }: { isActive: boolean; isAdmin?: boolean }) {
  const [produtos, setProdutos]   = useState<EstoqueProduto[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading]     = useState(false);
  const [search, setSearch]       = useState("");
  const [filtro, setFiltro]       = useState<"todos" | "baixo" | "zero" | "vencendo">("todos");

  const [ajusteOpen,     setAjusteOpen]     = useState(false);
  const [produtoSel,     setProdutoSel]     = useState<EstoqueProduto | null>(null);
  const [tipoAjuste,     setTipoAjuste]     = useState<"entrada" | "saida" | "inventario">("entrada");
  const [qtdAjuste,      setQtdAjuste]      = useState("");
  const [stockMinEdit,   setStockMinEdit]   = useState("");
  const [loteEdit,       setLoteEdit]       = useState("");
  const [validadeEdit,   setValidadeEdit]   = useState("");
  const [fornecedorEdit, setFornecedorEdit] = useState("");
  const [saving,         setSaving]         = useState(false);
  const [modoAjuste,     setModoAjuste]     = useState<"total" | "tamanhos">("total");
  const [sizeStockEdit,  setSizeStockEdit]  = useState<Record<string, string>>({});
  const [workingSizes,   setWorkingSizes]   = useState<string[]>([]);
  const [showGradeSetup, setShowGradeSetup] = useState(false);
  const [customSizeInput,setCustomSizeInput]= useState("");
  const [detalhesOpen,   setDetalhesOpen]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, forn] = await Promise.all([fetchEstoque(), fetchFornecedores()]);
      setProdutos(data);
      setFornecedores(forn.filter(f => f.is_active));
    } catch { toast.error("Erro ao carregar estoque"); }
    finally { setLoading(false); }
  }, []);

  // Recarrega sempre que a aba fica ativa para refletir vendas recentes
  useEffect(() => {
    if (isActive) load();
  }, [isActive, load]);

  function sortSizes(arr: string[]): string[] {
    return [...arr].sort((a, b) => {
      const na = Number(a), nb = Number(b);
      return (!isNaN(na) && !isNaN(nb)) ? na - nb : a.localeCompare(b);
    });
  }

  function openAjuste(p: EstoqueProduto) {
    setProdutoSel(p);
    setTipoAjuste("entrada");
    setQtdAjuste("");
    setStockMinEdit(String(p.stock_min ?? 5));
    setLoteEdit(p.lote ?? "");
    setValidadeEdit(p.validade ?? "");
    setFornecedorEdit(p.fornecedor_id ?? "");
    setCustomSizeInput("");
    setDetalhesOpen(false);
    setShowGradeSetup(false);
    if (p.size_stock && Object.keys(p.size_stock).length > 0) {
      const ws = sortSizes(Object.keys(p.size_stock));
      setWorkingSizes(ws);
      const init: Record<string, string> = {};
      ws.forEach(s => { init[s] = ""; });
      setSizeStockEdit(init);
      setModoAjuste("tamanhos");
    } else {
      setWorkingSizes([]);
      setSizeStockEdit({});
      setModoAjuste("total");
    }
    setAjusteOpen(true);
  }

  function applyPreset(key: string) {
    const preset = GRADE_PRESETS[key];
    if (!preset) return;
    const ws = preset.sizes;
    setWorkingSizes(ws);
    const init: Record<string, string> = {};
    ws.forEach(s => { init[s] = ""; });
    setSizeStockEdit(init);
    setModoAjuste("tamanhos");
  }

  function addCustomSize() {
    const s = customSizeInput.trim().toUpperCase();
    if (!s || workingSizes.includes(s)) return;
    const ws = sortSizes([...workingSizes, s]);
    setWorkingSizes(ws);
    setSizeStockEdit(prev => ({ ...prev, [s]: "" }));
    setCustomSizeInput("");
    setModoAjuste("tamanhos");
  }

  function removeSize(size: string) {
    const ws = workingSizes.filter(s => s !== size);
    setWorkingSizes(ws);
    setSizeStockEdit(prev => { const next = { ...prev }; delete next[size]; return next; });
    if (ws.length === 0) { setModoAjuste("total"); setShowGradeSetup(false); }
  }

  async function handleSaveAjuste() {
    if (!produtoSel) return;
    setSaving(true);
    try {
      const novoMin  = Number(stockMinEdit);
      const minFinal = isNaN(novoMin) ? produtoSel.stock_min : novoMin;
      const opts = { stockMin: minFinal, lote: loteEdit, validade: validadeEdit || null, fornecedor_id: fornecedorEdit || null };

      if (modoAjuste === "tamanhos" && workingSizes.length > 0) {
        // ── Modo por tamanho ──────────────────────────────────────
        const atual = produtoSel.size_stock ?? {};
        const novoSizeStock: Record<string, number> = {};
        for (const size of workingSizes) {
          const inputVal = Number(sizeStockEdit[size]);
          const atualVal = atual[size] ?? 0;
          if (tipoAjuste === "entrada")    novoSizeStock[size] = atualVal + (isNaN(inputVal) ? 0 : inputVal);
          else if (tipoAjuste === "saida") novoSizeStock[size] = Math.max(0, atualVal - (isNaN(inputVal) ? 0 : inputVal));
          else                             novoSizeStock[size] = isNaN(inputVal) || inputVal < 0 ? atualVal : inputVal;
        }
        const totalStock = Object.values(novoSizeStock).reduce((s, v) => s + v, 0);
        await ajustarEstoque(produtoSel.id, totalStock, { ...opts, size_stock: novoSizeStock });
        setProdutos(prev =>
          prev.map(p => p.id === produtoSel.id
            ? { ...p, stock: totalStock, stock_min: minFinal, size_stock: novoSizeStock,
                lote: loteEdit || null, validade: validadeEdit || null, fornecedor_id: fornecedorEdit || null }
            : p
          )
        );
      } else {
        // ── Modo total ────────────────────────────────────────────
        const qty = Number(qtdAjuste);
        if (tipoAjuste !== "inventario" && (isNaN(qty) || qty <= 0)) { toast.error("Quantidade inválida"); setSaving(false); return; }
        if (tipoAjuste === "inventario" && (isNaN(qty) || qty < 0))  { toast.error("Quantidade inválida"); setSaving(false); return; }
        let novoStock = produtoSel.stock;
        if      (tipoAjuste === "entrada")  novoStock = novoStock + qty;
        else if (tipoAjuste === "saida")    novoStock = Math.max(0, novoStock - qty);
        else                                novoStock = qty;
        // Se o produto tinha grade mas o usuário removeu todos os tamanhos → zera size_stock
        const hadSizes = !!(produtoSel.size_stock && Object.keys(produtoSel.size_stock).length > 0);
        const extraOpts = hadSizes && workingSizes.length === 0 ? { size_stock: null } : {};
        await ajustarEstoque(produtoSel.id, novoStock, { ...opts, ...extraOpts });
        setProdutos(prev =>
          prev.map(p => p.id === produtoSel.id
            ? { ...p, stock: novoStock, stock_min: minFinal, size_stock: hadSizes && workingSizes.length === 0 ? null : p.size_stock,
                lote: loteEdit || null, validade: validadeEdit || null, fornecedor_id: fornecedorEdit || null }
            : p
          )
        );
      }

      toast.success("Estoque atualizado!");
      setAjusteOpen(false);
    } catch { toast.error("Erro ao atualizar"); }
    finally { setSaving(false); }
  }

  const vencendo30 = produtosVencendoEm(produtos, 30);
  const vencidos   = produtosVencendoEm(produtos, 0);

  const filtered = produtos
    .filter(p => {
      if (filtro === "zero")     return p.stock === 0;
      if (filtro === "baixo")    return p.stock > 0 && p.stock <= p.stock_min;
      if (filtro === "vencendo") return vencendo30.some(v => v.id === p.id);
      return true;
    })
    .filter(p =>
      !search.trim() ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.brand.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => a.stock - b.stock);

  const semEstoque   = produtos.filter(p => p.stock === 0).length;
  const baixoEstoque = produtos.filter(p => p.stock > 0 && p.stock <= p.stock_min).length;

  function fmtValidade(iso: string | null): string {
    if (!iso) return "—";
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  }

  function isVencido(iso: string | null): boolean {
    if (!iso) return false;
    return new Date(iso + "T00:00:00") < new Date(new Date().toDateString());
  }

  function StockBadge({ p }: { p: EstoqueProduto }) {
    if (p.stock === 0)
      return <span className="inline-flex text-xs font-medium px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border">Sem estoque</span>;
    if (p.stock <= p.stock_min)
      return <span className="inline-flex text-xs font-medium px-2 py-0.5 rounded-full bg-secondary text-foreground">Estoque baixo</span>;
    return <span className="inline-flex text-xs font-medium px-2 py-0.5 rounded-full bg-foreground text-background">OK</span>;
  }

  return (
    <div className="space-y-4">
      {/* Alertas */}
      {(semEstoque > 0 || baixoEstoque > 0 || vencendo30.length > 0) && (
        <div className="grid sm:grid-cols-3 gap-3">
          {semEstoque > 0 && (
            <div className="flex items-center gap-3 bg-secondary border border-border rounded-xl p-3.5">
              <AlertCircle className="h-5 w-5 text-foreground shrink-0" />
              <div>
                <p className="text-sm font-semibold text-foreground">{semEstoque} sem estoque</p>
                <p className="text-xs text-muted-foreground">Reposição imediata</p>
              </div>
            </div>
          )}
          {baixoEstoque > 0 && (
            <div className="flex items-center gap-3 bg-secondary border border-border rounded-xl p-3.5">
              <AlertCircle className="h-5 w-5 text-foreground shrink-0" />
              <div>
                <p className="text-sm font-semibold text-foreground">{baixoEstoque} estoque baixo</p>
                <p className="text-xs text-muted-foreground">Abaixo do mínimo</p>
              </div>
            </div>
          )}
          {vencendo30.length > 0 && (
            <div className="flex items-center gap-3 bg-secondary border border-border rounded-xl p-3.5">
              <CalendarCheck className="h-5 w-5 text-foreground shrink-0" />
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {vencidos.length > 0 ? `${vencidos.length} vencido(s)` : `${vencendo30.length} vencem em 30 dias`}
                </p>
                <p className="text-xs text-muted-foreground">Verificar validade</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar produto..." className="pl-9" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {(["todos", "baixo", "zero", "vencendo"] as const).map(f => (
            <button key={f} onClick={() => setFiltro(f)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                filtro === f
                  ? "bg-foreground text-background"
                  : "bg-background border border-border text-muted-foreground hover:text-foreground"
              }`}>
              {f === "todos" ? "Todos" : f === "baixo" ? "Estoque baixo" : f === "zero" ? "Sem estoque" : "Vencendo"}
            </button>
          ))}
        </div>
        <Button size="sm" variant="outline" onClick={load} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" />Atualizar
        </Button>
      </div>

      {/* Tabela */}
      <div className="bg-background rounded-xl border border-border overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />Carregando...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">Nenhum produto encontrado.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead className="text-center">Estoque</TableHead>
                <TableHead className="text-center hidden md:table-cell">Lote / Validade</TableHead>
                <TableHead className="text-center hidden sm:table-cell">Mínimo</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Ajustar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(p => (
                <TableRow key={p.id}>
                  <TableCell>
                    <p className="font-medium text-sm">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.brand}</p>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={`text-lg font-bold ${
                      p.stock === 0 ? "text-muted-foreground" : p.stock <= p.stock_min ? "text-foreground" : "text-foreground"
                    }`}>{p.stock}</span>
                  </TableCell>
                  <TableCell className="text-center text-sm text-muted-foreground hidden sm:table-cell">{p.stock_min}</TableCell>
                  <TableCell className="text-center hidden md:table-cell">
                    <div className="space-y-0.5">
                      {p.lote && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 justify-center">
                          <Hash className="h-3 w-3" />{p.lote}
                        </p>
                      )}
                      {p.validade && (
                        <p className={`text-xs font-medium flex items-center gap-1 justify-center ${
                          isVencido(p.validade) ? "text-muted-foreground" :
                          vencendo30.some(v => v.id === p.id) ? "text-foreground" : "text-muted-foreground"
                        }`}>
                          <CalendarCheck className="h-3 w-3" />{fmtValidade(p.validade)}
                        </p>
                      )}
                      {!p.lote && !p.validade && <span className="text-xs text-muted-foreground">—</span>}
                    </div>
                  </TableCell>
                  <TableCell className="text-center hidden sm:table-cell text-sm text-muted-foreground">{p.stock_min}</TableCell>
                  <TableCell className="text-center"><StockBadge p={p} /></TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => openAjuste(p)} className="gap-1.5">
                      <Pencil className="h-3.5 w-3.5" />Ajustar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Dialog ajuste */}
      <Dialog open={ajusteOpen} onOpenChange={setAjusteOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Ajustar Estoque</DialogTitle>
          </DialogHeader>

          {produtoSel && (() => {
            const estoqueAtual = produtoSel.stock ?? 0;
            const hasSizes     = workingSizes.length > 0;
            const prodHadSizes = !!(produtoSel.size_stock && Object.keys(produtoSel.size_stock).length > 0);
            const qty          = Number(qtdAjuste) || 0;
            const previewTotal =
              tipoAjuste === "entrada" ? estoqueAtual + qty :
              tipoAjuste === "saida"   ? Math.max(0, estoqueAtual - qty) : qty;

            return (
              <div className="space-y-6 pt-1">

                {/* ── Produto ─────────────────────────────────────────── */}
                <div className="flex items-center justify-between gap-4 pb-2 border-b border-border">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{produtoSel.name}</p>
                    <p className="text-sm text-muted-foreground">{produtoSel.brand}</p>
                    {hasSizes && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Grade: {workingSizes.join(" / ")}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-4xl font-bold leading-none tabular-nums ${
                      estoqueAtual === 0 ? "text-muted-foreground" :
                      estoqueAtual <= produtoSel.stock_min ? "text-foreground" : "text-foreground"
                    }`}>{estoqueAtual}</p>
                    <p className="text-xs text-muted-foreground mt-1">unidades em estoque</p>
                  </div>
                </div>

                {/* ── Tipo de movimentação ─────────────────────────────── */}
                <div className="space-y-3">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                    Tipo de movimentação
                  </p>
                  <div className="flex border border-border rounded-lg overflow-hidden">
                    {(["entrada", "saida", "inventario"] as const).map((t, i) => (
                      <button key={t} onClick={() => setTipoAjuste(t)}
                        className={`flex-1 py-2.5 text-sm font-medium transition-colors ${i > 0 ? "border-l border-border" : ""} ${
                          tipoAjuste === t
                            ? "bg-foreground text-background"
                            : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                        }`}>
                        {t === "entrada" ? "Entrada" : t === "saida" ? "Saída" : "Inventário"}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {tipoAjuste === "entrada"
                      ? "Soma unidades ao estoque atual — use ao receber uma nova remessa de produtos."
                      : tipoAjuste === "saida"
                      ? "Subtrai do estoque — use para registrar perdas, avarias ou devoluções."
                      : "Define a quantidade exata — use ao fazer uma contagem física do estoque."}
                  </p>
                </div>

                <div className="h-px bg-border" />

                {/* ── Quantidade ───────────────────────────────────────── */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                      {tipoAjuste === "inventario" ? "Contagem" : tipoAjuste === "entrada" ? "Quantidade de entrada" : "Quantidade de saída"}
                    </p>
                    {hasSizes && (
                      <div className="flex border border-border rounded-lg overflow-hidden text-xs">
                        {(["tamanhos", "total"] as const).map((m, i) => (
                          <button key={m} onClick={() => setModoAjuste(m)}
                            className={`px-3 py-1.5 font-medium transition-colors ${i > 0 ? "border-l border-border" : ""} ${
                              modoAjuste === m
                                ? "bg-foreground text-background"
                                : "text-muted-foreground hover:bg-secondary"
                            }`}>
                            {m === "tamanhos" ? "Por tamanho" : "Total geral"}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Modo por tamanho */}
                  {modoAjuste === "tamanhos" && hasSizes && (
                    <div className="space-y-3">
                      <div className="rounded-xl border border-border overflow-hidden">
                        {/* Cabeçalho */}
                        <div className="grid grid-cols-[auto_1fr_auto_auto] gap-3 px-4 py-2 bg-secondary border-b border-border">
                          <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wide w-14">Tamanho</span>
                          <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wide">Estoque atual</span>
                          <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wide w-24 text-center">
                            {tipoAjuste === "inventario" ? "Nova qty" : tipoAjuste === "entrada" ? "Adicionar" : "Retirar"}
                          </span>
                          <span className="w-6" />
                        </div>
                        {/* Linhas */}
                        <div className="divide-y divide-border">
                          {workingSizes.map(size => {
                            const atualVal  = produtoSel.size_stock?.[size] ?? 0;
                            const inputVal  = Number(sizeStockEdit[size]) || 0;
                            const resultado =
                              tipoAjuste === "entrada" ? atualVal + inputVal :
                              tipoAjuste === "saida"   ? Math.max(0, atualVal - inputVal) : inputVal;
                            const changed   = sizeStockEdit[size] !== "";
                            const isNew     = !produtoSel.size_stock?.[size] && produtoSel.size_stock !== null;
                            return (
                              <div key={size}
                                className={`grid grid-cols-[auto_1fr_auto_auto] gap-3 items-center px-4 py-3 transition-colors ${
                                  changed ? "bg-secondary/60" : "bg-background"
                                }`}>
                                <div className="w-14 flex items-center gap-1.5">
                                  <span className="text-sm font-semibold">{size}</span>
                                  {isNew && (
                                    <span className="text-[9px] border border-border rounded px-1 py-0.5 text-muted-foreground font-medium">novo</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className={`text-sm font-semibold tabular-nums ${
                                    atualVal === 0 ? "text-muted-foreground" : atualVal <= 2 ? "text-foreground" : "text-foreground"
                                  }`}>{atualVal}</span>
                                  {changed && (
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                      <span>→</span>
                                      <span className="font-semibold text-foreground">{resultado}</span>
                                    </span>
                                  )}
                                </div>
                                <Input
                                  type="number" min="0"
                                  value={sizeStockEdit[size]}
                                  onChange={e => setSizeStockEdit(prev => ({ ...prev, [size]: e.target.value }))}
                                  placeholder={tipoAjuste === "inventario" ? String(atualVal) : "0"}
                                  className="h-8 w-24 text-center text-sm"
                                />
                                <button onClick={() => removeSize(size)} title="Remover tamanho"
                                  className="w-6 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Adicionar tamanho */}
                      <div className="flex gap-2">
                        <Input value={customSizeInput} onChange={e => setCustomSizeInput(e.target.value)}
                          placeholder="Adicionar tamanho (ex: 46, XXL…)"
                          className="h-9 text-sm"
                          onKeyDown={e => e.key === "Enter" && addCustomSize()} />
                        <Button size="sm" variant="outline" onClick={addCustomSize}
                          disabled={!customSizeInput.trim()} className="h-9 px-3 shrink-0">
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      {/* Total preview */}
                      {workingSizes.some(s => sizeStockEdit[s] !== "") && (
                        <div className="flex items-center justify-between bg-secondary rounded-lg px-4 py-2.5">
                          <span className="text-xs text-muted-foreground">Total após salvar</span>
                          <span className="text-sm font-semibold tabular-nums">
                            {workingSizes.reduce((sum, s) => {
                              const atual = produtoSel.size_stock?.[s] ?? 0;
                              const v = Number(sizeStockEdit[s]) || 0;
                              return sum + (
                                tipoAjuste === "entrada" ? atual + v :
                                tipoAjuste === "saida"   ? Math.max(0, atual - v) :
                                (v >= 0 ? v : atual)
                              );
                            }, 0)} unidades
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Modo total */}
                  {modoAjuste === "total" && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4 items-end">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground font-medium">
                            {tipoAjuste === "inventario" ? "Quantidade contada" : "Quantidade"}
                          </Label>
                          <Input
                            type="number" min="0"
                            value={qtdAjuste}
                            onChange={e => setQtdAjuste(e.target.value)}
                            placeholder={tipoAjuste === "inventario" ? String(estoqueAtual) : "0"}
                            onKeyDown={e => e.key === "Enter" && handleSaveAjuste()}
                            className="text-center text-xl h-12 font-semibold tabular-nums"
                          />
                        </div>
                        {qty > 0 && (
                          <div className="bg-secondary rounded-xl px-4 py-3 space-y-0.5 h-12 flex flex-col justify-center">
                            <p className="text-xs text-muted-foreground">Resultado</p>
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-bold tabular-nums">{previewTotal}</span>
                              <span className={`text-xs font-semibold ${previewTotal > estoqueAtual ? "text-foreground" : "text-destructive"}`}>
                                {previewTotal > estoqueAtual
                                  ? `+${previewTotal - estoqueAtual}`
                                  : `−${estoqueAtual - previewTotal}`}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Grade de tamanhos (produto sem grade) ────────────── */}
                {!hasSizes && (
                  <>
                    <div className="h-px bg-border" />
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                          Grade de tamanhos
                        </p>
                        <button onClick={() => setShowGradeSetup(o => !o)}
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                          {showGradeSetup ? "Cancelar" : "Habilitar grade"}
                          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showGradeSetup ? "rotate-180" : ""}`} />
                        </button>
                      </div>
                      {!showGradeSetup ? (
                        <p className="text-xs text-muted-foreground">
                          Para calçados e roupas, controle o estoque por tamanho individualmente.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          <div className="border border-border rounded-xl overflow-hidden">
                            <div className="px-4 py-3 border-b border-border bg-secondary">
                              <p className="text-xs font-medium">Grades pré-definidas</p>
                            </div>
                            <div className="px-4 py-3 flex flex-wrap gap-2">
                              {Object.entries(GRADE_PRESETS).map(([key, preset]) => (
                                <button key={key} onClick={() => applyPreset(key)}
                                  className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:border-foreground/40 hover:text-foreground transition-colors">
                                  {preset.label}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Input value={customSizeInput} onChange={e => setCustomSizeInput(e.target.value)}
                              placeholder="Tamanho avulso (ex: 38, M, PP…)"
                              className="h-9 text-sm"
                              onKeyDown={e => e.key === "Enter" && addCustomSize()} />
                            <Button size="sm" variant="outline" onClick={addCustomSize}
                              disabled={!customSizeInput.trim()} className="h-9 px-3 shrink-0">
                              <Plus className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Aviso: grade nova */}
                {hasSizes && !prodHadSizes && (
                  <div className="bg-secondary border border-border rounded-lg px-4 py-2.5">
                    <p className="text-xs text-muted-foreground font-medium">
                      A grade de tamanhos será criada ao salvar.
                    </p>
                  </div>
                )}

                <div className="h-px bg-border" />

                {/* ── Detalhes adicionais ──────────────────────────────── */}
                <div className="border border-border rounded-xl overflow-hidden">
                  <button onClick={() => setDetalhesOpen(o => !o)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary transition-colors text-left">
                    <span className="text-sm font-medium">Detalhes adicionais</span>
                    <div className="flex items-center gap-2">
                      {(loteEdit || validadeEdit || fornecedorEdit) && (
                        <span className="text-[11px] text-muted-foreground font-medium">Preenchido</span>
                      )}
                      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${detalhesOpen ? "rotate-180" : ""}`} />
                    </div>
                  </button>
                  {detalhesOpen && (
                    <div className="px-4 pb-4 pt-3 space-y-4 border-t border-border">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Lote</Label>
                          <Input value={loteEdit} onChange={e => setLoteEdit(e.target.value)}
                            placeholder="Ex: L2024001" className="h-9 text-sm" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Validade</Label>
                          <Input type="date" value={validadeEdit} onChange={e => setValidadeEdit(e.target.value)} className="h-9 text-sm" />
                        </div>
                      </div>
                      {fornecedores.length > 0 && (
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Fornecedor</Label>
                          <select value={fornecedorEdit} onChange={e => setFornecedorEdit(e.target.value)}
                            className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-foreground/20">
                            <option value="">Nenhum</option>
                            {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                          </select>
                        </div>
                      )}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Estoque mínimo (alerta)</Label>
                        <Input type="number" min="0" value={stockMinEdit}
                          onChange={e => setStockMinEdit(e.target.value)}
                          placeholder="5" className="h-9 text-sm max-w-32" />
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Ações ────────────────────────────────────────────── */}
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setAjusteOpen(false)}
                    disabled={saving} className="flex-1 h-11">
                    Cancelar
                  </Button>
                  <Button className="flex-1 h-11 font-semibold" onClick={handleSaveAjuste} disabled={saving}>
                    {saving
                      ? <><RefreshCw className="h-4 w-4 animate-spin mr-2" />Salvando…</>
                      : tipoAjuste === "entrada" ? "Confirmar entrada"
                      : tipoAjuste === "saida"   ? "Confirmar saída"
                      : "Salvar inventário"}
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Aba Fornecedores ─────────────────────────────────────────────────────────
function FornecedoresTab({ isActive }: { isActive: boolean }) {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading]   = useState(false);
  const [search, setSearch]     = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing]   = useState<Fornecedor | null>(null);
  const [saving, setSaving]     = useState(false);

  const emptyForm: FornecedorInput = { nome: "", cnpj: "", telefone: "", email: "", contato: "", observacoes: "" };
  const [form, setForm] = useState<FornecedorInput>(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    try { setFornecedores(await fetchFornecedores()); }
    catch { toast.error("Erro ao carregar fornecedores"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (isActive) load(); }, [isActive, load]);

  function openNew() {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
  }

  function openEdit(f: Fornecedor) {
    setEditing(f);
    setForm({ nome: f.nome, cnpj: f.cnpj ?? "", telefone: f.telefone ?? "",
              email: f.email ?? "", contato: f.contato ?? "", observacoes: f.observacoes ?? "" });
    setFormOpen(true);
  }

  async function handleSave() {
    if (!form.nome.trim()) { toast.error("Nome obrigatório"); return; }
    setSaving(true);
    try {
      if (editing) {
        await updateFornecedor(editing.id, form);
        setFornecedores(prev => prev.map(f => f.id === editing.id ? { ...f, ...form } : f));
        toast.success("Fornecedor atualizado");
      } else {
        await createFornecedor(form);
        await load();
        toast.success("Fornecedor cadastrado");
      }
      setFormOpen(false);
    } catch { toast.error("Erro ao salvar"); }
    finally { setSaving(false); }
  }

  async function toggleAtivo(f: Fornecedor) {
    try {
      await updateFornecedor(f.id, { is_active: !f.is_active });
      setFornecedores(prev => prev.map(x => x.id === f.id ? { ...x, is_active: !x.is_active } : x));
    } catch { toast.error("Erro ao atualizar"); }
  }

  const filtered = fornecedores.filter(f =>
    !search.trim() ||
    f.nome.toLowerCase().includes(search.toLowerCase()) ||
    (f.cnpj ?? "").includes(search) ||
    (f.contato ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar fornecedor..." className="pl-9" />
        </div>
        <Button onClick={openNew} className="gap-1.5 shrink-0">
          <Plus className="h-4 w-4" />Novo fornecedor
        </Button>
      </div>

      {/* Lista */}
      <div className="bg-background rounded-xl border border-border overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />Carregando...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              {search ? "Nenhum fornecedor encontrado." : "Nenhum fornecedor cadastrado ainda."}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fornecedor</TableHead>
                <TableHead className="hidden sm:table-cell">Contato</TableHead>
                <TableHead className="hidden md:table-cell">CNPJ</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(f => (
                <TableRow key={f.id} className={!f.is_active ? "opacity-50" : ""}>
                  <TableCell>
                    <p className="font-medium text-sm">{f.nome}</p>
                    {f.email && <p className="text-xs text-muted-foreground">{f.email}</p>}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <div className="space-y-0.5">
                      {f.contato && <p className="text-xs">{f.contato}</p>}
                      {f.telefone && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <PhoneCall className="h-3 w-3" />{f.telefone}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{f.cnpj || "—"}</TableCell>
                  <TableCell className="text-center">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      f.is_active ? "bg-foreground text-background" : "bg-secondary text-muted-foreground"
                    }`}>
                      {f.is_active ? "Ativo" : "Inativo"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(f)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => toggleAtivo(f)}
                        className={f.is_active ? "text-muted-foreground hover:text-foreground" : "text-foreground hover:text-foreground"}>
                        {f.is_active ? <Ban className="h-3.5 w-3.5" /> : <BadgeCheck className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Formulário */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar fornecedor" : "Novo fornecedor"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} placeholder="Nome da empresa" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>CNPJ</Label>
                <Input value={form.cnpj} onChange={e => setForm(p => ({ ...p, cnpj: e.target.value }))} placeholder="00.000.000/0001-00" />
              </div>
              <div className="space-y-1.5">
                <Label>Telefone</Label>
                <Input value={form.telefone} onChange={e => setForm(p => ({ ...p, telefone: e.target.value }))} placeholder="(11) 99999-9999" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>E-mail</Label>
                <Input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="contato@empresa.com" />
              </div>
              <div className="space-y-1.5">
                <Label>Representante</Label>
                <Input value={form.contato} onChange={e => setForm(p => ({ ...p, contato: e.target.value }))} placeholder="Nome do contato" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Input value={form.observacoes} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))} placeholder="Prazo de entrega, condições, etc." />
            </div>
            <Button className="w-full" onClick={handleSave} disabled={saving}>
              {saving ? <><RefreshCw className="h-4 w-4 animate-spin mr-2" />Salvando...</> : "Salvar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Aba Fechamento de Caixa ──────────────────────────────────────────────────
function CaixaTab({ isActive }: { isActive: boolean }) {
  const [caixaHoje,       setCaixaHoje]       = useState<CaixaFechamento | null>(null);
  const [historico,       setHistorico]       = useState<CaixaFechamento[]>([]);
  const [pendentes,       setPendentes]       = useState<CaixaFechamento[]>([]);
  const [pendenteSel,     setPendenteSel]     = useState<CaixaFechamento | null>(null);
  const [obsFechar,       setObsFechar]       = useState("");
  const [fechandoDialog,  setFechandoDialog]  = useState(false);
  const [fechandoPendente,setFechandoPendente]= useState(false);
  const [loading,         setLoading]         = useState(false);
  const [syncing,         setSyncing]         = useState(false);
  const [saving,          setSaving]          = useState(false);
  const [saldoInicial,    setSaldoInicial]    = useState("");
  const [obs,             setObs]             = useState("");
  const [migracaoFalta,   setMigracaoFalta]   = useState(false);
  const [verTodosHist,    setVerTodosHist]    = useState(false);

  const fmtData = fmtDate;

  const load = useCallback(async () => {
    setLoading(true);
    setMigracaoFalta(false);
    try {
      const [hoje, hist, pend] = await Promise.all([
        fetchOuCriarCaixaHoje(),
        fetchFechamentos(30),
        fetchCaixasPendentes(),
      ]);
      setCaixaHoje(hoje);
      setHistorico(hist.filter(h => h.data !== hoje.data));
      setSaldoInicial(hoje.saldo_inicial > 0 ? String(hoje.saldo_inicial) : "");
      setObs(hoje.observacoes ?? "");
      setPendentes(pend);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("42P01") || msg.includes("does not exist") || msg.includes("relation")) {
        setMigracaoFalta(true);
      } else {
        toast.error("Erro ao carregar caixa: " + msg.slice(0, 100));
      }
    }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (isActive) load(); }, [isActive, load]);

  // ── Funções de fechamento de caixas pendentes ────────────────────────────────
  function abrirFecharPendente(c: CaixaFechamento) {
    setPendenteSel(c);
    setObsFechar(c.observacoes ?? "");
    setFechandoDialog(true);
  }

  async function confirmarFecharPendente() {
    if (!pendenteSel) return;
    const p      = pendenteSel;
    const motivo = obsFechar.trim() || "Fechamento tardio";
    setFechandoPendente(true);
    try {
      await salvarCaixa(p.id, { status: "fechado", observacoes: motivo });
      setPendentes(prev => prev.filter(x => x.id !== p.id));
      setHistorico(prev => prev.map(h =>
        h.id === p.id ? { ...h, status: "fechado" as const, observacoes: motivo } : h
      ));
      setFechandoDialog(false);
      toast.success(`Caixa de ${fmtData(p.data)} fechado!`);
    } catch { toast.error("Erro ao fechar caixa pendente"); }
    finally { setFechandoPendente(false); }
  }

  async function fecharTodosPendentes() {
    const lista  = pendentes;
    const motivo = "Fechamento tardio automático";
    setFechandoPendente(true);
    try {
      await Promise.all(lista.map(p => salvarCaixa(p.id, { status: "fechado", observacoes: motivo })));
      const ids = new Set(lista.map(p => p.id));
      setHistorico(prev => prev.map(h =>
        ids.has(h.id) ? { ...h, status: "fechado" as const, observacoes: motivo } : h
      ));
      setPendentes([]);
      toast.success(`${lista.length} caixa${lista.length > 1 ? "s" : ""} fechado${lista.length > 1 ? "s" : ""}!`);
    } catch { toast.error("Erro ao fechar caixas pendentes"); }
    finally { setFechandoPendente(false); }
  }

  async function syncTotais() {
    if (!caixaHoje) return;
    setSyncing(true);
    try {
      const resumo = await calcularResumoHoje();
      const saldoIni = Number(saldoInicial) || 0;
      const totalEntradas = resumo.total_dinheiro + resumo.total_pix + resumo.total_cartao;
      const saldoFinal = saldoIni + resumo.total_dinheiro - resumo.total_saidas;
      await salvarCaixa(caixaHoje.id, {
        saldo_inicial:   saldoIni,
        total_dinheiro:  resumo.total_dinheiro,
        total_pix:       resumo.total_pix,
        total_cartao:    resumo.total_cartao,
        total_saidas:    resumo.total_saidas,
        saldo_final:     saldoFinal,
        observacoes:     obs || null,
      });
      setCaixaHoje(prev => prev ? {
        ...prev, ...resumo, saldo_inicial: saldoIni,
        saldo_final: saldoFinal, observacoes: obs || null,
      } : prev);
      toast.success("Totais sincronizados dos pedidos de hoje");
    } catch { toast.error("Erro ao sincronizar"); }
    finally { setSyncing(false); }
  }

  async function fecharCaixa() {
    if (!caixaHoje) return;
    setSaving(true);
    try {
      const novoStatus = caixaHoje.status === "fechado" ? "aberto" : "fechado";
      await salvarCaixa(caixaHoje.id, { status: novoStatus, observacoes: obs || null,
        saldo_inicial: Number(saldoInicial) || 0 });
      setCaixaHoje(prev => prev ? { ...prev, status: novoStatus } : prev);
      toast.success(novoStatus === "fechado" ? "Caixa fechado!" : "Caixa reaberto");
    } catch { toast.error("Erro ao fechar caixa"); }
    finally { setSaving(false); }
  }

  if (loading) return (
    <div className="p-12 text-center text-sm text-muted-foreground">
      <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />Carregando...
    </div>
  );

  if (migracaoFalta) return (
    <div className="max-w-lg mx-auto mt-10">
      <div className="bg-secondary border border-border rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-6 w-6 text-foreground shrink-0" />
          <h3 className="font-semibold text-foreground">Migração pendente</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          As tabelas de <strong>Fechamento de Caixa</strong> e <strong>Fornecedores</strong> ainda não foram criadas no banco de dados.
        </p>
        <p className="text-sm text-muted-foreground">
          Execute o arquivo <code className="bg-background border border-border px-1.5 py-0.5 rounded text-xs font-mono">migration_v2.sql</code> no <strong>Supabase → SQL Editor</strong> e volte aqui.
        </p>
        <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
          <li>Abra o painel do Supabase</li>
          <li>Vá em <strong>SQL Editor</strong></li>
          <li>Cole e execute o conteúdo de <code className="bg-background border border-border px-1 rounded text-xs font-mono">migration_v2.sql</code></li>
          <li>Volte aqui e recarregue a página</li>
        </ol>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={load}>
          <RefreshCw className="h-3.5 w-3.5" />
          Tentar novamente
        </Button>
      </div>
    </div>
  );

  const isFechado = caixaHoje?.status === "fechado";
  const totalEntradas = (caixaHoje?.total_dinheiro ?? 0) + (caixaHoje?.total_pix ?? 0) + (caixaHoje?.total_cartao ?? 0);
  const historicoVis = verTodosHist ? historico : historico.slice(0, 3);

  return (
    <>
      {/* ── Dialog: fechar caixa pendente ────────────────────────────────── */}
      <Dialog open={fechandoDialog} onOpenChange={v => { if (!fechandoPendente) setFechandoDialog(v); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              Fechar caixa — {pendenteSel && fmtData(pendenteSel.data)}
            </DialogTitle>
          </DialogHeader>
          {pendenteSel && (
            <div className="space-y-4">
              <div className="bg-secondary rounded-lg p-4 space-y-2 text-sm">
                {[
                  { label: "Dinheiro", v: pendenteSel.total_dinheiro, cls: "text-foreground" },
                  { label: "PIX",      v: pendenteSel.total_pix,      cls: "text-foreground" },
                  { label: "Cartão",   v: pendenteSel.total_cartao,   cls: "text-foreground" },
                  { label: "Saídas",   v: pendenteSel.total_saidas,   cls: "text-muted-foreground" },
                ].map(({ label, v, cls }) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-muted-foreground">{label}</span>
                    <span className={`font-medium ${cls}`}>{fmt(v)}</span>
                  </div>
                ))}
                <div className="border-t border-border pt-2 flex justify-between font-semibold">
                  <span>Saldo final</span>
                  <span className="text-foreground">{fmt(pendenteSel.saldo_final)}</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Motivo do fechamento tardio <span className="text-muted-foreground">(recomendado)</span></Label>
                <Input
                  value={obsFechar}
                  onChange={e => setObsFechar(e.target.value)}
                  placeholder="Ex: Operador esqueceu, sistema indisponível..."
                  disabled={fechandoPendente}
                />
              </div>
              <Button className="w-full gap-2" onClick={confirmarFecharPendente} disabled={fechandoPendente}>
                {fechandoPendente
                  ? <><RefreshCw className="h-4 w-4 animate-spin" />Fechando...</>
                  : <><LockKeyhole className="h-4 w-4" />Confirmar fechamento</>
                }
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Layout duas colunas ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">

        {/* ── Coluna esquerda: Caixa de hoje ─────────────────────────────── */}
        {caixaHoje && (
          <div className="bg-background border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-3 flex items-center justify-between bg-secondary">
              <div className="flex items-center gap-2">
                <Landmark className="h-4 w-4 text-foreground" />
                <span className="font-semibold text-sm">Caixa de hoje — {fmtData(caixaHoje.data)}</span>
              </div>
              <span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
                isFechado ? "bg-foreground text-background" : "bg-background border border-border text-foreground"
              }`}>
                {isFechado ? <LockKeyhole className="h-3 w-3" /> : <LockKeyholeOpen className="h-3 w-3" />}
                {isFechado ? "Fechado" : "Aberto"}
              </span>
            </div>

            <div className="p-5 space-y-4">
              {/* Saldo inicial */}
              <div className="flex items-center gap-3">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Saldo inicial (dinheiro em caixa)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                    <Input
                      type="number" min="0" step="0.01"
                      className="pl-9"
                      value={saldoInicial}
                      onChange={e => setSaldoInicial(e.target.value)}
                      placeholder="0,00"
                      disabled={isFechado}
                    />
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={syncTotais} disabled={syncing || isFechado} className="gap-1.5 mt-6 shrink-0">
                  <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
                  Sincronizar
                </Button>
              </div>

              {/* Totais */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Dinheiro", value: caixaHoje.total_dinheiro, color: "text-foreground",       icon: Banknote },
                  { label: "PIX",      value: caixaHoje.total_pix,      color: "text-foreground",       icon: Smartphone },
                  { label: "Cartão",   value: caixaHoje.total_cartao,   color: "text-foreground",       icon: CreditCard },
                  { label: "Saídas",   value: caixaHoje.total_saidas,   color: "text-muted-foreground", icon: ArrowDownCircle },
                ].map(({ label, value, color, icon: Icon }) => (
                  <div key={label} className="bg-secondary rounded-lg p-3 flex items-center gap-2">
                    <Icon className={`h-4 w-4 shrink-0 ${color}`} />
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
                      <p className={`text-sm font-bold ${color}`}>{fmt(value)}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Saldo final */}
              <div className="border-t border-border pt-3 space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Total vendas</span>
                  <span className="font-medium text-foreground">{fmt(totalEntradas)}</span>
                </div>
                <div className="flex justify-between text-base font-bold">
                  <span>Saldo final (caixa físico)</span>
                  <span className="text-foreground">{fmt(caixaHoje.saldo_final)}</span>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Saldo final = Saldo inicial + Dinheiro - Saídas.
                </p>
              </div>

              {/* Observações */}
              <div className="space-y-1.5">
                <Label className="text-xs">Observações do dia</Label>
                <Input
                  value={obs}
                  onChange={e => setObs(e.target.value)}
                  placeholder="Qualquer anotação do dia..."
                  disabled={isFechado}
                />
              </div>

              {/* Fechar/Abrir */}
              <Button
                className="w-full gap-2"
                variant={isFechado ? "outline" : "default"}
                onClick={fecharCaixa}
                disabled={saving}
              >
                {saving
                  ? <><RefreshCw className="h-4 w-4 animate-spin" />Salvando...</>
                  : isFechado
                  ? <><LockKeyholeOpen className="h-4 w-4" />Reabrir caixa</>
                  : <><LockKeyhole className="h-4 w-4" />Fechar caixa do dia</>
                }
              </Button>
            </div>
          </div>
        )}

        {/* ── Coluna direita ──────────────────────────────────────────────── */}
        <div className="space-y-5">

          {/* Histórico de fechamentos (max 3) */}
          {historico.length > 0 && (
            <div className="bg-background border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-border flex items-center justify-between">
                <p className="text-sm font-semibold">Histórico de fechamentos</p>
                {historico.length > 3 && (
                  <button
                    onClick={() => setVerTodosHist(v => !v)}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {verTodosHist ? "Ver menos" : `Ver todos (${historico.length})`}
                  </button>
                )}
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historicoVis.map(h => {
                    const entradas = h.total_dinheiro + h.total_pix + h.total_cartao;
                    return (
                      <TableRow key={h.id}>
                        <TableCell>
                          <p className="font-medium text-sm">{fmtData(h.data)}</p>
                          <p className="text-[10px] text-muted-foreground">Vendas: {fmt(entradas)}</p>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-sm">{fmt(h.saldo_final)}</TableCell>
                        <TableCell className="text-center">
                          {h.status === "fechado" ? (
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-foreground text-background">
                              Fechado
                            </span>
                          ) : (
                            <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => abrirFecharPendente(h)}>
                              <LockKeyhole className="h-3 w-3" />Fechar
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Caixas não fechados */}
          {pendentes.length > 0 && (
            <div className="bg-background border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-3 bg-secondary flex items-center gap-2 border-b border-border">
                <AlertTriangle className="h-4 w-4 text-foreground shrink-0" />
                <p className="font-semibold text-foreground text-sm flex-1">
                  {pendentes.length === 1
                    ? "1 caixa não foi fechado"
                    : `${pendentes.length} caixas não foram fechados`}
                </p>
              </div>
              <div className="p-4 space-y-2">
                {pendentes.map(p => {
                  const ent = p.total_dinheiro + p.total_pix + p.total_cartao;
                  return (
                    <div key={p.id} className="flex items-center justify-between bg-secondary border border-border rounded-lg px-4 py-2.5 gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">{fmtData(p.data)}</p>
                        <p className="text-xs text-muted-foreground">
                          Entradas: {fmt(ent)} · Saldo: {fmt(p.saldo_final)}
                        </p>
                      </div>
                      <Button size="sm" variant="outline" className="gap-1.5 shrink-0" onClick={() => abrirFecharPendente(p)}>
                        <LockKeyhole className="h-3.5 w-3.5" />
                        Fechar
                      </Button>
                    </div>
                  );
                })}
                {pendentes.length > 1 && (
                  <Button size="sm" variant="outline" className="w-full gap-1.5 mt-1" onClick={fecharTodosPendentes} disabled={fechandoPendente}>
                    {fechandoPendente
                      ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" />Fechando...</>
                      : <><LockKeyhole className="h-3.5 w-3.5" />Fechar todos de uma vez</>
                    }
                  </Button>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}

// ─── Aba Relatorios ───────────────────────────────────────────────────────────
type PeriodKey = "hoje" | "semana" | "mes" | "mes_passado" | "personalizado";

function getDateRange(period: Exclude<PeriodKey, "personalizado">): { start: Date; end: Date } {
  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === "hoje") {
    return { start: today, end: now };
  }
  if (period === "semana") {
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay());
    return { start, end: now };
  }
  if (period === "mes") {
    return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now };
  }
  // mes_passado
  return {
    start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
    end:   new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59),
  };
}

function resolveRange(period: PeriodKey, customStart: string, customEnd: string): { start: Date; end: Date } {
  if (period === "personalizado" && customStart && customEnd) {
    return {
      start: new Date(customStart + "T00:00:00"),
      end:   new Date(customEnd   + "T23:59:59"),
    };
  }
  if (period === "personalizado") {
    const now = new Date();
    return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now };
  }
  return getDateRange(period);
}

function RelatoriosTab({ isActive }: { isActive: boolean }) {
  const [orders,  setOrders]  = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const loaded = useRef(false);
  const [period, setPeriod]   = useState<PeriodKey>("mes");
  const [customStart, setCustomStart] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  });
  const [customEnd, setCustomEnd] = useState(() => new Date().toISOString().slice(0, 10));
  const [pdfOpen,    setPdfOpen]    = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfSecoes,  setPdfSecoes]  = useState<PDFSecoes>({
    pedidos:       true,
    produtos:      true,
    colaboradores: true,
    fluxoCaixa:    false,
    contas:        false,
    comissoes:     false,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setOrders(await fetchAllOrders());
      loaded.current = true;
    } catch { toast.error("Erro ao carregar relatorio"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (isActive && !loaded.current) load();
  }, [isActive, load]);

  const range = resolveRange(period, customStart, customEnd);

  const pedidosPeriod = useMemo(() =>
    orders.filter(o => {
      if (o.status === "cancelled") return false;
      const d = new Date(o.created_at);
      return d >= range.start && d <= range.end;
    }),
  [orders, range.start, range.end]);

  const faturamento = useMemo(() =>
    pedidosPeriod.reduce((s, o) => s + Number(o.total), 0),
  [pedidosPeriod]);

  const ticketMedio = pedidosPeriod.length > 0 ? faturamento / pedidosPeriod.length : 0;

  const totalItens = useMemo(() =>
    pedidosPeriod.reduce((s, o) => s + (o.order_items?.length ?? 0), 0),
  [pedidosPeriod]);

  const revenueByDay = useMemo(() => {
    const map: Record<string, number> = {};
    pedidosPeriod.forEach(o => {
      const d   = new Date(o.created_at);
      const key = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
      map[key]  = (map[key] ?? 0) + Number(o.total);
    });
    return Object.entries(map)
      .map(([date, total]) => ({ date, total }))
      .sort((a, b) => {
        const [ad, am] = a.date.split("/").map(Number);
        const [bd, bm] = b.date.split("/").map(Number);
        return am !== bm ? am - bm : ad - bd;
      });
  }, [pedidosPeriod]);

  const topProducts = useMemo(() => {
    const map: Record<string, { name: string; qty: number; total: number }> = {};
    pedidosPeriod.forEach(o => {
      (o.order_items ?? []).forEach(item => {
        const k = item.product_name ?? item.product_id;
        if (!map[k]) map[k] = { name: item.product_name ?? k, qty: 0, total: 0 };
        map[k].qty   += item.quantity;
        map[k].total += item.quantity * Number(item.unit_price);
      });
    });
    return Object.values(map).sort((a, b) => b.qty - a.qty).slice(0, 8);
  }, [pedidosPeriod]);

  const byColaborador = useMemo(() => {
    const map: Record<string, { nome: string; pedidos: number; total: number }> = {};
    pedidosPeriod.forEach(o => {
      const nome = o.vendedor_nome ?? "Sem vendedor";
      if (!map[nome]) map[nome] = { nome, pedidos: 0, total: 0 };
      map[nome].pedidos++;
      map[nome].total += Number(o.total);
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [pedidosPeriod]);

  const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
    { key: "hoje",         label: "Hoje"          },
    { key: "semana",       label: "Esta semana"   },
    { key: "mes",          label: "Este mes"      },
    { key: "mes_passado",  label: "Mes passado"   },
    { key: "personalizado",label: "Personalizado" },
  ];

  const handleGerarPDF = useCallback(async () => {
    setPdfLoading(true);
    try {
      const r = resolveRange(period, customStart, customEnd);

      // Para fluxo de caixa: busca o mês inicial do intervalo
      const mesMes = period === "mes_passado"
        ? (() => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().slice(0, 7); })()
        : period === "personalizado" && customStart
        ? customStart.slice(0, 7)
        : new Date().toISOString().slice(0, 7);

      const [fluxoData, contasData, colaboradoresData] = await Promise.all([
        pdfSecoes.fluxoCaixa ? fetchFluxoCombinado(mesMes) : Promise.resolve([]),
        pdfSecoes.contas     ? fetchContas()               : Promise.resolve([]),
        pdfSecoes.comissoes  ? fetchColaboradores()        : Promise.resolve([]),
      ]);

      const fluxoFiltrado = fluxoData.filter(f => {
        const d = new Date(f.data + "T00:00:00");
        return d >= r.start && d <= r.end;
      });

      const fmtD = (s: string) => `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}`;
      const periodLabel = period === "personalizado" && customStart && customEnd
        ? `${fmtD(customStart)} a ${fmtD(customEnd)}`
        : PERIOD_OPTIONS.find(o => o.key === period)?.label ?? period;

      gerarRelatorioPDF({
        titulo:  "Relatorio de Desempenho",
        periodo: periodLabel,
        secoes:  pdfSecoes,
        dados: {
          orders:        pedidosPeriod,
          fluxo:         fluxoFiltrado,
          contas:        contasData,
          colaboradores: colaboradoresData,
        },
        metricas: {
          faturamento:  faturamento,
          totalPedidos: pedidosPeriod.length,
          ticketMedio:  ticketMedio,
          totalItens:   totalItens,
        },
      });

      setPdfOpen(false);
      toast.success("PDF gerado com sucesso");
    } catch {
      toast.error("Erro ao gerar PDF");
    } finally {
      setPdfLoading(false);
    }
  }, [pdfSecoes, period, customStart, customEnd, pedidosPeriod, faturamento, ticketMedio, totalItens, PERIOD_OPTIONS]);

  return (
    <div className="space-y-5">
      {/* Period selector */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {PERIOD_OPTIONS.map(o => (
            <button key={o.key} onClick={() => setPeriod(o.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                period === o.key
                  ? "bg-foreground text-background"
                  : "bg-background border border-border text-muted-foreground hover:text-foreground"
              }`}>
              {o.label}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => { loaded.current = false; load(); }} className="gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" />Atualizar
            </Button>
            <Button size="sm" onClick={() => setPdfOpen(true)} className="gap-1.5">
              <FileDown className="h-3.5 w-3.5" />Gerar PDF
            </Button>
          </div>
        </div>

        {period === "personalizado" && (
          <div className="flex flex-wrap items-center gap-3 p-3 bg-muted/40 rounded-lg border border-border">
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">De</Label>
              <Input
                type="date"
                value={customStart}
                max={customEnd}
                onChange={e => setCustomStart(e.target.value)}
                className="h-8 text-xs w-36"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">Ate</Label>
              <Input
                type="date"
                value={customEnd}
                min={customStart}
                max={new Date().toISOString().slice(0, 10)}
                onChange={e => setCustomEnd(e.target.value)}
                className="h-8 text-xs w-36"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {customStart && customEnd
                ? `${new Date(customStart + "T00:00:00").toLocaleDateString("pt-BR")} — ${new Date(customEnd + "T00:00:00").toLocaleDateString("pt-BR")}`
                : "Selecione as datas"}
            </p>
          </div>
        )}
      </div>

      {/* Cards resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Faturamento",   value: fmt(faturamento),            icon: TrendingUp,  color: "text-foreground", bg: "bg-secondary" },
          { label: "Pedidos",       value: String(pedidosPeriod.length), icon: ShoppingBag, color: "text-foreground", bg: "bg-secondary" },
          { label: "Ticket medio",  value: fmt(ticketMedio),             icon: BarChart2,   color: "text-foreground", bg: "bg-secondary" },
          { label: "Itens vendidos",value: String(totalItens),           icon: Package,     color: "text-foreground", bg: "bg-secondary" },
        ].map(m => {
          const Icon = m.icon;
          return (
            <div key={m.label} className="bg-background rounded-xl border border-border p-4">
              <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${m.bg} mb-3`}>
                <Icon className={`h-4 w-4 ${m.color}`} />
              </div>
              <p className="text-xl font-bold">{loading ? "..." : m.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{m.label}</p>
            </div>
          );
        })}
      </div>

      {/* Grafico de barras */}
      {revenueByDay.length > 1 && (
        <div className="bg-background rounded-xl border border-border p-5">
          <h3 className="font-semibold text-sm mb-4">Faturamento por dia</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={revenueByDay} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <XAxis dataKey="date" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis
                tickFormatter={v => `R$${(v as number) >= 1000 ? `${((v as number) / 1000).toFixed(1)}k` : v}`}
                tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={50}
              />
              <Tooltip formatter={(v: unknown) => [fmt(v as number), "Receita"]} />
              <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Paineis inferiores */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Top produtos */}
        <div className="bg-background rounded-xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-semibold text-sm">Produtos mais vendidos</h3>
          </div>
          {topProducts.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">Sem dados para o periodo.</p>
          ) : (
            <div className="divide-y divide-border">
              {topProducts.map((p, i) => (
                <div key={p.name} className="px-5 py-3 flex items-center gap-3">
                  <span className="text-xs font-bold text-muted-foreground w-5 shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.qty} un.</p>
                  </div>
                  <span className="text-sm font-semibold shrink-0">{fmt(p.total)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Por colaborador */}
        <div className="bg-background rounded-xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-semibold text-sm">Vendas por colaborador</h3>
          </div>
          {byColaborador.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">Sem dados para o periodo.</p>
          ) : (
            <div className="divide-y divide-border">
              {byColaborador.map((c, i) => (
                <div key={c.nome} className="px-5 py-3 flex items-center gap-3">
                  <span className="text-xs font-bold text-muted-foreground w-5 shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.nome}</p>
                    <p className="text-xs text-muted-foreground">{c.pedidos} pedido{c.pedidos !== 1 ? "s" : ""}</p>
                  </div>
                  <span className="text-sm font-semibold shrink-0">{fmt(c.total)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Dialog PDF ────────────────────────────────────────────────────── */}
      <Dialog open={pdfOpen} onOpenChange={setPdfOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Gerar Relatorio PDF</DialogTitle>
          </DialogHeader>

          <p className="text-xs text-muted-foreground -mt-1">
            Periodo:{" "}
            <span className="font-medium text-foreground">
              {period === "personalizado" && customStart && customEnd
                ? `${new Date(customStart + "T00:00:00").toLocaleDateString("pt-BR")} — ${new Date(customEnd + "T00:00:00").toLocaleDateString("pt-BR")}`
                : PERIOD_OPTIONS.find(o => o.key === period)?.label}
            </span>
          </p>

          <div className="space-y-3 py-1">
            <p className="text-sm font-medium">Secoes a incluir</p>
            {(
              [
                { key: "pedidos",       label: "Lista de pedidos"           },
                { key: "produtos",      label: "Produtos mais vendidos"     },
                { key: "colaboradores", label: "Vendas por colaborador"     },
                { key: "fluxoCaixa",   label: "Fluxo de caixa"             },
                { key: "contas",        label: "Contas a pagar / receber"   },
                { key: "comissoes",     label: "Comissoes de colaboradores" },
              ] as { key: keyof PDFSecoes; label: string }[]
            ).map(s => (
              <label key={s.key} className="flex items-center gap-2.5 cursor-pointer select-none">
                <Checkbox
                  checked={pdfSecoes[s.key]}
                  onCheckedChange={v => setPdfSecoes(prev => ({ ...prev, [s.key]: !!v }))}
                />
                <span className="text-sm">{s.label}</span>
              </label>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={() => setPdfOpen(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleGerarPDF} disabled={pdfLoading} className="gap-1.5">
              <FileDown className="h-3.5 w-3.5" />
              {pdfLoading ? "Gerando..." : "Baixar PDF"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Aba Metas ────────────────────────────────────────────────────────────────
function MetasTab({ isActive }: { isActive: boolean }) {
  const now = new Date();
  const [mes, setMes]         = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
  const [meta, setMeta]       = useState<Meta | null>(null);
  const [ordersDoMes, setOrdersDoMes] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode]           = useState(false);
  const [editFaturamento, setEditFaturamento] = useState("");
  const [editPedidos, setEditPedidos]     = useState("");
  const [saving, setSaving]               = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [metaData, ordersData] = await Promise.all([fetchMeta(mes), fetchAllOrders()]);
      setMeta(metaData);
      const [year, month] = mes.split("-").map(Number);
      const start = new Date(year, month - 1, 1);
      const end   = new Date(year, month, 0, 23, 59, 59);
      setOrdersDoMes(ordersData.filter(o => {
        if (o.status === "cancelled") return false;
        const d = new Date(o.created_at);
        return d >= start && d <= end;
      }));
    } catch { toast.error("Erro ao carregar metas"); }
    finally { setLoading(false); }
  }, [mes]);

  useEffect(() => {
    if (isActive) load();
  }, [isActive, load]);

  const faturamentoReal = ordersDoMes.reduce((s, o) => s + Number(o.total), 0);
  const pedidosReal     = ordersDoMes.length;

  const pctFaturamento = meta?.meta_faturamento
    ? Math.min(100, Math.round((faturamentoReal / meta.meta_faturamento) * 100))
    : 0;
  const pctPedidos = meta?.meta_pedidos
    ? Math.min(100, Math.round((pedidosReal / meta.meta_pedidos) * 100))
    : 0;

  function startEdit() {
    setEditFaturamento(meta?.meta_faturamento ? String(meta.meta_faturamento) : "");
    setEditPedidos(meta?.meta_pedidos ? String(meta.meta_pedidos) : "");
    setEditMode(true);
  }

  async function handleSave() {
    const f = parseFloat(editFaturamento.replace(",", "."));
    const p = parseInt(editPedidos, 10);
    if (isNaN(f) || f < 0 || isNaN(p) || p < 0) { toast.error("Valores invalidos"); return; }
    setSaving(true);
    try {
      const saved = await saveMeta({ mes, meta_faturamento: f, meta_pedidos: p });
      setMeta(saved);
      setEditMode(false);
      toast.success("Metas salvas");
    } catch { toast.error("Erro ao salvar metas"); }
    finally { setSaving(false); }
  }

  function prevMes() {
    const [y, m] = mes.split("-").map(Number);
    const d = new Date(y, m - 2, 1);
    setMes(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  function nextMes() {
    const [y, m] = mes.split("-").map(Number);
    const d = new Date(y, m, 1);
    setMes(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  const mesLabel = new Date(mes + "-15").toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  function ProgressBar({ value, done }: { value: number; done: boolean }) {
    return (
      <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            done ? "bg-foreground" : value >= 70 ? "bg-foreground/70" : value >= 40 ? "bg-foreground/45" : "bg-foreground/25"
          }`}
          style={{ width: `${value}%` }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Navegacao de mes */}
      <div className="flex items-center justify-between bg-background border border-border rounded-xl px-4 py-3">
        <button onClick={prevMes} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <p className="font-semibold capitalize text-sm">{mesLabel}</p>
        <button onClick={nextMes} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-sm text-muted-foreground">
          <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />Carregando...
        </div>
      ) : (
        <>
          {/* Cards de progresso */}
          <div className="grid sm:grid-cols-2 gap-4">
            {/* Faturamento */}
            <div className="bg-background border border-border rounded-xl p-5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Faturamento</p>
                  <p className="text-2xl font-bold mt-1">{fmt(faturamentoReal)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {meta?.meta_faturamento ? `meta: ${fmt(meta.meta_faturamento)}` : "Meta nao definida"}
                  </p>
                </div>
                <span className="text-sm font-bold shrink-0 mt-1 text-foreground">
                  {meta?.meta_faturamento ? `${pctFaturamento}%` : "--"}
                </span>
              </div>
              <ProgressBar value={pctFaturamento} done={pctFaturamento >= 100} />
              {pctFaturamento >= 100 && (
                <p className="text-xs font-semibold text-foreground">Meta atingida!</p>
              )}
            </div>

            {/* Pedidos */}
            <div className="bg-background border border-border rounded-xl p-5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pedidos</p>
                  <p className="text-2xl font-bold mt-1">{pedidosReal}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {meta?.meta_pedidos ? `meta: ${meta.meta_pedidos} pedidos` : "Meta nao definida"}
                  </p>
                </div>
                <span className="text-sm font-bold shrink-0 mt-1 text-foreground">
                  {meta?.meta_pedidos ? `${pctPedidos}%` : "--"}
                </span>
              </div>
              <ProgressBar value={pctPedidos} done={pctPedidos >= 100} />
              {pctPedidos >= 100 && (
                <p className="text-xs font-semibold text-foreground">Meta atingida!</p>
              )}
            </div>
          </div>

          {/* Formulario de edicao */}
          {editMode ? (
            <div className="bg-background border border-border rounded-xl p-5 space-y-4">
              <h3 className="font-semibold text-sm">Definir metas — <span className="capitalize font-normal text-muted-foreground">{mesLabel}</span></h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Meta de faturamento (R$)</Label>
                  <Input type="number" min="0" value={editFaturamento} onChange={e => setEditFaturamento(e.target.value)} placeholder="Ex: 10000" />
                </div>
                <div className="space-y-1.5">
                  <Label>Meta de pedidos</Label>
                  <Input type="number" min="0" value={editPedidos} onChange={e => setEditPedidos(e.target.value)} placeholder="Ex: 50" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={saving} className="gap-1.5">
                  {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Salvar metas
                </Button>
                <Button variant="outline" onClick={() => setEditMode(false)}>Cancelar</Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" onClick={startEdit} className="gap-1.5">
              <Pencil className="h-4 w-4" />
              {meta ? "Editar metas" : "Definir metas do mes"}
            </Button>
          )}
        </>
      )}
    </div>
  );
}

// ─── Aba Cupons ───────────────────────────────────────────────────────────────
function CuponsTab({ isActive }: { isActive: boolean }) {
  const [cupons,  setCupons]  = useState<Cupom[]>([]);
  const [loading, setLoading] = useState(false);
  const loaded = useRef(false);

  const [open,        setOpen]        = useState(false);
  const [delId,       setDelId]       = useState<string | null>(null);
  const [saving,      setSaving]      = useState(false);

  // Form
  const [codigo,      setCodigo]      = useState("");
  const [tipo,        setTipo]        = useState<"percentual" | "fixo">("percentual");
  const [valor,       setValor]       = useState("");
  const [minValor,    setMinValor]    = useState("");
  const [validade,    setValidade]    = useState("");
  const [usosLimite,  setUsosLimite]  = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setCupons(await fetchCupons());
      loaded.current = true;
    } catch { toast.error("Erro ao carregar cupons"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (isActive && !loaded.current) load();
  }, [isActive, load]);

  function resetForm() {
    setCodigo(""); setTipo("percentual"); setValor("");
    setMinValor(""); setValidade(""); setUsosLimite("");
  }

  async function handleCreate() {
    if (!codigo.trim()) { toast.error("Informe o codigo do cupom"); return; }
    const v = parseFloat(valor.replace(",", "."));
    if (isNaN(v) || v <= 0) { toast.error("Valor invalido"); return; }
    setSaving(true);
    try {
      const input: CupomInput = {
        codigo,
        tipo,
        valor: v,
        valor_minimo: minValor ? parseFloat(minValor.replace(",", ".")) : null,
        validade:     validade || null,
        usos_limite:  usosLimite ? parseInt(usosLimite) : null,
        ativo:        true,
      };
      const novo = await createCupom(input);
      setCupons(prev => [novo, ...prev]);
      toast.success("Cupom criado");
      setOpen(false);
      resetForm();
    } catch { toast.error("Erro ao criar cupom"); }
    finally { setSaving(false); }
  }

  async function handleToggle(c: Cupom) {
    await toggleCupomAtivo(c.id, !c.ativo);
    setCupons(prev => prev.map(x => x.id === c.id ? { ...x, ativo: !x.ativo } : x));
  }

  async function handleDelete() {
    if (!delId) return;
    await deleteCupom(delId);
    setCupons(prev => prev.filter(x => x.id !== delId));
    setDelId(null);
    toast.success("Cupom removido");
  }

  const ativos   = cupons.filter(c => c.ativo).length;
  const totalUsos = cupons.reduce((s, c) => s + c.usos_count, 0);

  return (
    <div className="space-y-4">
      {/* Stats + ações */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-3 flex-1">
          <div className="bg-background border border-border rounded-xl px-4 py-2.5 text-sm">
            <span className="text-muted-foreground">Ativos: </span>
            <span className="font-bold">{ativos}</span>
          </div>
          <div className="bg-background border border-border rounded-xl px-4 py-2.5 text-sm">
            <span className="text-muted-foreground">Usos totais: </span>
            <span className="font-bold">{totalUsos}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => { loaded.current = false; load(); }} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />Atualizar
          </Button>
          <Button size="sm" onClick={() => { resetForm(); setOpen(true); }} className="gap-1.5">
            <Plus className="h-4 w-4" />Novo cupom
          </Button>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-background rounded-xl border border-border overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />Carregando...
          </div>
        ) : cupons.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">Nenhum cupom cadastrado.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Codigo</TableHead>
                <TableHead>Desconto</TableHead>
                <TableHead className="hidden sm:table-cell">Pedido min.</TableHead>
                <TableHead className="hidden sm:table-cell">Validade</TableHead>
                <TableHead className="text-center">Usos</TableHead>
                <TableHead className="text-center">Ativo</TableHead>
                <TableHead className="text-right">Excluir</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cupons.map(c => (
                <TableRow key={c.id}>
                  <TableCell>
                    <span className="font-mono font-bold text-sm tracking-wider">{c.codigo}</span>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                      "bg-secondary text-foreground"
                    }`}>
                      {c.tipo === "percentual" ? <BadgePercent className="h-3 w-3" /> : <DollarSign className="h-3 w-3" />}
                      {c.tipo === "percentual" ? `${c.valor}%` : `R$${c.valor.toFixed(2).replace(".",",")}`}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground hidden sm:table-cell">
                    {c.valor_minimo ? `R$${c.valor_minimo.toFixed(2).replace(".",",")}` : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground hidden sm:table-cell">
                    {c.validade ? new Date(c.validade + "T12:00:00").toLocaleDateString("pt-BR") : "—"}
                  </TableCell>
                  <TableCell className="text-center text-sm">
                    {c.usos_count}{c.usos_limite ? `/${c.usos_limite}` : ""}
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch checked={c.ativo} onCheckedChange={() => handleToggle(c)} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-foreground"
                      onClick={() => setDelId(c.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Dialog criar */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Novo cupom</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Codigo *</Label>
              <Input value={codigo} onChange={e => setCodigo(e.target.value.toUpperCase())} placeholder="Ex: FARMA10" />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo de desconto</Label>
              <div className="grid grid-cols-2 gap-2">
                {(["percentual","fixo"] as const).map(t => (
                  <button key={t} onClick={() => setTipo(t)}
                    className={`py-2 rounded-lg text-sm font-medium border transition-colors ${
                      tipo === t ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground"
                    }`}>
                    {t === "percentual" ? "Porcentagem (%)" : "Valor fixo (R$)"}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Valor do desconto *</Label>
                <Input type="number" min="0" value={valor} onChange={e => setValor(e.target.value)}
                  placeholder={tipo === "percentual" ? "Ex: 10" : "Ex: 50"} />
              </div>
              <div className="space-y-1.5">
                <Label>Pedido minimo (R$)</Label>
                <Input type="number" min="0" value={minValor} onChange={e => setMinValor(e.target.value)} placeholder="0" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Validade</Label>
                <Input type="date" value={validade} onChange={e => setValidade(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Limite de usos</Label>
                <Input type="number" min="1" value={usosLimite} onChange={e => setUsosLimite(e.target.value)} placeholder="Ilimitado" />
              </div>
            </div>
            <Button className="w-full" onClick={handleCreate} disabled={saving}>
              {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
              Criar cupom
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm delete */}
      <AlertDialog open={!!delId} onOpenChange={v => { if (!v) setDelId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cupom?</AlertDialogTitle>
            <AlertDialogDescription>Esta acao nao pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Aba Contas a Pagar/Receber ────────────────────────────────────────────────
type ContaFiltro = "todos" | "pagar" | "receber" | "vencidas" | "pagas";

function ContasTab({ isActive }: { isActive: boolean }) {
  const [contas,  setContas]  = useState<Conta[]>([]);
  const [loading, setLoading] = useState(false);
  const loaded = useRef(false);
  const [filtro, setFiltro]   = useState<ContaFiltro>("todos");
  const [open,   setOpen]     = useState(false);
  const [delId,  setDelId]    = useState<string | null>(null);
  const [saving, setSaving]   = useState(false);

  // Form
  const [desc,      setDesc]      = useState("");
  const [valor,     setValor]     = useState("");
  const [tipo,      setTipo]      = useState<ContaTipo>("pagar");
  const [venc,      setVenc]      = useState("");
  const [categ,     setCateg]     = useState("");
  const [obs,       setObs]       = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setContas(await fetchContas());
      loaded.current = true;
    } catch { toast.error("Erro ao carregar contas"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (isActive && !loaded.current) load();
  }, [isActive, load]);

  function resetForm() {
    setDesc(""); setValor(""); setTipo("pagar");
    setVenc(""); setCateg(""); setObs("");
  }

  async function handleCreate() {
    if (!desc.trim() || !valor || !venc || !categ) { toast.error("Preencha todos os campos obrigatorios"); return; }
    const v = parseFloat(valor.replace(",", "."));
    if (isNaN(v) || v <= 0) { toast.error("Valor invalido"); return; }
    setSaving(true);
    try {
      const input: ContaInput = { descricao: desc, valor: v, tipo, vencimento: venc, categoria: categ, observacao: obs };
      const nova = await createConta(input);
      setContas(prev => [...prev, nova].sort((a, b) => a.vencimento.localeCompare(b.vencimento)));
      toast.success("Conta adicionada");
      setOpen(false);
      resetForm();
    } catch { toast.error("Erro ao criar conta"); }
    finally { setSaving(false); }
  }

  async function handleTogglePago(c: Conta) {
    const newStatus = c.status === "pago" ? "pendente" : "pago";
    await updateContaStatus(c.id, newStatus);
    const today = new Date().toISOString().split("T")[0];
    setContas(prev => prev.map(x => x.id === c.id
      ? { ...x, status: newStatus === "pendente" && x.vencimento < today ? "vencido" : newStatus }
      : x
    ));
    toast.success(newStatus === "pago" ? "Marcado como pago" : "Marcado como pendente");
  }

  async function handleDelete() {
    if (!delId) return;
    await deleteConta(delId);
    setContas(prev => prev.filter(x => x.id !== delId));
    setDelId(null);
    toast.success("Conta removida");
  }

  const filtered = contas.filter(c => {
    if (filtro === "pagar")    return c.tipo === "pagar"   && c.status !== "pago";
    if (filtro === "receber")  return c.tipo === "receber" && c.status !== "pago";
    if (filtro === "vencidas") return c.status === "vencido";
    if (filtro === "pagas")    return c.status === "pago";
    return true;
  });

  const totalPagar    = contas.filter(c => c.tipo === "pagar"   && c.status !== "pago").reduce((s, c) => s + Number(c.valor), 0);
  const totalReceber  = contas.filter(c => c.tipo === "receber" && c.status !== "pago").reduce((s, c) => s + Number(c.valor), 0);
  const totalVencidas = contas.filter(c => c.status === "vencido").length;
  const saldo         = totalReceber - totalPagar;

  const STATUS_BADGE: Record<string, string> = {
    pendente: "bg-secondary text-foreground",
    pago:     "bg-foreground text-background",
    vencido:  "bg-secondary text-muted-foreground border border-border",
  };
  const STATUS_LABEL_C: Record<string, string> = { pendente: "Pendente", pago: "Pago", vencido: "Vencida" };

  const FILTROS: { key: ContaFiltro; label: string }[] = [
    { key: "todos",    label: "Todas"    },
    { key: "pagar",    label: "A pagar"  },
    { key: "receber",  label: "A receber"},
    { key: "vencidas", label: "Vencidas" },
    { key: "pagas",    label: "Pagas"    },
  ];

  const CATS = tipo === "pagar" ? CATEGORIAS_PAGAR : CATEGORIAS_RECEBER;

  return (
    <div className="space-y-4">
      {/* Cards resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "A pagar",    value: fmt(totalPagar),       color: "text-foreground", bg: "bg-secondary", icon: TrendingDown  },
          { label: "A receber",  value: fmt(totalReceber),     color: "text-foreground", bg: "bg-secondary", icon: TrendingUp    },
          { label: "Vencidas",   value: String(totalVencidas), color: "text-foreground", bg: "bg-secondary", icon: CalendarClock },
          { label: "Saldo prev.",value: fmt(saldo),            color: "text-foreground", bg: "bg-secondary", icon: BarChart2     },
        ].map(m => {
          const Icon = m.icon;
          return (
            <div key={m.label} className="bg-background border border-border rounded-xl p-4">
              <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${m.bg} mb-2`}>
                <Icon className={`h-4 w-4 ${m.color}`} />
              </div>
              <p className="text-lg font-bold">{m.value}</p>
              <p className="text-xs text-muted-foreground">{m.label}</p>
            </div>
          );
        })}
      </div>

      {/* Filtros + Nova conta */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5 flex-1">
          {FILTROS.map(f => (
            <button key={f.key} onClick={() => setFiltro(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filtro === f.key
                  ? "bg-foreground text-background"
                  : "bg-background border border-border text-muted-foreground hover:text-foreground"
              }`}>
              {f.label}
              {f.key === "vencidas" && totalVencidas > 0 && (
                <span className="ml-1.5 bg-foreground text-background text-[10px] font-bold px-1 rounded-full">{totalVencidas}</span>
              )}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => { loaded.current = false; load(); }} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" onClick={() => { resetForm(); setOpen(true); }} className="gap-1.5">
            <Plus className="h-4 w-4" />Nova conta
          </Button>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-background rounded-xl border border-border overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />Carregando...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">Nenhuma conta encontrada.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descricao</TableHead>
                <TableHead className="hidden sm:table-cell">Categoria</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(c => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-foreground/40" />
                      <div>
                        <p className="font-medium text-sm">{c.descricao}</p>
                        <p className="text-xs text-muted-foreground">{c.tipo === "pagar" ? "A pagar" : "A receber"}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground hidden sm:table-cell">{c.categoria}</TableCell>
                  <TableCell>
                    <span className="font-semibold text-sm text-foreground">
                      {c.tipo === "pagar" ? "-" : "+"}{fmt(Number(c.valor))}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">
                    {new Date(c.vencimento + "T12:00:00").toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_BADGE[c.status]}`}>
                      {STATUS_LABEL_C[c.status]}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => handleTogglePago(c)}
                        title={c.status === "pago" ? "Marcar como pendente" : "Marcar como pago"}>
                        {c.status === "pago"
                          ? <Ban className="h-4 w-4 text-muted-foreground" />
                          : <BadgeCheck className="h-4 w-4 text-foreground" />}
                      </Button>
                      <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-foreground"
                        onClick={() => setDelId(c.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Dialog nova conta */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Nova conta</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <div className="grid grid-cols-2 gap-2">
                {(["pagar","receber"] as const).map(t => (
                  <button key={t} onClick={() => { setTipo(t); setCateg(""); }}
                    className={`py-2 rounded-lg text-sm font-medium border transition-colors ${
                      tipo === t ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground"
                    }`}>
                    {t === "pagar" ? "Conta a pagar" : "Conta a receber"}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Descricao *</Label>
              <Input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Ex: Aluguel de março" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Valor (R$) *</Label>
                <Input type="number" min="0" value={valor} onChange={e => setValor(e.target.value)} placeholder="0,00" />
              </div>
              <div className="space-y-1.5">
                <Label>Vencimento *</Label>
                <Input type="date" value={venc} onChange={e => setVenc(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Categoria *</Label>
              <select value={categ} onChange={e => setCateg(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm">
                <option value="">Selecione...</option>
                {CATS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Observacao</Label>
              <Input value={obs} onChange={e => setObs(e.target.value)} placeholder="Opcional" />
            </div>
            <Button className="w-full" onClick={handleCreate} disabled={saving}>
              {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
              Adicionar conta
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!delId} onOpenChange={v => { if (!v) setDelId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conta?</AlertDialogTitle>
            <AlertDialogDescription>Esta acao nao pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Aba Configurações ────────────────────────────────────────────────────────
function ConfigTab({ isActive }: { isActive: boolean }) {
  const [cfg,     setCfg]     = useState<ConfigCartao>({ taxa_pct: 2.5, parcelas_max: 6, juros_a_partir_de: 2 });
  const [loading, setLoading] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    if (!isActive || loaded.current) return;
    setLoading(true);
    fetchConfig()
      .then((c) => { setCfg(c.cartao); loaded.current = true; })
      .finally(() => setLoading(false));
  }, [isActive]);

  async function handleSave() {
    setSaving(true);
    try {
      await saveConfigCartao(cfg);
      toast.success("Configurações salvas!");
    } catch { toast.error("Erro ao salvar configurações."); }
    finally { setSaving(false); }
  }

  // Preview das parcelas
  const parcelas = calcularParcelas(100, cfg); // usa R$100 como base para mostrar %

  return (
    <div className="space-y-6 max-w-2xl">

      {/* ── Taxa de cartão ── */}
      <div className="bg-background border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-foreground" />
          <h3 className="font-semibold text-sm">Taxa de cartão de crédito</h3>
        </div>
        <div className="p-5 space-y-5">
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs">Taxa por parcela (%)</Label>
                  <div className="relative mt-1">
                    <Input
                      type="number" min={0} max={20} step={0.1}
                      value={cfg.taxa_pct}
                      onChange={e => setCfg(p => ({ ...p, taxa_pct: Number(e.target.value) }))}
                      className="pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">Acréscimo por parcela acima do mínimo</p>
                </div>
                <div>
                  <Label className="text-xs">Parcelas máximas</Label>
                  <Input
                    type="number" min={1} max={24} step={1}
                    value={cfg.parcelas_max}
                    onChange={e => setCfg(p => ({ ...p, parcelas_max: Number(e.target.value) }))}
                    className="mt-1"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">Máximo de vezes disponíveis</p>
                </div>
                <div>
                  <Label className="text-xs">Juros a partir de</Label>
                  <div className="relative mt-1">
                    <Input
                      type="number" min={1} max={cfg.parcelas_max} step={1}
                      value={cfg.juros_a_partir_de}
                      onChange={e => setCfg(p => ({ ...p, juros_a_partir_de: Number(e.target.value) }))}
                      className="pr-5"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">x</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">Parcelas sem juros antes disso</p>
                </div>
              </div>

              {/* Preview tabela */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">
                  Preview — parcelas para R$ 100,00
                </p>
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/40 text-muted-foreground">
                        <th className="px-3 py-2 text-left font-medium">Parcelas</th>
                        <th className="px-3 py-2 text-right font-medium">Valor / parcela</th>
                        <th className="px-3 py-2 text-right font-medium">Total</th>
                        <th className="px-3 py-2 text-right font-medium">Juros</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {parcelas.map(p => (
                        <tr key={p.parcelas} className="hover:bg-muted/20">
                          <td className="px-3 py-2 font-medium">{p.parcelas}x</td>
                          <td className="px-3 py-2 text-right">
                            {p.valorParcela.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {p.totalFinal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {p.temJuros ? (
                              <span className="text-muted-foreground font-medium">
                                +{((p.totalFinal - 100) / 100 * 100).toFixed(1)}%
                              </span>
                            ) : (
                              <span className="text-foreground font-medium">Sem juros</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <Button onClick={handleSave} disabled={saving} className="gap-1.5">
                {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? "Salvando..." : "Salvar configurações"}
              </Button>
            </>
          )}
        </div>
      </div>


    </div>
  );
}

// ─── Aba Comissoes ────────────────────────────────────────────────────────────
function ComissoesTab({ isActive }: { isActive: boolean }) {
  const now = new Date();
  const [mes, setMes]       = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [orders,        setOrders]        = useState<Order[]>([]);
  const [loading,       setLoading]       = useState(false);
  // Inline edit de comissao_pct
  const [editPct, setEditPct] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cols, ords] = await Promise.all([fetchColaboradores(), fetchAllOrders()]);
      setColaboradores(cols);
      setOrders(ords);
    } catch { toast.error("Erro ao carregar comissoes"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (isActive) load();
  }, [isActive, load]);

  const ordersDoMes = useMemo(() => {
    const [year, month] = mes.split("-").map(Number);
    const start = new Date(year, month - 1, 1);
    const end   = new Date(year, month, 0, 23, 59, 59);
    return orders.filter(o => {
      if (o.status === "cancelled") return false;
      const d = new Date(o.created_at);
      return d >= start && d <= end;
    });
  }, [orders, mes]);

  // Computa vendas por colaborador
  const stats = useMemo(() => {
    return colaboradores.map(col => {
      const vendas = ordersDoMes.filter(o => o.vendedor_nome === col.nome);
      const totalVendido = vendas.reduce((s, o) => s + Number(o.total), 0);
      const pct = col.comissao_pct ?? 0;
      return {
        colaborador: col,
        pedidos: vendas.length,
        totalVendido,
        comissaoPct: pct,
        valorComissao: totalVendido * (pct / 100),
      };
    }).sort((a, b) => b.totalVendido - a.totalVendido);
  }, [colaboradores, ordersDoMes]);

  const totalComissoes = stats.reduce((s, r) => s + r.valorComissao, 0);

  async function handleSavePct(col: Colaborador) {
    const raw = editPct[col.id];
    if (raw === undefined) return;
    const pct = parseFloat(raw.replace(",", "."));
    if (isNaN(pct) || pct < 0 || pct > 100) { toast.error("Percentual invalido (0-100)"); return; }
    setSavingId(col.id);
    try {
      await restPatch("colaboradores", { column: "id", value: col.id }, { comissao_pct: pct });
      setColaboradores(prev => prev.map(c => c.id === col.id ? { ...c, comissao_pct: pct } : c));
      setEditPct(prev => { const n = { ...prev }; delete n[col.id]; return n; });
      toast.success("Comissao atualizada");
    } catch { toast.error("Erro ao salvar"); }
    finally { setSavingId(null); }
  }

  function prevMes() {
    const [y, m] = mes.split("-").map(Number);
    const d = new Date(y, m - 2, 1);
    setMes(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  function nextMes() {
    const [y, m] = mes.split("-").map(Number);
    const d = new Date(y, m, 1);
    setMes(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  const mesLabel = new Date(mes + "-15").toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <div className="space-y-4">
      {/* Mes + total */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 bg-background border border-border rounded-xl px-3 py-2">
          <button onClick={prevMes} className="p-1 rounded hover:bg-secondary transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="font-semibold text-sm capitalize px-2">{mesLabel}</span>
          <button onClick={nextMes} className="p-1 rounded hover:bg-secondary transition-colors">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="bg-background border border-border rounded-xl px-4 py-2.5 text-sm flex items-center gap-2">
          <Award className="h-4 w-4 text-foreground" />
          <span className="text-muted-foreground">Total de comissoes:</span>
          <span className="font-bold">{fmt(totalComissoes)}</span>
        </div>
        <Button size="sm" variant="outline" onClick={load} className="gap-1.5 ml-auto">
          <RefreshCw className="h-3.5 w-3.5" />Atualizar
        </Button>
      </div>

      {/* Tabela */}
      <div className="bg-background rounded-xl border border-border overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />Carregando...
          </div>
        ) : colaboradores.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            Nenhum colaborador cadastrado. Adicione colaboradores primeiro.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Colaborador</TableHead>
                <TableHead className="text-center">Pedidos</TableHead>
                <TableHead className="text-right">Total vendido</TableHead>
                <TableHead className="text-center">Comissao %</TableHead>
                <TableHead className="text-right">Valor comissao</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.map(({ colaborador: col, pedidos, totalVendido, comissaoPct, valorComissao }) => {
                const isEditing  = editPct[col.id] !== undefined;
                const isSaving   = savingId === col.id;
                return (
                  <TableRow key={col.id}>
                    <TableCell>
                      <p className="font-medium text-sm">{col.nome}</p>
                      <p className="text-xs text-muted-foreground">{col.ativo ? "Ativo" : "Inativo"}</p>
                    </TableCell>
                    <TableCell className="text-center text-sm font-medium">{pedidos}</TableCell>
                    <TableCell className="text-right font-semibold text-sm">{fmt(totalVendido)}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <input
                          type="number" min="0" max="100" step="0.5"
                          value={isEditing ? editPct[col.id] : comissaoPct}
                          onChange={e => setEditPct(prev => ({ ...prev, [col.id]: e.target.value }))}
                          className="w-16 text-center text-sm border border-input rounded-md px-2 py-1 bg-background"
                        />
                        <span className="text-xs text-muted-foreground">%</span>
                        {isEditing && (
                          <Button size="sm" className="h-7 px-2" onClick={() => handleSavePct(col)} disabled={isSaving}>
                            {isSaving ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={`font-bold text-sm ${valorComissao > 0 ? "text-foreground" : "text-muted-foreground"}`}>
                        {fmt(valorComissao)}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Altere o % de comissao diretamente na tabela. O valor e calculado sobre o total vendido no mes.
      </p>
    </div>
  );
}

// ─── Grupos de navegação da sidebar ──────────────────────────────────────────
interface NavEntry { id: string; label: string; icon: LucideIcon }
interface NavGroup { label: string; items: NavEntry[] }

const NAV_GROUPS: NavGroup[] = [
  {
    label: "GERAL",
    items: [
      { id: "dashboard", label: "Dashboard",   icon: BarChart2   },
      { id: "pedidos",   label: "Pedidos",     icon: ShoppingBag },
    ],
  },
  {
    label: "ATENDIMENTO",
    items: [
      { id: "pdv",      label: "Nova Venda",  icon: ShoppingCart },
      { id: "clientes", label: "Clientes",    icon: Users        },
    ],
  },
  {
    label: "FINANCEIRO",
    items: [
      { id: "caixa",         label: "Fechamento",      icon: Landmark      },
      { id: "fluxo-caixa",   label: "Fluxo de Caixa", icon: Wallet        },
      { id: "contas",        label: "Contas",          icon: CreditCard    },
      { id: "metas",         label: "Metas",           icon: Target        },
      { id: "relatorios",    label: "Relatorios",      icon: FileBarChart2 },
      { id: "comissoes",     label: "Comissoes",       icon: Award         },
      { id: "colaboradores", label: "Colaboradores",   icon: Users         },
    ],
  },
  {
    label: "MARKETING",
    items: [
      { id: "cupons", label: "Cupons", icon: Tag },
    ],
  },
  {
    label: "SISTEMA",
    items: [
      { id: "configuracoes", label: "Configurações", icon: Settings },
    ],
  },
  {
    label: "CATÁLOGO",
    items: [
      { id: "estoque",      label: "Estoque",      icon: Boxes      },
      { id: "fornecedores", label: "Fornecedores", icon: Building2  },
      { id: "produtos",     label: "Produtos",     icon: Package    },
      { id: "secoes",       label: "Secoes",       icon: LayoutList },
      { id: "banners",      label: "Banners",      icon: ImageIcon  },
    ],
  },
];

const PAGE_TITLES: Record<string, { title: string; sub: string }> = {
  dashboard: { title: "Visão geral",           sub: "Resumo de desempenho da loja." },
  pedidos:   { title: "Gerenciar pedidos",      sub: "Visualize, filtre e atualize o status de cada pedido." },
  pdv:       { title: "Nova Venda — PDV",       sub: "Registre vendas presenciais rapidamente." },
  clientes:       { title: "Clientes",               sub: "Clientes cadastrados na plataforma." },
  "fluxo-caixa":   { title: "Fluxo de Caixa",   sub: "Registre entradas e saidas e acompanhe o saldo." },
  colaboradores:   { title: "Colaboradores",    sub: "Gerencie a equipe da loja." },
  estoque:         { title: "Estoque",          sub: "Controle as quantidades de produtos e receba alertas de reposicao." },
  metas:           { title: "Metas do mes",     sub: "Defina metas de faturamento e pedidos e acompanhe o progresso." },
  relatorios:      { title: "Relatorios",       sub: "Analise vendas, produtos e colaboradores por periodo." },
  cupons:          { title: "Cupons de desconto", sub: "Crie e gerencie codigos promocionais para seus clientes." },
  contas:          { title: "Contas a pagar/receber", sub: "Controle seus compromissos financeiros e recebimentos." },
  comissoes:       { title: "Comissoes",         sub: "Calcule automaticamente as comissoes dos colaboradores por mes." },
  configuracoes:   { title: "Configurações",     sub: "Taxa de cartão, parcelas e outras preferências do sistema." },
  caixa:           { title: "Fechamento de Caixa", sub: "Registre o saldo do dia, sincronize totais e feche o caixa." },
  fornecedores:    { title: "Fornecedores",       sub: "Cadastre e gerencie seus fornecedores de produtos." },
  produtos:  { title: "Produtos",               sub: "Gerencie o catálogo de produtos da loja." },
  secoes:    { title: "Seções do carrossel",    sub: "Crie, renomeie e reordene seções da página inicial." },
  banners:   { title: "Banners",                sub: "Imagens do carrossel principal — recomendado 1200 × 400 px." },
};

// ─── Dashboard do Colaborador ─────────────────────────────────────────────────
function ColaboradorDashboard({ userRole, email }: { userRole: UserRole; email: string }) {
  const ICON_POR_ABA: Record<string, LucideIcon> = {
    pdv:           ShoppingCart,
    pedidos:       ShoppingBag,
    clientes:      Users,
    caixa:         Landmark,
    "fluxo-caixa": Wallet,
    estoque:       Boxes,
  };

  const abasDisponiveis = ABAS_COLABORADOR.filter(a => userRole.permissoes.includes(a.id));

  // "inicio" é sempre a tela inicial; as demais são as abas liberadas
  const [activeTab, setActiveTab] = useState("inicio");

  // ── Dados do dashboard de início ──────────────────────────────────────────
  const [orders,      setOrders]      = useState<Order[]>([]);
  const [loadingDash, setLoadingDash] = useState(false);
  const dashLoaded = useRef(false);

  useEffect(() => {
    if (activeTab !== "inicio" || dashLoaded.current) return;
    setLoadingDash(true);
    fetchAllOrders()
      .then(data => { setOrders(data); dashLoaded.current = true; })
      .catch(() => {})
      .finally(() => setLoadingDash(false));
  }, [activeTab]);

  // Métricas calculadas
  const hoje        = new Date();
  const inicioHoje  = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const inicioMes   = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

  const pedidosHoje = orders.filter(o => new Date(o.created_at) >= inicioHoje);
  const pedidosMes  = orders.filter(o => new Date(o.created_at) >= inicioMes && o.status !== "cancelled");
  const pendentes   = orders.filter(o => o.status === "pending");
  const receitaHoje = pedidosHoje.filter(o => o.status !== "cancelled").reduce((s, o) => s + Number(o.total), 0);
  const receitaMes  = pedidosMes.reduce((s, o) => s + Number(o.total), 0);
  const recentOrders = [...orders].slice(0, 6);

  const heading = PAGE_TITLES[activeTab] ?? { title: "", sub: "" };

  // ── Tela inicial (dashboard de informações) ────────────────────────────────
  function InicioTab() {
    if (loadingDash) {
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-background rounded-xl border border-border p-5 space-y-3">
                <div className="h-8 w-8 bg-muted animate-pulse rounded-lg" />
                <div className="h-7 bg-muted animate-pulse rounded w-24" />
                <div className="h-3 bg-muted animate-pulse rounded w-32" />
              </div>
            ))}
          </div>
        </div>
      );
    }

    const metrics = [
      {
        label: "Pedidos hoje",
        value: String(pedidosHoje.length),
        sub:   `${pedidosMes.length} no mês`,
        icon:  ShoppingBag,
        color: "text-foreground",
        bg:    "bg-secondary",
      },
      {
        label: "Receita hoje",
        value: fmt(receitaHoje),
        sub:   "••••• no mês",
        icon:  TrendingUp,
        color: "text-foreground",
        bg:    "bg-secondary",
      },
      {
        label: "Aguardando pagto.",
        value: String(pendentes.length),
        sub:   pendentes.length > 0 ? "Requerem atenção" : "Tudo em dia",
        icon:  AlertCircle,
        color: "text-foreground",
        bg:    "bg-secondary",
      },
      {
        label: "Total de pedidos",
        value: String(orders.length),
        sub:   "Desde o início",
        icon:  BarChart2,
        color: "text-foreground",
        bg:    "bg-secondary",
      },
    ];

    return (
      <div className="space-y-6">

        {/* Cards de métricas */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map(m => {
            const Icon = m.icon;
            return (
              <div key={m.label} className="bg-background rounded-xl border border-border p-5">
                <div className={`inline-flex items-center justify-center w-9 h-9 rounded-lg ${m.bg} mb-3`}>
                  <Icon className={`h-4 w-4 ${m.color}`} />
                </div>
                <p className="text-2xl font-bold text-foreground leading-tight">{m.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{m.label}</p>
                <p className="text-[11px] text-muted-foreground/70 mt-0.5">{m.sub}</p>
              </div>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">

          {/* Últimos pedidos */}
          <div className="lg:col-span-2 bg-background rounded-xl border border-border overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="font-semibold text-sm">Últimos pedidos</h3>
              {abasDisponiveis.some(a => a.id === "pedidos") && (
                <button
                  onClick={() => setActiveTab("pedidos")}
                  className="text-xs text-foreground hover:underline"
                >
                  Ver todos
                </button>
              )}
            </div>
            {recentOrders.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Nenhum pedido ainda.</div>
            ) : (
              <div className="divide-y divide-border">
                {recentOrders.map(o => (
                  <div key={o.id} className="flex items-center justify-between px-5 py-3 gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{o.customer_name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">{fmtDateTime(o.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Badge
                        variant="secondary"
                        className={`text-[10px] ${STATUS_COLOR[o.status]}`}
                      >
                        <StatusIcon status={o.status} />
                        <span className="ml-1">{STATUS_LABEL[o.status]}</span>
                      </Badge>
                      <span className="text-sm font-semibold">{fmt(Number(o.total))}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Acesso rápido */}
          <div className="bg-background rounded-xl border border-border overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h3 className="font-semibold text-sm">Acesso rápido</h3>
            </div>
            {abasDisponiveis.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                Nenhuma aba liberada pelo administrador.
              </div>
            ) : (
              <div className="p-3 space-y-1">
                {abasDisponiveis.map(aba => {
                  const Icon = ICON_POR_ABA[aba.id] ?? Package;
                  return (
                    <button
                      key={aba.id}
                      onClick={() => setActiveTab(aba.id)}
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-secondary transition-colors text-left group"
                    >
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-secondary group-hover:bg-foreground/20 transition-colors">
                        <Icon className="h-4 w-4 text-foreground" />
                      </div>
                      <span className="text-sm font-medium">{aba.label}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>
    );
  }

  const [sidebarOpen,    setSidebarOpen]    = useState(false);
  const [sidebarMounted, setSidebarMounted] = useState(false);
  const [sidebarShown,   setSidebarShown]   = useState(false);

  useEffect(() => {
    if (sidebarOpen) {
      setSidebarMounted(true);
      const t = setTimeout(() => setSidebarShown(true), 10);
      return () => clearTimeout(t);
    } else {
      setSidebarShown(false);
    }
  }, [sidebarOpen]);

  // Todos os itens de navegação (início + abas liberadas)
  const navItems = [
    { id: "inicio", label: "Início", icon: BarChart2 },
    ...abasDisponiveis.map(a => ({ id: a.id, label: a.label, icon: ICON_POR_ABA[a.id] ?? Package })),
  ];

  function SidebarNav() {
    return (
      <nav className="p-3 space-y-1">
        <div className="px-3 pb-2">
          <div className="flex items-center gap-2 py-2 px-3 bg-gray-800 rounded-lg">
            <ShieldAlert className="h-3.5 w-3.5 text-gray-400 shrink-0" />
            <span className="text-xs font-medium text-gray-300">Acesso colaborador</span>
          </div>
        </div>
        {navItems.map(item => {
          const Icon     = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                isActive
                  ? "bg-white text-gray-900"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </button>
          );
        })}
      </nav>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-gray-50 flex flex-col">

      {/* ── Header via portal (escapa o transform do AnimatedRoutes) ─── */}
      {createPortal(
        <header className="bg-gray-950 border-b border-gray-800 fixed top-0 left-0 right-0 z-[55]">
          <div className="flex items-center justify-between px-4 py-3 gap-3">
            <div className="flex items-center gap-3">
              <button
                className="lg:hidden p-1.5 rounded-lg hover:bg-gray-800 transition-colors text-gray-300"
                onClick={() => setSidebarOpen(o => !o)}
                aria-label="Menu"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-lg font-black text-white tracking-tight">{STORE_NAME}</span>
                <span className="ml-1 hidden sm:inline-flex text-[10px] font-bold bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full uppercase tracking-widest">Colaborador</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400 hidden sm:inline truncate max-w-[180px]">{email}</span>
              <Button variant="ghost" size="sm" onClick={() => supabase.auth.signOut()} className="gap-1.5 text-gray-300 hover:text-white hover:bg-gray-800">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sair</span>
              </Button>
            </div>
          </div>
        </header>,
        document.body
      )}

      <div className="flex flex-1 overflow-hidden pt-[57px]">

        {/* ── Sidebar desktop ─────────────────────────────────────────── */}
        <aside className="hidden lg:flex lg:flex-col w-52 shrink-0 bg-gray-950 border-r border-gray-800 overflow-y-auto">
          <SidebarNav />
        </aside>

        {/* ── Sidebar mobile overlay ──────────────────────────────────── */}
        {sidebarMounted && createPortal(
          <>
            <div
              className={`fixed inset-0 bg-black/60 z-[60] lg:hidden transition-opacity duration-300 ${sidebarShown ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
              onClick={() => setSidebarOpen(false)}
            />
            <aside
              className={`fixed left-0 top-0 bottom-0 w-64 bg-gray-950 border-r border-gray-800 z-[61] overflow-y-auto lg:hidden transition-transform duration-300 ease-in-out ${sidebarShown ? "translate-x-0" : "-translate-x-full"}`}
              onTransitionEnd={() => { if (!sidebarOpen) setSidebarMounted(false); }}
            >
              <SidebarNav />
            </aside>
          </>,
          document.body
        )}

        {/* ── Conteúdo principal ─────────────────────────────────────── */}
        <main className="flex-1 min-w-0 p-4 md:p-6 overflow-y-auto overflow-x-hidden">
          {activeTab !== "inicio" && heading.title && (
            <div className="mb-6">
              <h2 className="text-xl font-bold">{heading.title}</h2>
              <p className="text-sm text-muted-foreground">{heading.sub}</p>
            </div>
          )}

          {activeTab === "inicio"      && <InicioTab />}
          {activeTab === "pdv"         && <PDVTab         isActive />}
          {activeTab === "pedidos"     && <AdminOrdersTab isActive isAdmin={false} />}
          {activeTab === "clientes"    && <ClientesTab    isActive />}
          {activeTab === "caixa"       && <CaixaTab       isActive />}
          {activeTab === "fluxo-caixa" && <FluxoCaixaTab  isActive />}
          {activeTab === "estoque"     && <EstoqueTab     isActive isAdmin={false} />}
        </main>

      </div>
    </div>
  );
}

// ─── Dashboard principal ──────────────────────────────────────────────────────
function AdminDashboard({ userRole }: { userRole: UserRole | null }) {
  const [activeTab,    setActiveTab]    = useState("dashboard");
  const [sidebarOpen,    setSidebarOpen]    = useState(false);
  const [sidebarMounted, setSidebarMounted] = useState(false);
  const [sidebarShown,   setSidebarShown]   = useState(false);

  useEffect(() => {
    if (sidebarOpen) {
      setSidebarMounted(true);
      const t = setTimeout(() => setSidebarShown(true), 10);
      return () => clearTimeout(t);
    } else {
      setSidebarShown(false);
    }
  }, [sidebarOpen]);

  // null = sem registro no banco = admin original (retrocompat)
  const isAdmin      = !userRole || userRole.role === "admin";
  const permissoesSet = new Set(userRole?.permissoes ?? []);

  // Abas visíveis para este usuário
  const navGroupsFiltrados = NAV_GROUPS
    .map(group => ({
      ...group,
      items: group.items.filter(item =>
        isAdmin || permissoesSet.has(item.id)
      ),
    }))
    .filter(group => group.items.length > 0);

  // Se o activeTab não estiver mais disponível, redirecionar para o primeiro disponível
  const allVisibleIds = navGroupsFiltrados.flatMap(g => g.items.map(i => i.id));
  useEffect(() => {
    if (!isAdmin && !allVisibleIds.includes(activeTab)) {
      setActiveTab(allVisibleIds[0] ?? "pdv");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const heading = PAGE_TITLES[activeTab] ?? { title: activeTab, sub: "" };

  /* Sidebar content (shared entre desktop e mobile overlay) */
  function SidebarNav() {
    return (
      <nav className="p-3 space-y-5">
        {/* Badge de papel na sidebar */}
        {!isAdmin && (
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-800 rounded-lg">
            <ShieldAlert className="h-3.5 w-3.5 text-gray-400 shrink-0" />
            <span className="text-xs font-medium text-gray-300">Acesso colaborador</span>
          </div>
        )}
        {navGroupsFiltrados.map(group => (
          <div key={group.label}>
            <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest px-3 mb-1.5">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map(item => {
                const Icon     = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                      isActive
                        ? "bg-white text-gray-900"
                        : "text-gray-400 hover:bg-gray-800 hover:text-white"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-gray-50 flex flex-col">

      {/* ── Header via portal (escapa o transform do AnimatedRoutes) ─── */}
      {createPortal(
        <header className="bg-gray-950 border-b border-gray-800 fixed top-0 left-0 right-0 z-[55]">
          <div className="flex items-center justify-between px-4 py-3 gap-3">
            <div className="flex items-center gap-3">
              {/* Hamburger — apenas mobile */}
              <button
                className="lg:hidden p-1.5 rounded-lg hover:bg-gray-800 transition-colors text-gray-300"
                onClick={() => setSidebarOpen(o => !o)}
                aria-label="Menu"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-lg font-black text-white tracking-tight">{STORE_NAME}</span>
                <span className="ml-1 hidden sm:inline-flex text-[10px] font-bold bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full uppercase tracking-widest">Admin</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-1.5 border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white bg-transparent" onClick={() => window.open("/", "_blank")}>
                <ExternalLink className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Ver loja</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => supabase.auth.signOut()} className="gap-1.5 text-gray-300 hover:text-white hover:bg-gray-800">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sair</span>
              </Button>
            </div>
          </div>
        </header>,
        document.body
      )}

      <div className="flex flex-1 overflow-hidden pt-[57px]">

        {/* ── Sidebar desktop ─────────────────────────────────────────── */}
        <aside className="hidden lg:flex lg:flex-col w-52 shrink-0 bg-gray-950 border-r border-gray-800 overflow-y-auto">
          <SidebarNav />
        </aside>

        {/* ── Sidebar mobile overlay ──────────────────────────────────── */}
        {sidebarMounted && createPortal(
          <>
            <div
              className={`fixed inset-0 bg-black/60 z-[60] lg:hidden transition-opacity duration-300 ${sidebarShown ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
              onClick={() => setSidebarOpen(false)}
            />
            <aside
              className={`fixed left-0 top-0 bottom-0 w-64 bg-gray-950 border-r border-gray-800 z-[61] overflow-y-auto lg:hidden transition-transform duration-300 ease-in-out ${sidebarShown ? "translate-x-0" : "-translate-x-full"}`}
              onTransitionEnd={() => { if (!sidebarOpen) setSidebarMounted(false); }}
            >
              <SidebarNav />
            </aside>
          </>,
          document.body
        )}

        {/* ── Conteúdo principal ─────────────────────────────────────── */}
        <main className="flex-1 min-w-0 p-3 md:p-6 overflow-y-auto overflow-x-hidden">

          {/* Cabeçalho da página */}
          <div className="mb-4 md:mb-6">
            <h2 className="text-base md:text-xl font-bold">{heading.title}</h2>
            <p className="text-xs md:text-sm text-muted-foreground hidden sm:block">{heading.sub}</p>
          </div>

          {activeTab === "dashboard" && <DashboardTab   isActive={activeTab === "dashboard"} />}
          {activeTab === "pedidos"   && <AdminOrdersTab isActive={activeTab === "pedidos"}   isAdmin={isAdmin} />}
          {activeTab === "pdv"       && <PDVTab         isActive={activeTab === "pdv"}       />}
          {activeTab === "clientes"  && <ClientesTab    isActive={activeTab === "clientes"}  />}
          {activeTab === "produtos"  && <ProductsTab    isActive={activeTab === "produtos"}  />}
          {activeTab === "secoes"    && <SectionsTab    isActive={activeTab === "secoes"}    />}
          {activeTab === "banners"      && <BannersTab      isActive={activeTab === "banners"}      />}
          {activeTab === "fluxo-caixa"   && <FluxoCaixaTab     isActive={activeTab === "fluxo-caixa"}   />}
          {activeTab === "colaboradores" && <ColaboradoresTab  isActive={activeTab === "colaboradores"} isAdmin={isAdmin} />}
          {activeTab === "estoque"       && <EstoqueTab        isActive={activeTab === "estoque"}       isAdmin={isAdmin} />}
          {activeTab === "relatorios"    && <RelatoriosTab     isActive={activeTab === "relatorios"}    />}
          {activeTab === "metas"         && <MetasTab          isActive={activeTab === "metas"}         />}
          {activeTab === "cupons"        && <CuponsTab         isActive={activeTab === "cupons"}        />}
          {activeTab === "contas"        && <ContasTab         isActive={activeTab === "contas"}        />}
          {activeTab === "comissoes"     && <ComissoesTab      isActive={activeTab === "comissoes"}     />}
          {activeTab === "configuracoes" && <ConfigTab         isActive={activeTab === "configuracoes"} />}
          {activeTab === "caixa"         && <CaixaTab          isActive={activeTab === "caixa"}         />}
          {activeTab === "fornecedores"  && <FornecedoresTab   isActive={activeTab === "fornecedores"}  />}
        </main>
      </div>

    </div>
  );
}

// ─── Pagina principal ─────────────────────────────────────────────────────────
export default function Admin() {
  const [session,  setSession]  = useState<Session | null | undefined>(undefined);
  const [userRole, setUserRole] = useState<UserRole | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  // Buscar papel do usuário sempre que a sessão mudar
  useEffect(() => {
    if (!session) { setUserRole(undefined); return; }
    fetchUserRole(session.user.id)
      .then(role => {
        // Conta revogada → forçar logout
        if (role && !role.ativo) {
          supabase.auth.signOut();
          return;
        }
        setUserRole(role); // null = sem registro = admin original
      })
      .catch(() => setUserRole(null)); // erro na tabela (ainda não migrou) = admin
  }, [session]);

  if (session === undefined || (session && userRole === undefined)) return (
    <div className="min-h-screen flex items-center justify-center bg-secondary">
      <div className="text-muted-foreground text-sm">Carregando...</div>
    </div>
  );

  if (!session) return <LoginForm />;

  const role = userRole ?? null;

  // Colaborador → dashboard simplificado
  if (role?.role === "colaborador") {
    return <ColaboradorDashboard userRole={role} email={session.user.email ?? ""} />;
  }

  return <AdminDashboard userRole={role} />;
}
