import { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate, Link } from "react-router-dom";
import { ChevronRight, ShoppingCart, Minus, Plus, Truck, RotateCcw, Shield, AlertCircle } from "lucide-react";
import Header from "@/components/Header";
import SiteFooter from "@/components/SiteFooter";
import { useCart } from "@/hooks/useCart";
import { isSupabaseConfigured } from "@/services/supabaseClient";
import { fetchProductById } from "@/services/productsService";
import { allProducts } from "@/data/products";
import { STORE_NAME } from "@/config/storeConfig";
import type { Product } from "@/types";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Divide "P / M / G / GG" ou "36 / 37 / 38" em array de tamanhos */
function parseSizes(quantity: string): string[] {
  if (!quantity.includes("/")) return [];
  return quantity.split("/").map((s) => s.trim()).filter(Boolean);
}

export default function ProductPage() {
  const { id }      = useParams<{ id: string }>();
  const location    = useLocation();
  const navigate    = useNavigate();
  const { addItem } = useCart();

  const [product, setProduct] = useState<Product | null>(
    (location.state as { product?: Product })?.product ?? null
  );
  const [qty,     setQty]     = useState(1);
  const [size,    setSize]    = useState<string | null>(null);
  const [added,   setAdded]   = useState(false);
  const [loading, setLoading] = useState(!product);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    const t = setTimeout(() => setVisible(true), 30);
    return () => clearTimeout(t);
  }, [id]);

  useEffect(() => {
    if (product || !id) return;
    setLoading(true);
    async function load() {
      if (isSupabaseConfigured()) {
        const p = await fetchProductById(id!);
        if (p) { setProduct(p); setLoading(false); return; }
      }
      const local = allProducts.find((p) => p.id === id);
      setProduct(local ?? null);
      setLoading(false);
    }
    load();
  }, [id, product]);

  function handleAdd() {
    if (!product) return;
    if (sizes.length > 0 && !size) return;
    const effectiveStock =
      size && product.sizeStock
        ? (product.sizeStock[size] ?? product.stock ?? Infinity)
        : (product.stock ?? Infinity);
    if (effectiveStock === 0) return;
    for (let i = 0; i < qty; i++) addItem(product, size);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="container mx-auto py-32 text-center text-gray-400 text-sm">
          Carregando...
        </div>
        <SiteFooter />
      </div>
    );
  }

  // ── Não encontrado ───────────────────────────────────────────────────────────
  if (!product) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="container mx-auto py-32 text-center">
          <p className="text-xl font-bold text-gray-800 mb-2">Produto não encontrado</p>
          <button
            onClick={() => navigate("/")}
            className="mt-4 bg-gray-900 text-white px-8 py-3 text-sm font-bold uppercase tracking-widest hover:bg-black transition-colors"
          >
            Voltar ao início
          </button>
        </div>
        <SiteFooter />
      </div>
    );
  }

  const sizes = parseSizes(product.quantity);
  const sizeOutOfStockAll =
    sizes.length > 0 &&
    product.sizeStock != null &&
    sizes.every((s) => (product.sizeStock![s] ?? 1) === 0);
  const outOfStock =
    sizeOutOfStockAll ||
    // Sem grade de tamanhos: usa estoque global
    (sizes.length === 0 && product.stock !== null && product.stock === 0) ||
    // Com tamanhos mas sem sizeStock individual: fallback para estoque global
    (sizes.length > 0 && !product.sizeStock && product.stock !== null && product.stock === 0);
  const needsSize   = sizes.length > 0 && !size;
  const effectiveMax =
    size && product.sizeStock
      ? (product.sizeStock[size] ?? product.stock ?? 99)
      : (product.stock ?? 99);
  const hasDiscount = product.discount > 0;
  const parcelas    = product.price >= 150 ? 6 : 3;
  const valorParc   = product.price / parcelas;

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <div
        className={`transition-all duration-500 ease-out ${
          visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}
      >
        {/* ── Breadcrumb ──────────────────────────────────────────────────────── */}
        <div className="container mx-auto px-4 pt-5 pb-2">
          <nav className="flex items-center gap-1.5 text-xs text-gray-400">
            <Link to="/" className="hover:text-gray-700 transition-colors">Página Inicial</Link>
            <ChevronRight className="h-3 w-3" />
            <Link to={`/categoria/${product.category}`} className="hover:text-gray-700 transition-colors capitalize">
              {product.category}
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-gray-600 truncate max-w-[200px]">{product.name}</span>
          </nav>
        </div>

        {/* ── Layout: imagem + info ────────────────────────────────────────────── */}
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start justify-center max-w-5xl mx-auto">

            {/* ── Imagem ──────────────────────────────────────────────────────── */}
            <div className="w-full lg:w-[420px] shrink-0">
              <div className="bg-gray-50 rounded-xl flex items-center justify-center overflow-hidden"
                   style={{ aspectRatio: "4/4.5" }}>
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }}
                />
              </div>
            </div>

            {/* ── Informações ─────────────────────────────────────────────────── */}
            <div className="lg:w-[420px] shrink-0 flex flex-col gap-5">

              {/* Marca + Nome */}
              <div>
                <p className="text-sm text-gray-400 uppercase tracking-widest font-semibold mb-1">
                  {["J.com", "Jota", "j.com"].includes(product.brand) ? STORE_NAME : (product.brand || STORE_NAME)}
                </p>
                <h1 className="text-2xl lg:text-3xl font-black text-gray-900 leading-tight">
                  {product.name}
                </h1>
                {product.category && (
                  <p className="text-sm text-gray-400 mt-1 capitalize">{product.category}</p>
                )}
              </div>

              {/* Preço */}
              <div>
                {hasDiscount && (
                  <p className="text-sm text-gray-400 line-through mb-0.5">
                    {fmt(product.originalPrice)}
                  </p>
                )}
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-black text-gray-900">{fmt(product.price)}</span>
                  {hasDiscount && (
                    <span className="text-sm font-bold text-green-600">{product.discount}% off</span>
                  )}
                </div>
                <p className="text-sm text-gray-400 mt-1">
                  ou {parcelas}x de {fmt(valorParc)} sem juros
                </p>
              </div>

              <div className="h-px bg-gray-100" />

              {/* Tamanhos */}
              {sizes.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                      Tamanho
                    </p>
                    {size && (
                      <span className="text-sm text-gray-400">
                        Selecionado: <strong className="text-gray-700">{size}</strong>
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {sizes.map((s) => {
                      const sizeQty = product.sizeStock?.[s];
                      // esgotado por grade individual OU por estoque global sem grade
                      const sizeOos =
                        (sizeQty !== undefined && sizeQty === 0) ||
                        (!product.sizeStock && product.stock !== null && product.stock === 0);
                      return (
                        <button
                          key={s}
                          onClick={() => !sizeOos && setSize(s === size ? null : s)}
                          disabled={sizeOos}
                          title={sizeOos ? "Esgotado" : undefined}
                          className={`min-w-[52px] h-11 px-3 border text-sm font-semibold transition-colors ${
                            sizeOos
                              ? "border-gray-200 text-gray-300 line-through cursor-not-allowed"
                              : size === s
                                ? "border-gray-900 bg-gray-900 text-white"
                                : "border-gray-300 text-gray-700 hover:border-gray-700"
                          }`}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quantidade */}
              <div>
                <p className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-3">
                  Quantidade
                </p>
                <div className="inline-flex items-center border border-gray-300">
                  <button
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    disabled={outOfStock}
                    className="w-11 h-11 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-12 text-center text-sm font-bold text-gray-900">{qty}</span>
                  <button
                    onClick={() => setQty((q) => effectiveMax < 99 ? Math.min(q + 1, effectiveMax) : q + 1)}
                    disabled={outOfStock}
                    className="w-11 h-11 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Aviso de esgotado — discreto, alinhado ao estilo minimalista */}
              {outOfStock && (
                <p className="flex items-center gap-2 text-sm text-gray-400">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  Produto indisponível no momento
                </p>
              )}

              {/* Botão principal */}
              <button
                onClick={handleAdd}
                disabled={outOfStock || needsSize}
                className={`w-full h-14 flex items-center justify-center gap-2 text-sm font-black uppercase tracking-widest transition-all ${
                  outOfStock
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : needsSize
                      ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                      : added
                        ? "bg-green-600 text-white"
                        : "bg-gray-900 text-white hover:bg-black"
                }`}
              >
                <ShoppingCart className="h-5 w-5" />
                {outOfStock
                  ? "Produto esgotado"
                  : needsSize
                    ? "Selecione um tamanho"
                    : added
                      ? "Adicionado ao carrinho!"
                      : "Adicionar ao carrinho"}
              </button>

              {/* Estoque baixo — por tamanho */}
              {size && product.sizeStock && (() => {
                const s = product.sizeStock[size];
                return s !== undefined && s > 0 && s <= 5 ? (
                  <p className="text-sm text-amber-600 font-semibold -mt-2">
                    Restam apenas {s} {s === 1 ? "unidade" : "unidades"} neste tamanho
                  </p>
                ) : null;
              })()}
              {/* Estoque baixo — global (sem grade) */}
              {!product.sizeStock && product.stock !== null && product.stock > 0 && product.stock <= 5 && (
                <p className="text-sm text-amber-600 font-semibold -mt-2">
                  Restam apenas {product.stock} {product.stock === 1 ? "unidade" : "unidades"}
                </p>
              )}

              {/* Benefícios */}
              <div className="flex flex-col gap-3 pt-1">
                <div className="flex items-center gap-3 text-sm text-gray-500">
                  <Truck className="h-4 w-4 shrink-0 text-gray-400" />
                  Entrega para todo o Brasil
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-500">
                  <RotateCcw className="h-4 w-4 shrink-0 text-gray-400" />
                  Primeira troca por nossa conta
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-500">
                  <Shield className="h-4 w-4 shrink-0 text-gray-400" />
                  Compra 100% segura
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
