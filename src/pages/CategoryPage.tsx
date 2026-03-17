import { useState, useEffect, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Home, ChevronRight, PackageSearch, Plus, SlidersHorizontal, X, ChevronDown } from "lucide-react";
import Header from "@/components/Header";
import SiteFooter from "@/components/SiteFooter";
import { useCart } from "@/hooks/useCart";
import { isSupabaseConfigured } from "@/services/supabaseClient";
import {
  fetchProductsByCategory,
  fetchProductsByCategories,
  fetchProductsOnSale,
  fetchProductsBySection,
} from "@/services/productsService";
import { allProducts } from "@/data/products";
import type { Product } from "@/types";

// ─── Configuração de cada coleção ─────────────────────────────────────────────
type CollectionType = "category" | "multi-category" | "discount" | "section";
type SizeMode       = "clothing" | "shoes" | "none";

interface CollectionConfig {
  label:        string;
  description:  string;
  type:         CollectionType;
  sizeMode:     SizeMode;
  category?:    string;
  categories?:  string[];
  section?:     string;
  minDiscount?: number;
}

const COLLECTIONS: Record<string, CollectionConfig> = {
  feminino:   { label: "Feminino",   description: "Moda feminina: roupas, calçados e acessórios para todas as ocasiões.", type: "category",       sizeMode: "clothing", category: "feminino"                     },
  masculino:  { label: "Masculino",  description: "Moda masculina: camisas, calças, tênis e tudo que você precisa.",      type: "category",       sizeMode: "clothing", category: "masculino"                    },
  sapatos:    { label: "Sapatos",    description: "Tênis, sandálias, sapatos e calçados para todos os estilos.",          type: "category",       sizeMode: "shoes",    category: "Calçados"                     },
  bolsas:     { label: "Bolsas",     description: "Bolsas, mochilas e malas para o dia a dia e ocasiões especiais.",      type: "category",       sizeMode: "none",     category: "Bolsas"                       },
  acessorios: { label: "Acessórios", description: "Perfumes, joias, relógios e acessórios para complementar o look.",    type: "multi-category", sizeMode: "none",     categories: ["acessorios", "Perfumes"]   },
  novidades:  { label: "Novidades",  description: "Os lançamentos mais recentes da temporada.",                           type: "section",        sizeMode: "none",     section: "Novidades"                     },
  promocoes:  { label: "Promoções",  description: "Os melhores preços com descontos imperdíveis. Aproveite!",             type: "discount",       sizeMode: "none",     minDiscount: 0                           },
  camisas:    { label: "Camisas",    description: "Camisas, camisetas e tops para todos os estilos.",                    type: "category",       sizeMode: "clothing", category: "Camisas"                      },
  calcados:   { label: "Calçados",   description: "Tênis, sandálias e sapatos para todos os estilos.",                   type: "category",       sizeMode: "shoes",    category: "Calçados"                     },
  shorts:     { label: "Shorts",     description: "Shorts jeans, moletom e esportivos para o seu estilo.",               type: "category",       sizeMode: "clothing", category: "Shorts"                       },
  perfumes:   { label: "Perfumes",   description: "Fragrâncias masculinas e femininas para todos os gostos.",            type: "category",       sizeMode: "none",     category: "Perfumes"                     },
};

// Ordem canônica de exibição dos tamanhos
const CLOTHING_ORDER = ["PP", "P", "M", "G", "GG", "XG", "XGG", "EG", "EGG"];
const SHOES_ORDER    = Array.from({ length: 19 }, (_, i) => String(33 + i)); // "33".."51"

function sortSizes(sizes: string[], mode: SizeMode): string[] {
  const order = mode === "clothing" ? CLOTHING_ORDER : mode === "shoes" ? SHOES_ORDER : [];
  if (!order.length) return sizes.sort();
  return [...sizes].sort((a, b) => {
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function installments(price: number): string | null {
  if (price < 30) return null;
  const parcelas = price >= 150 ? 6 : 3;
  const valor = price / parcelas;
  return `${parcelas}x de ${fmt(valor)}`;
}

type SortKey = "relevancia" | "menor-preco" | "maior-preco" | "maior-desconto";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "relevancia",     label: "Relevância"     },
  { value: "menor-preco",    label: "Menor preço"    },
  { value: "maior-preco",    label: "Maior preço"    },
  { value: "maior-desconto", label: "Maior desconto" },
];

// ─── Card de produto ──────────────────────────────────────────────────────────
function ProductGridCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const navigate    = useNavigate();
  const { name, originalPrice, price, discount, image, stock } = product;
  const outOfStock  = stock !== null && stock === 0;
  const isPromo     = discount > 0;
  const parcelamento = installments(price);

  return (
    <div
      onClick={() => navigate(`/produto/${product.id}`, { state: { product } })}
      className={`flex flex-col bg-background rounded-lg overflow-hidden cursor-pointer group ${
        outOfStock ? "opacity-60" : ""
      }`}
    >
      <div className="relative bg-gray-50 rounded-lg overflow-hidden" style={{ aspectRatio: "3/4" }}>
        {outOfStock ? (
          <span className="absolute top-3 left-3 bg-gray-500 text-white text-[10px] font-bold px-2.5 py-1 z-10 tracking-wider uppercase">Esgotado</span>
        ) : stock !== null && stock <= 5 ? (
          <span className="absolute top-3 left-3 bg-amber-500 text-white text-[10px] font-bold px-2.5 py-1 z-10 tracking-wider uppercase">Últimas {stock}</span>
        ) : isPromo ? (
          <span className="absolute top-3 left-3 bg-gray-900 text-white text-[10px] font-bold px-2.5 py-1 z-10 tracking-wider uppercase">Promoção</span>
        ) : (
          <span className="absolute top-3 left-3 bg-gray-900 text-white text-[10px] font-bold px-2.5 py-1 z-10 tracking-wider uppercase">Nova Coleção</span>
        )}
        <img
          src={image} alt={name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }}
        />
        {!outOfStock && (
          <button
            onClick={(e) => { e.stopPropagation(); addItem(product); }}
            title="Adicionar ao carrinho"
            className="absolute bottom-3 right-3 w-9 h-9 rounded-full bg-white shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-900 hover:text-white text-gray-900"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="pt-3 pb-1 px-0.5">
        <p className="text-sm text-foreground font-medium leading-snug line-clamp-2 mb-2">{name}</p>
        <div>
          {isPromo && originalPrice > price && (
            <p className="text-xs text-muted-foreground line-through leading-none mb-0.5">{fmt(originalPrice)}</p>
          )}
          <p className="text-base font-bold text-foreground leading-none">{fmt(price)}</p>
          {parcelamento && <p className="text-xs text-muted-foreground mt-1">{parcelamento}</p>}
        </div>
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="flex flex-col gap-3 animate-pulse">
      <div className="w-full bg-gray-100 rounded-lg" style={{ aspectRatio: "3/4" }} />
      <div className="h-3 bg-gray-100 rounded w-3/4" />
      <div className="h-3 bg-gray-100 rounded w-1/2" />
      <div className="h-4 bg-gray-100 rounded w-1/3" />
    </div>
  );
}

// ─── Painel de filtros ────────────────────────────────────────────────────────
interface FilterPanelProps {
  sizeMode:      SizeMode;
  availSizes:    string[];
  selSizes:      Set<string>;
  onToggleSize:  (s: string) => void;
  minPrice:      string;
  maxPrice:      string;
  onMinPrice:    (v: string) => void;
  onMaxPrice:    (v: string) => void;
  sort:          SortKey;
  onSort:        (v: SortKey) => void;
  activeCount:   number;
  onClear:       () => void;
}

function FilterPanel({
  sizeMode, availSizes, selSizes, onToggleSize,
  minPrice, maxPrice, onMinPrice, onMaxPrice,
  sort, onSort, activeCount, onClear,
}: FilterPanelProps) {
  return (
    <div className="border border-gray-200 rounded-xl bg-white p-4 space-y-5 animate-scale-in origin-top">

      {/* Ordenação */}
      <div>
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Ordenar por</p>
        <div className="flex flex-wrap gap-2">
          {SORT_OPTIONS.map(o => (
            <button
              key={o.value}
              onClick={() => onSort(o.value)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                sort === o.value
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Faixa de preço */}
      <div>
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Faixa de preço</p>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">R$</span>
            <input
              type="number" min={0} placeholder="Mín"
              value={minPrice}
              onChange={e => onMinPrice(e.target.value)}
              className="w-full pl-8 pr-2 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:border-gray-400 transition-colors"
            />
          </div>
          <span className="text-gray-300 text-sm">—</span>
          <div className="relative flex-1">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">R$</span>
            <input
              type="number" min={0} placeholder="Máx"
              value={maxPrice}
              onChange={e => onMaxPrice(e.target.value)}
              className="w-full pl-8 pr-2 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:border-gray-400 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Tamanhos */}
      {sizeMode !== "none" && availSizes.length > 0 && (
        <div>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">
            {sizeMode === "shoes" ? "Número" : "Tamanho"}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {availSizes.map(s => {
              const sel = selSizes.has(s);
              return (
                <button
                  key={s}
                  onClick={() => onToggleSize(s)}
                  className={`min-w-[40px] text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors ${
                    sel
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-white text-gray-700 border-gray-200 hover:border-gray-400"
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Limpar */}
      {activeCount > 0 && (
        <button
          onClick={onClear}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 transition-colors"
        >
          <X className="h-3.5 w-3.5" /> Limpar todos os filtros
        </button>
      )}
    </div>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────
export default function CategoryPage() {
  const { slug = "" }  = useParams<{ slug: string }>();
  const navigate        = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [visible,  setVisible]  = useState(false);

  const [sort,         setSort]         = useState<SortKey>("relevancia");
  const [selSizes,     setSelSizes]     = useState<Set<string>>(new Set());
  const [minPrice,     setMinPrice]     = useState("");
  const [maxPrice,     setMaxPrice]     = useState("");
  const [filtersOpen,  setFiltersOpen]  = useState(false);

  const config = COLLECTIONS[slug];

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    const t = setTimeout(() => setVisible(true), 30);
    return () => clearTimeout(t);
  }, [slug]);

  useEffect(() => {
    if (!config) return;
    setLoading(true);
    setProducts([]);
    setVisible(false);
    setSort("relevancia");
    setSelSizes(new Set());
    setMinPrice("");
    setMaxPrice("");

    async function load() {
      try {
        if (isSupabaseConfigured()) {
          let data: Product[] = [];
          if (config.type === "category" && config.category)
            data = await fetchProductsByCategory(config.category);
          else if (config.type === "multi-category" && config.categories)
            data = await fetchProductsByCategories(config.categories);
          else if (config.type === "discount")
            data = await fetchProductsOnSale(config.minDiscount ?? 0);
          else if (config.type === "section" && config.section)
            data = await fetchProductsBySection(config.section);

          setProducts(data);
          setLoading(false);
          setTimeout(() => setVisible(true), 30);
          return;
        }
      } catch { /* fallback */ }

      let local: Product[] = [];
      if (config.type === "category" && config.category)
        local = allProducts.filter(p => p.category === config.category);
      else if (config.type === "multi-category" && config.categories)
        local = allProducts.filter(p => config.categories!.includes(p.category));
      else if (config.type === "discount")
        local = allProducts.filter(p => p.discount > (config.minDiscount ?? 0)).sort((a, b) => b.discount - a.discount);

      setProducts(local);
      setLoading(false);
      setTimeout(() => setVisible(true), 30);
    }

    load();
  }, [slug, config]);

  // ── Tamanhos disponíveis extraídos dos produtos carregados ───────────────────
  const availSizes = useMemo(() => {
    if (!config || config.sizeMode === "none") return [];
    const set = new Set<string>();
    products.forEach(p => {
      if (p.sizeStock) {
        Object.entries(p.sizeStock).forEach(([size, qty]) => {
          if (qty > 0) set.add(size);
        });
      }
    });
    return sortSizes([...set], config.sizeMode);
  }, [products, config]);

  // ── Filtragem + ordenação ───────────────────────────────────────────────────
  const displayed = useMemo(() => {
    let list = [...products];

    if (selSizes.size > 0) {
      list = list.filter(p => {
        if (!p.sizeStock) return false;
        return [...selSizes].some(s => (p.sizeStock![s] ?? 0) > 0);
      });
    }

    const min = minPrice ? parseFloat(minPrice) : null;
    const max = maxPrice ? parseFloat(maxPrice) : null;
    if (min !== null) list = list.filter(p => p.price >= min);
    if (max !== null) list = list.filter(p => p.price <= max);

    if (sort === "menor-preco")         list.sort((a, b) => a.price - b.price);
    else if (sort === "maior-preco")    list.sort((a, b) => b.price - a.price);
    else if (sort === "maior-desconto") list.sort((a, b) => b.discount - a.discount);

    return list;
  }, [products, selSizes, minPrice, maxPrice, sort]);

  function toggleSize(s: string) {
    setSelSizes(prev => {
      const next = new Set(prev);
      next.has(s) ? next.delete(s) : next.add(s);
      return next;
    });
  }

  function clearFilters() {
    setSort("relevancia");
    setSelSizes(new Set());
    setMinPrice("");
    setMaxPrice("");
  }

  const activeCount =
    selSizes.size +
    (minPrice ? 1 : 0) +
    (maxPrice ? 1 : 0) +
    (sort !== "relevancia" ? 1 : 0);

  if (!config) {
    navigate("/", { replace: true });
    return null;
  }

  const hasFilters = config.sizeMode !== "none" || true; // preço sempre disponível

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <div
        className={`container mx-auto px-4 py-6 transition-all duration-500 ease-out ${
          visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}
      >
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-gray-400 mb-6 flex-wrap">
          <Link to="/" className="flex items-center gap-1 hover:text-gray-700 transition-colors">
            <Home className="h-3.5 w-3.5" /> Início
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-gray-700 font-medium">{config.label}</span>
        </nav>

        {/* Cabeçalho */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 uppercase tracking-wide mb-1">
            {config.label}
          </h1>
          <p className="text-sm text-gray-400">{config.description}</p>
        </div>

        {/* Barra de controles */}
        {!loading && products.length > 0 && (
          <div className="mb-5 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs text-gray-400 mr-auto">
                {displayed.length} produto{displayed.length !== 1 ? "s" : ""}
                {activeCount > 0 && <span className="ml-1 text-gray-500">• {activeCount} filtro{activeCount !== 1 ? "s" : ""} ativo{activeCount !== 1 ? "s" : ""}</span>}
              </p>

              {/* Botão filtros */}
              {hasFilters && (
                <button
                  onClick={() => setFiltersOpen(v => !v)}
                  className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                    filtersOpen || activeCount > 0
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-white text-gray-700 border-gray-200 hover:border-gray-400"
                  }`}
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  Filtros
                  {activeCount > 0 && (
                    <span className="ml-0.5 w-4 h-4 rounded-full bg-white text-gray-900 text-[10px] font-bold flex items-center justify-center">
                      {activeCount}
                    </span>
                  )}
                  <ChevronDown className={`h-3 w-3 transition-transform ${filtersOpen ? "rotate-180" : ""}`} />
                </button>
              )}

              {activeCount > 0 && (
                <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 transition-colors">
                  <X className="h-3 w-3" /> Limpar
                </button>
              )}
            </div>

            {/* Painel de filtros */}
            {filtersOpen && (
              <FilterPanel
                sizeMode={config.sizeMode}
                availSizes={availSizes}
                selSizes={selSizes}
                onToggleSize={toggleSize}
                minPrice={minPrice}
                maxPrice={maxPrice}
                onMinPrice={setMinPrice}
                onMaxPrice={setMaxPrice}
                sort={sort}
                onSort={setSort}
                activeCount={activeCount}
                onClear={clearFilters}
              />
            )}

            {/* Chips de tamanhos selecionados (resumo rápido) */}
            {selSizes.size > 0 && !filtersOpen && (
              <div className="flex flex-wrap gap-1.5">
                {[...selSizes].map(s => (
                  <button
                    key={s}
                    onClick={() => toggleSize(s)}
                    className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-gray-900 text-white"
                  >
                    {s} <X className="h-2.5 w-2.5" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
            {Array.from({ length: 10 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : displayed.length === 0 ? (
          <div className="flex flex-col items-center py-24 gap-4 text-center">
            <PackageSearch className="h-16 w-16 text-gray-200" />
            <div>
              <p className="text-xl font-black text-gray-900 mb-1 uppercase tracking-wide">
                Nenhum produto encontrado
              </p>
              <p className="text-sm text-gray-400 max-w-sm mx-auto">
                {activeCount > 0
                  ? "Tente remover alguns filtros para ver mais resultados."
                  : config.type === "discount"
                  ? "Nenhum produto com desconto no momento."
                  : "Ainda não temos produtos nesta categoria."}
              </p>
            </div>
            {activeCount > 0 ? (
              <button onClick={clearFilters} className="mt-2 bg-gray-900 text-white px-8 py-3 text-sm font-bold uppercase tracking-widest hover:bg-black transition-colors">
                Limpar filtros
              </button>
            ) : (
              <button onClick={() => navigate("/")} className="mt-2 bg-gray-900 text-white px-8 py-3 text-sm font-bold uppercase tracking-widest hover:bg-black transition-colors">
                Voltar ao início
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
            {displayed.map((p, index) => (
              <div key={p.id} className="animate-slide-up" style={{ animationDelay: `${Math.min(index, 12) * 55}ms` }}>
                <ProductGridCard product={p} />
              </div>
            ))}
          </div>
        )}
      </div>

      <SiteFooter />
    </div>
  );
}
