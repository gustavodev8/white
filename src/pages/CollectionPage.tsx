import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Home, ChevronRight, PackageSearch, Plus } from "lucide-react";
import Header from "@/components/Header";
import SiteFooter from "@/components/SiteFooter";
import { useCart } from "@/hooks/useCart";
import { isSupabaseConfigured } from "@/services/supabaseClient";
import { fetchProductsBySection } from "@/services/productsService";
import { STORE_NAME } from "@/config/storeConfig";
import type { Product } from "@/types";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function CollectionPage() {
  const { slug: rawSlug } = useParams<{ slug: string }>();
  const slug = rawSlug ? decodeURIComponent(rawSlug) : undefined;
  const navigate    = useNavigate();
  const { addItem } = useCart();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [added,    setAdded]    = useState<string | null>(null);

  // slug → human-readable title (capitalise first letter)
  const title = slug
    ? slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, " ")
    : "Coleção";

  useEffect(() => { window.scrollTo(0, 0); }, [slug]);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    async function load() {
      if (isSupabaseConfigured()) {
        try {
          const data = await fetchProductsBySection(slug!);
          setProducts(data);
        } catch {
          setProducts([]);
        }
      } else {
        setProducts([]);
      }
      setLoading(false);
    }
    load();
  }, [slug]);

  function handleAdd(product: Product) {
    addItem(product);
    setAdded(product.id);
    setTimeout(() => setAdded(null), 1500);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      {/* Hero banner */}
      <div className="bg-gray-900 text-white py-12 px-4 text-center">
        <p className="text-xs uppercase tracking-widest text-gray-400 mb-2">Coleção</p>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight">{title}</h1>
        {products.length > 0 && !loading && (
          <p className="text-gray-400 mt-2 text-sm">{products.length} produtos</p>
        )}
      </div>

      {/* Breadcrumb */}
      <div className="container mx-auto px-4 py-3">
        <nav className="flex items-center gap-1.5 text-xs text-gray-400">
          <Link to="/" className="hover:text-gray-700 transition-colors flex items-center gap-1">
            <Home className="h-3 w-3" /> Início
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-gray-600 font-medium">{title}</span>
        </nav>
      </div>

      {/* Grid */}
      <div className="container mx-auto px-4 pb-16 flex-1">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl animate-pulse" style={{ aspectRatio: "3/4" }} />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-gray-400">
            <PackageSearch className="h-16 w-16 text-gray-200" />
            <p className="text-lg font-semibold text-gray-500">Nenhum produto nesta coleção</p>
            <button
              onClick={() => navigate("/")}
              className="mt-2 bg-gray-900 hover:bg-black text-white text-sm font-bold px-8 py-2.5 rounded-full transition-colors"
            >
              Ver todos os produtos
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {products.map((product) => {
              const hasDiscount = product.discount > 0;
              const outOfStock  = product.stock !== null && product.stock === 0;
              const isAdded     = added === product.id;

              return (
                <div
                  key={product.id}
                  className="group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* Imagem */}
                  <div
                    className="relative cursor-pointer overflow-hidden bg-gray-50"
                    style={{ aspectRatio: "3/4" }}
                    onClick={() => navigate(`/produto/${product.id}`, { state: { product } })}
                  >
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }}
                    />
                    {hasDiscount && (
                      <span className="absolute top-2 left-2 bg-[#e8001c] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        -{product.discount}%
                      </span>
                    )}
                    {outOfStock && (
                      <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                        <span className="text-xs font-bold text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-200">
                          Esgotado
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-3">
                    <p className="text-[11px] text-gray-400 uppercase tracking-wide font-medium">
                      {["J.com", "Jota", "j.com"].includes(product.brand) ? STORE_NAME : product.brand}
                    </p>
                    <p
                      className="text-xs font-semibold text-gray-800 line-clamp-2 mt-0.5 leading-snug cursor-pointer hover:text-[#e8001c] transition-colors"
                      onClick={() => navigate(`/produto/${product.id}`, { state: { product } })}
                    >
                      {product.name}
                    </p>

                    {/* Preço */}
                    <div className="mt-2 flex items-baseline gap-1.5 flex-wrap">
                      <span className="text-sm font-extrabold text-gray-900">{fmt(product.price)}</span>
                      {hasDiscount && (
                        <span className="text-[10px] text-gray-400 line-through">{fmt(product.originalPrice)}</span>
                      )}
                    </div>

                    {/* Adicionar */}
                    <button
                      onClick={() => handleAdd(product)}
                      disabled={outOfStock}
                      className={`mt-2 w-full flex items-center justify-center gap-1 text-[11px] font-bold py-2 rounded-full transition-all ${
                        outOfStock
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : isAdded
                            ? "bg-green-600 text-white"
                            : "bg-gray-900 text-white hover:bg-black"
                      }`}
                    >
                      <Plus className="h-3 w-3" />
                      {isAdded ? "Adicionado!" : outOfStock ? "Esgotado" : "Adicionar"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <SiteFooter />
    </div>
  );
}
