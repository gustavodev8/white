import { Link, useNavigate } from "react-router-dom";
import { Trash2, ShoppingBag, MapPin, ChevronRight, ArrowLeft, Loader2, Package, Zap, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useCart, cartTotal, cartCount } from "@/hooks/useCart";
import Header from "@/components/Header";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function formatCep(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length > 5) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return digits;
}

interface CepResult {
  cidade: string;
  estado: string;
  bairro: string;
  logradouro: string;
}

export default function CartPage() {
  const { items, removeItem, setQuantity, clearCart } = useCart();
  const total    = cartTotal(items);
  const count    = cartCount(items);
  const navigate = useNavigate();

  // ── Consultar entrega ──────────────────────────────────────────────────────
  const [cepOpen,    setCepOpen]    = useState(false);
  const [cep,        setCep]        = useState("");
  const [cepLoading, setCepLoading] = useState(false);
  const [cepResult,  setCepResult]  = useState<CepResult | null>(null);
  const [cepError,   setCepError]   = useState("");

  async function consultarCep() {
    const digits = cep.replace(/\D/g, "");
    if (digits.length !== 8) {
      setCepError("Digite um CEP válido com 8 dígitos.");
      return;
    }
    setCepLoading(true);
    setCepError("");
    setCepResult(null);
    try {
      const res  = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (data.erro) {
        setCepError("CEP não encontrado. Verifique e tente novamente.");
      } else {
        setCepResult({
          cidade:     data.localidade,
          estado:     data.uf,
          bairro:     data.bairro,
          logradouro: data.logradouro,
        });
      }
    } catch {
      setCepError("Erro ao consultar CEP. Tente novamente.");
    } finally {
      setCepLoading(false);
    }
  }

  // Opções de frete simuladas com base no total
  const freteGratis = total >= 299.90;
  const shippingOptions = cepResult
    ? [
        {
          id:        "economico",
          name:      freteGratis ? "Frete Grátis" : "Econômico",
          desc:      freteGratis ? "Padrão · Correios" : "PAC · Correios",
          price:     freteGratis ? 0 : 15.9,
          days:      "8 a 12 dias úteis",
          highlight: freteGratis,
          Icon:      Package,
        },
        {
          id:        "expresso",
          name:      "Expresso",
          desc:      "SEDEX · Correios",
          price:     29.9,
          days:      "2 a 4 dias úteis",
          highlight: false,
          Icon:      Zap,
        },
      ]
    : [];

  function resetCep() {
    setCep("");
    setCepResult(null);
    setCepError("");
  }

  // Volta ao topo ao montar
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm text-gray-400 mb-6">
          <Link to="/" className="hover:text-gray-900 transition-colors">Página inicial</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-gray-700 font-medium">Cesta de compras</span>
        </nav>

        {/* Título */}
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Cesta de compras</h1>

        {/* Carrinho vazio */}
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <ShoppingBag className="h-20 w-20 text-gray-200" />
            <p className="text-xl font-semibold text-gray-500">Sua cesta está vazia</p>
            <p className="text-sm text-gray-400">Adicione produtos para continuar</p>
            <Link
              to="/"
              className="mt-2 bg-gray-900 hover:bg-black text-white font-semibold px-8 py-2.5 rounded-full transition-colors text-sm"
            >
              Continuar comprando
            </Link>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6 items-start">

            {/* ── Coluna esquerda — itens ───────────────────────────────────── */}
            <div className="flex-1 min-w-0 space-y-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

                {/* Cabeçalho da entrega */}
                <div className="px-6 py-4 border-b border-gray-100">
                  <p className="text-sm font-bold text-gray-700">Entrega 1</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Vendido e entregue por{" "}
                    <span className="font-semibold text-gray-900">white.com</span>
                  </p>
                </div>

                {/* Lista de produtos */}
                <ul className="divide-y divide-gray-100">
                  {items.map((item) => {
                    const sizeMax =
                      item.selectedSize && item.sizeStock
                        ? (item.sizeStock[item.selectedSize] ?? item.stock ?? 20)
                        : (item.stock ?? 20);
                    const maxQty = Math.min(sizeMax, 20);
                    return (
                      <li key={item.cartKey} className="flex items-center gap-4 px-6 py-5">
                        {/* Imagem */}
                        <div className="w-16 h-16 flex-shrink-0 bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }}
                          />
                        </div>

                        {/* Nome + marca + tamanho */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 leading-tight line-clamp-2">
                            {item.name}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <p className="text-xs text-gray-400">{item.brand}</p>
                            {item.selectedSize && (
                              <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded uppercase tracking-wide">
                                {item.selectedSize}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Preço unitário */}
                        <div className="hidden sm:block text-sm text-gray-500 flex-shrink-0 text-right w-20">
                          {fmt(item.price)}
                        </div>

                        {/* Seletor de quantidade */}
                        <select
                          value={item.cartQuantity}
                          onChange={(e) => setQuantity(item.cartKey, Number(e.target.value))}
                          className="border border-gray-200 rounded-lg text-sm text-gray-700 px-2 py-1.5 bg-white focus:outline-none focus:border-gray-900 cursor-pointer flex-shrink-0"
                        >
                          {Array.from({ length: maxQty }, (_, i) => i + 1).map((n) => (
                            <option key={n} value={n}>{n}</option>
                          ))}
                        </select>

                        {/* Lixeira */}
                        <button
                          onClick={() => removeItem(item.cartKey)}
                          className="text-gray-300 hover:text-gray-900 transition-colors flex-shrink-0"
                          title="Remover item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>

                        {/* Total linha */}
                        <div className="text-sm font-bold text-gray-800 flex-shrink-0 text-right w-20">
                          {fmt(item.price * item.cartQuantity)}
                        </div>
                      </li>
                    );
                  })}
                </ul>

                {/* Rodapé do card */}
                <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                  <button
                    onClick={clearCart}
                    className="text-xs text-gray-400 hover:text-gray-900 transition-colors"
                  >
                    Limpar cesta
                  </button>
                  <Link
                    to="/"
                    className="flex items-center gap-1.5 text-sm text-gray-900 hover:underline font-medium"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Continuar comprando
                  </Link>
                </div>
              </div>
            </div>

            {/* ── Coluna direita — resumo ───────────────────────────────────── */}
            <div className="w-full lg:w-72 xl:w-80 flex-shrink-0 space-y-3">

              {/* Resumo do pedido */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
                <h2 className="text-base font-bold text-gray-800">Resumo do pedido</h2>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Subtotal ({count})</span>
                  <span className="text-gray-700 font-medium">{fmt(total)}</span>
                </div>

                <div className="h-px bg-gray-100" />

                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-800">Total</span>
                  <div className="text-right">
                    <p className="text-xl font-extrabold text-gray-900">{fmt(total)}</p>
                    <p className="text-[11px] text-gray-400">
                      1x s/ juros de {fmt(total)}
                    </p>
                  </div>
                </div>

                {/* Prosseguir */}
                <button
                  onClick={() => navigate("/checkout")}
                  className="w-full bg-gray-900 hover:bg-black text-white font-bold py-3 rounded-full transition-colors text-sm"
                >
                  Prosseguir
                </button>

                {/* Continuar comprando */}
                <Link
                  to="/"
                  className="block w-full text-center text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors py-1"
                >
                  Continuar Comprando
                </Link>
              </div>

              {/* ── Consultar entrega ──────────────────────────────────────── */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

                {/* Header clicável */}
                <button
                  onClick={() => setCepOpen(o => !o)}
                  className="w-full px-5 py-4 flex items-center gap-3 hover:bg-gray-50 transition-colors group"
                >
                  <MapPin className="h-4 w-4 text-gray-400 group-hover:text-gray-900 transition-colors flex-shrink-0" />
                  <span className="flex-1 text-sm text-gray-600 text-left font-medium">Consultar entrega</span>
                  <ChevronRight
                    className={`h-4 w-4 text-gray-300 group-hover:text-gray-900 transition-all duration-200 ${cepOpen ? "rotate-90" : ""}`}
                  />
                </button>

                {/* Painel expandível */}
                {cepOpen && (
                  <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-4">

                    {/* Aviso frete grátis */}
                    {freteGratis && (
                      <div className="bg-green-50 border border-green-100 rounded-xl px-3 py-2.5 flex items-center gap-2">
                        <span className="text-green-600 text-lg">🎉</span>
                        <p className="text-xs text-green-700 font-medium">
                          Seu pedido tem <strong>frete grátis</strong>!
                        </p>
                      </div>
                    )}

                    {/* Input de CEP */}
                    {!cepResult ? (
                      <div className="space-y-3">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          Informe seu CEP
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="00000-000"
                          value={cep}
                          onChange={e => {
                            setCepError("");
                            setCep(formatCep(e.target.value));
                          }}
                          onKeyDown={e => e.key === "Enter" && consultarCep()}
                          maxLength={9}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:border-gray-900 transition-colors"
                        />
                        <button
                          onClick={consultarCep}
                          disabled={cepLoading}
                          className="w-full bg-gray-900 hover:bg-black text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                        >
                          {cepLoading
                            ? <><Loader2 className="h-4 w-4 animate-spin" /> Consultando...</>
                            : "Calcular frete"
                          }
                        </button>

                        {cepError && (
                          <p className="text-xs text-red-500 flex items-center gap-1">
                            <X className="h-3 w-3" /> {cepError}
                          </p>
                        )}

                        <a
                          href="https://buscacepinter.correios.com.br/app/endereco/index.php"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-xs text-gray-400 hover:text-gray-700 underline transition-colors"
                        >
                          Não sei meu CEP
                        </a>
                      </div>
                    ) : (
                      /* Resultado com endereço + opções */
                      <div className="space-y-3">

                        {/* Local encontrado */}
                        <div className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <MapPin className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-gray-800 truncate">
                                {cepResult.cidade} — {cepResult.estado}
                              </p>
                              {cepResult.bairro && (
                                <p className="text-[11px] text-gray-400 truncate">{cepResult.bairro}</p>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={resetCep}
                            className="text-gray-400 hover:text-gray-900 transition-colors flex-shrink-0 ml-2"
                            title="Trocar CEP"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {/* Opções de frete */}
                        <div className="space-y-2">
                          {shippingOptions.map(opt => (
                            <div
                              key={opt.id}
                              className={`flex items-center gap-3 rounded-xl px-3 py-3 border transition-colors ${
                                opt.highlight
                                  ? "border-green-200 bg-green-50"
                                  : "border-gray-100 bg-white"
                              }`}
                            >
                              <opt.Icon
                                className={`h-4 w-4 flex-shrink-0 ${opt.highlight ? "text-green-600" : "text-gray-400"}`}
                              />
                              <div className="flex-1 min-w-0">
                                <p className={`text-xs font-semibold ${opt.highlight ? "text-green-700" : "text-gray-800"}`}>
                                  {opt.name}
                                  {opt.highlight && (
                                    <span className="ml-1.5 text-[10px] bg-green-200 text-green-800 px-1.5 py-0.5 rounded-full font-bold">
                                      GRÁTIS
                                    </span>
                                  )}
                                </p>
                                <p className="text-[11px] text-gray-400">{opt.desc} · {opt.days}</p>
                              </div>
                              <span className={`text-xs font-bold flex-shrink-0 ${opt.highlight ? "text-green-700" : "text-gray-800"}`}>
                                {opt.price === 0 ? "Grátis" : fmt(opt.price)}
                              </span>
                            </div>
                          ))}
                        </div>

                        <p className="text-[11px] text-gray-400">
                          * Prazo contado a partir da confirmação do pagamento.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
