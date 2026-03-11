import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Home, ChevronRight, PackageSearch, Plus } from "lucide-react";
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

interface CollectionConfig {
  label:        string;
  description:  string;
  type:         CollectionType;
  category?:    string;
  categories?:  string[];
  section?:     string;
  minDiscount?: number;
}

const COLLECTIONS: Record<string, CollectionConfig> = {
  feminino: {
    label:       "Feminino",
    description: "Moda feminina: roupas, calçados e acessórios para todas as ocasiões.",
    type:        "category",
    category:    "feminino",
  },
  masculino: {
    label:       "Masculino",
    description: "Moda masculina: camisas, calças, tênis e tudo que você precisa.",
    type:        "category",
    category:    "masculino",
  },
  sapatos: {
    label:       "Sapatos",
    description: "Tênis, sandálias, sapatos e calçados para todos os estilos.",
    type:        "category",
    category:    "Calçados",
  },
  bolsas: {
    label:       "Bolsas",
    description: "Bolsas, mochilas e malas para o dia a dia e ocasiões especiais.",
    type:        "category",
    category:    "bolsas",
  },
  acessorios: {
    label:       "Acessórios",
    description: "Perfumes, joias, relógios e acessórios para complementar o seu look.",
    type:        "multi-category",
    categories:  ["acessorios", "Perfumes"],
  },
  novidades: {
    label:       "Novidades",
    description: "Os lançamentos mais recentes da temporada. Seja o primeiro a conferir!",
    type:        "section",
    section:     "Novidades",
  },
  promocoes: {
    label:       "Promoções",
    description: "Os melhores preços com descontos imperdíveis. Aproveite!",
    type:        "discount",
    minDiscount: 0,
  },
  // Categorias dos produtos cadastrados
  camisas: {
    label:       "Camisas",
    description: "Camisas, camisetas e tops para todos os estilos.",
    type:        "category",
    category:    "Camisas",
  },
  calcados: {
    label:       "Calçados",
    description: "Tênis, sandálias e sapatos para todos os estilos.",
    type:        "category",
    category:    "Calçados",
  },
  shorts: {
    label:       "Shorts",
    description: "Shorts jeans, moletom e esportivos para o seu estilo.",
    type:        "category",
    category:    "Shorts",
  },
  perfumes: {
    label:       "Perfumes",
    description: "Fragrâncias masculinas e femininas para todos os gostos.",
    type:        "category",
    category:    "Perfumes",
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function installments(price: number): string | null {
  if (price < 30) return null;
  const parcelas = price >= 150 ? 6 : 3;
  const valor = price / parcelas;
  return `${parcelas}x de ${fmt(valor)}`;
}

// ─── Card de produto — estilo fashion ────────────────────────────────────────
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
      {/* Imagem — proporção retrato 3:4 */}
      <div className="relative bg-gray-50 rounded-lg overflow-hidden" style={{ aspectRatio: "3/4" }}>
        {/* Badge */}
        {outOfStock ? (
          <span className="absolute top-3 left-3 bg-gray-500 text-white text-[10px] font-bold px-2.5 py-1 z-10 tracking-wider uppercase">
            Esgotado
          </span>
        ) : stock !== null && stock <= 5 ? (
          <span className="absolute top-3 left-3 bg-amber-500 text-white text-[10px] font-bold px-2.5 py-1 z-10 tracking-wider uppercase">
            Últimas {stock}
          </span>
        ) : isPromo ? (
          <span className="absolute top-3 left-3 bg-gray-900 text-white text-[10px] font-bold px-2.5 py-1 z-10 tracking-wider uppercase">
            Promoção
          </span>
        ) : (
          <span className="absolute top-3 left-3 bg-gray-900 text-white text-[10px] font-bold px-2.5 py-1 z-10 tracking-wider uppercase">
            Nova Coleção
          </span>
        )}

        <img
          src={image}
          alt={name}
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

      {/* Info */}
      <div className="pt-3 pb-1 px-0.5">
        <p className="text-sm text-foreground font-medium leading-snug line-clamp-2 mb-2">{name}</p>
        <div>
          {isPromo && originalPrice > price && (
            <p className="text-xs text-muted-foreground line-through leading-none mb-0.5">
              {fmt(originalPrice)}
            </p>
          )}
          <p className="text-base font-bold text-foreground leading-none">{fmt(price)}</p>
          {parcelamento && (
            <p className="text-xs text-muted-foreground mt-1">{parcelamento}</p>
          )}
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

// ─── Página ───────────────────────────────────────────────────────────────────
export default function CategoryPage() {
  const { slug = "" }  = useParams<{ slug: string }>();
  const navigate        = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [visible,  setVisible]  = useState(false);

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

    async function load() {
      try {
        if (isSupabaseConfigured()) {
          let data: Product[] = [];

          if (config.type === "category" && config.category) {
            data = await fetchProductsByCategory(config.category);
          } else if (config.type === "multi-category" && config.categories) {
            data = await fetchProductsByCategories(config.categories);
          } else if (config.type === "discount") {
            data = await fetchProductsOnSale(config.minDiscount ?? 0);
          } else if (config.type === "section" && config.section) {
            data = await fetchProductsBySection(config.section);
          }

          setProducts(data);
          setLoading(false);
          setTimeout(() => setVisible(true), 30);
          return;
        }
      } catch { /* fallback */ }

      // ── Fallback local ──────────────────────────────────────────────────────
      let local: Product[] = [];

      if (config.type === "category" && config.category) {
        local = allProducts.filter((p) => p.category === config.category);
      } else if (config.type === "multi-category" && config.categories) {
        local = allProducts.filter((p) => config.categories!.includes(p.category));
      } else if (config.type === "discount") {
        local = allProducts
          .filter((p) => p.discount > (config.minDiscount ?? 0))
          .sort((a, b) => b.discount - a.discount);
      }
      // "section" type has no local fallback

      setProducts(local);
      setLoading(false);
      setTimeout(() => setVisible(true), 30);
    }

    load();
  }, [slug, config]);

  // Slug não reconhecido → início
  if (!config) {
    navigate("/", { replace: true });
    return null;
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <div
        className={`container mx-auto px-4 py-6 transition-all duration-500 ease-out ${
          visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}
      >
        {/* ── Breadcrumb ──────────────────────────────────────────────────────── */}
        <nav className="flex items-center gap-1.5 text-xs text-gray-400 mb-6 flex-wrap">
          <Link to="/" className="flex items-center gap-1 hover:text-gray-700 transition-colors">
            <Home className="h-3.5 w-3.5" /> Início
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-gray-700 font-medium">{config.label}</span>
        </nav>

        {/* ── Cabeçalho ───────────────────────────────────────────────────────── */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 uppercase tracking-wide mb-1">
            {config.label}
          </h1>
          <p className="text-sm text-gray-400">{config.description}</p>
          {!loading && (
            <p className="text-xs text-gray-400 mt-2">
              {products.length} produto{products.length !== 1 ? "s" : ""} encontrado{products.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        {/* ── Grid ─────────────────────────────────────────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
            {Array.from({ length: 10 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center py-24 gap-4 text-center">
            <PackageSearch className="h-16 w-16 text-gray-200" />
            <div>
              <p className="text-xl font-black text-gray-900 mb-1 uppercase tracking-wide">
                Nenhum produto encontrado
              </p>
              <p className="text-sm text-gray-400 max-w-sm mx-auto">
                {config.type === "discount"
                  ? "Nenhum produto com desconto no momento. Volte em breve!"
                  : "Ainda não temos produtos nesta categoria. Em breve teremos novidades!"}
              </p>
            </div>
            <button
              onClick={() => navigate("/")}
              className="mt-2 bg-gray-900 text-white px-8 py-3 text-sm font-bold uppercase tracking-widest hover:bg-black transition-colors"
            >
              Voltar ao início
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
            {products.map((p) => (
              <ProductGridCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>

      <SiteFooter />
    </div>
  );
}
