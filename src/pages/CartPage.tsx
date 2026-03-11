import { Link, useNavigate } from "react-router-dom";
import { Trash2, ShoppingBag, MapPin, ChevronRight, ArrowLeft } from "lucide-react";
import { useEffect } from "react";
import { useCart, cartTotal, cartCount } from "@/hooks/useCart";
import Header from "@/components/Header";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function CartPage() {
  const { items, removeItem, setQuantity, clearCart } = useCart();
  const total    = cartTotal(items);
  const count    = cartCount(items);
  const navigate = useNavigate();

  // Volta ao topo ao montar
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm text-gray-400 mb-6">
          <Link to="/" className="hover:text-[#e8001c] transition-colors">Página inicial</Link>
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
              className="mt-2 bg-[#e8001c] hover:bg-[#c4001a] text-white font-semibold px-8 py-2.5 rounded-full transition-colors text-sm"
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
                    <span className="font-semibold text-[#e8001c]">white.com</span>
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
                          className="border border-gray-200 rounded-lg text-sm text-gray-700 px-2 py-1.5 bg-white focus:outline-none focus:border-[#e8001c] cursor-pointer flex-shrink-0"
                        >
                          {Array.from({ length: maxQty }, (_, i) => i + 1).map((n) => (
                            <option key={n} value={n}>{n}</option>
                          ))}
                        </select>

                        {/* Lixeira */}
                        <button
                          onClick={() => removeItem(item.cartKey)}
                          className="text-gray-300 hover:text-[#e8001c] transition-colors flex-shrink-0"
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
                    className="text-xs text-gray-400 hover:text-[#e8001c] transition-colors"
                  >
                    Limpar cesta
                  </button>
                  <Link
                    to="/"
                    className="flex items-center gap-1.5 text-sm text-[#e8001c] hover:underline font-medium"
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
                  className="w-full bg-[#e8001c] hover:bg-[#c4001a] text-white font-bold py-3 rounded-full transition-colors text-sm"
                >
                  Prosseguir
                </button>

                {/* Continuar comprando */}
                <Link
                  to="/"
                  className="block w-full text-center text-sm text-gray-600 hover:text-[#e8001c] font-medium transition-colors py-1"
                >
                  Continuar Comprando
                </Link>
              </div>

              {/* Consultar entrega */}
              <button className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex items-center gap-3 hover:border-[#e8001c] transition-colors group">
                <MapPin className="h-4 w-4 text-gray-400 group-hover:text-[#e8001c] transition-colors flex-shrink-0" />
                <span className="flex-1 text-sm text-gray-600 text-left">Consultar entrega</span>
                <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-[#e8001c] transition-colors" />
              </button>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
