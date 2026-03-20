import {
  Search, User, ShoppingCart, Heart, X, ChevronDown,
  LogOut, Package, Menu,
} from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import { useProductSearch } from "@/hooks/useProducts";
import { useCart, cartTotal, cartCount } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import CartDrawer from "@/components/CartDrawer";
import ProductPreviewModal from "@/components/ProductPreviewModal";
import type { Product } from "@/types";
import { STORE_NAME, STORE_SLOGAN } from "@/config/storeConfig";
import { fmt } from "@/lib/formatters";

const NAV_LINKS = [
  { label: "FEMININO",   slug: "feminino",   highlight: false },
  { label: "MASCULINO",  slug: "masculino",  highlight: false },
  { label: "SAPATOS",    slug: "sapatos",    highlight: false },
  { label: "BOLSAS",     slug: "bolsas",     highlight: false },
  { label: "ACESSÓRIOS", slug: "acessorios", highlight: false },
  { label: "NOVIDADES",  slug: "novidades",  highlight: false },
];

// ─── SearchBar ────────────────────────────────────────────────────────────────
interface SearchBarProps {
  query:          string;
  open:           boolean;
  results:        Product[];
  isFetching:     boolean;
  inputRef:       React.RefObject<HTMLInputElement>;
  dropdownRef:    React.RefObject<HTMLDivElement>;
  onChange:       (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear:        () => void;
  onFocusOpen:    () => void;
  onAddToCart:    (p: Product) => void;
  onProductClick: (p: Product) => void;
  className?:     string;
}

function SearchBar({
  query, open, results, isFetching,
  inputRef, dropdownRef,
  onChange, onClear, onFocusOpen, onAddToCart, onProductClick,
  className = "",
}: SearchBarProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);

  // Recalcula posição do dropdown usando bounding rect (funciona fora de qualquer stacking context)
  const updatePos = useCallback(() => {
    if (!wrapperRef.current) return;
    const r = wrapperRef.current.getBoundingClientRect();
    setDropdownPos({ top: r.bottom + 6, left: r.left, width: r.width });
  }, []);

  useEffect(() => {
    if (!open || query.length < 2) { setDropdownPos(null); return; }
    updatePos();
    window.addEventListener("resize", updatePos);
    window.addEventListener("scroll", updatePos, true);
    return () => {
      window.removeEventListener("resize", updatePos);
      window.removeEventListener("scroll", updatePos, true);
    };
  }, [open, query, updatePos]);

  const showDropdown = open && query.length >= 2 && dropdownPos;

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <div className="flex items-center bg-gray-100 rounded-full overflow-hidden pr-1 border border-gray-200">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={onChange}
          onFocus={onFocusOpen}
          placeholder="O que você está procurando?"
          className="flex-1 bg-transparent pl-5 pr-2 py-2.5 text-sm text-gray-700 placeholder-gray-400 outline-none"
        />
        {query && (
          <button onClick={onClear} className="text-gray-400 hover:text-gray-600 mr-1 transition-colors">
            <X className="h-4 w-4" />
          </button>
        )}
        <button className="bg-gray-800 hover:bg-black text-white rounded-full p-2 transition-colors shrink-0">
          <Search className="h-4 w-4" />
        </button>
      </div>

      {/* Dropdown via portal — fora de qualquer stacking context, cliques sempre chegam */}
      {showDropdown && createPortal(
        <div
          ref={dropdownRef}
          style={{ position: "fixed", top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width, zIndex: 9999 }}
          className="bg-white border border-gray-200 rounded-xl shadow-lg max-h-[420px] overflow-y-auto animate-scale-in origin-top"
        >
          {isFetching ? (
            <div className="p-4 text-sm text-gray-400 text-center">Buscando...</div>
          ) : results.length === 0 ? (
            <div className="p-4 text-sm text-gray-400 text-center">
              Nenhum produto encontrado para &quot;{query}&quot;
            </div>
          ) : (
            <ul>
              {results.map((product) => {
                const esgotado = product.stock !== null && product.stock === 0;
                return (
                  <li
                    key={product.id}
                    /* onMouseDown com preventDefault mantém o foco no input e evita que o
                       teclado virtual feche (e redimensione a viewport) antes do click disparar */
                    onMouseDown={(e) => e.preventDefault()}
                    className="flex items-center border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
                  >
                    <Link
                      to={`/produto/${product.id}`}
                      state={{ product }}
                      onClick={() => onProductClick(product)}
                      className="flex items-center gap-3 flex-1 min-w-0 px-4 py-3"
                    >
                      <img
                        src={product.image}
                        alt={product.name}
                        className={`w-12 h-12 object-contain rounded-lg bg-gray-100 flex-shrink-0 ${esgotado ? "opacity-50" : ""}`}
                        onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{product.name}</p>
                        <p className="text-xs text-gray-400">{product.brand} · {product.quantity}</p>
                        {esgotado && (
                          <p className="text-[10px] font-semibold text-red-500 mt-0.5">Esgotado</p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-gray-800">{fmt(product.price)}</p>
                        {product.discount > 0 && (
                          <p className="text-xs text-foreground font-medium">-{product.discount}%</p>
                        )}
                      </div>
                    </Link>
                    <button
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => { e.preventDefault(); if (!esgotado) onAddToCart(product); }}
                      disabled={esgotado}
                      className={`mr-4 w-8 h-8 rounded-full flex items-center justify-center transition-colors flex-shrink-0 text-lg font-bold leading-none ${
                        esgotado ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-gray-900 text-white hover:bg-black"
                      }`}
                    >+</button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}

// ─── UserMenu ─────────────────────────────────────────────────────────────────
function UserMenu() {
  const { user, profile, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!user) {
    return (
      <button
        onClick={() => navigate("/entrar")}
        className="flex flex-col items-center gap-0.5 text-gray-600 hover:text-gray-900 transition-colors"
        title="Entrar / Cadastrar"
      >
        <User className="h-5 w-5" />
        <span className="text-[11px] font-medium hidden lg:block">Conta</span>
      </button>
    );
  }

  const firstName = profile?.name?.split(" ")[0] || "Conta";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex flex-col items-center gap-0.5 text-gray-700 hover:text-gray-900 transition-colors"
      >
        <div className="w-6 h-6 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-bold">
          {firstName.charAt(0).toUpperCase()}
        </div>
        <span className="text-[11px] font-medium flex items-center gap-0.5 hidden lg:flex">
          {firstName.slice(0, 8)}{firstName.length > 8 ? "…" : ""}
          <ChevronDown className="h-2.5 w-2.5" />
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50 animate-scale-in origin-top-right">
          <div className="px-4 py-2.5 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-800 truncate">{profile?.name || "Usuário"}</p>
            <p className="text-[11px] text-gray-400 truncate">{user.email}</p>
          </div>
          <Link
            to="/minha-conta"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
          >
            <User className="h-4 w-4" /> Minha conta
          </Link>
          <Link
            to="/minha-conta"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
          >
            <Package className="h-4 w-4" /> Meus pedidos
          </Link>
          <div className="h-px bg-gray-100 my-1" />
          <button
            onClick={async () => { setOpen(false); await signOut(); navigate("/"); }}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
          >
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Logo ─────────────────────────────────────────────────────────────────────
function StoreLogo() {
  const parts = STORE_NAME.split(" ");
  const first = parts[0] ?? STORE_NAME;
  const rest  = parts.slice(1).join(" ");
  return (
    <Link to="/" className="flex items-center shrink-0">
      <span className="text-2xl font-black text-gray-900 tracking-tight leading-none">
        {first}
        {rest && <span className="text-gray-400 font-semibold text-lg">.{rest}</span>}
        {!rest && <span className="text-gray-400 font-semibold text-lg">.com</span>}
      </span>
    </Link>
  );
}

// ─── Header principal ─────────────────────────────────────────────────────────
const Header = () => {
  const [query,          setQuery]         = useState("");
  const [open,           setOpen]          = useState(false);
  const [drawerOpen,     setDrawerOpen]    = useState(false);
  const [drawerMounted,  setDrawerMounted] = useState(false);
  const [drawerShown,    setDrawerShown]   = useState(false);
  const [cartOpen,       setCartOpen]      = useState(false);
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null);
  const [scrolled,       setScrolled]      = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (drawerOpen) {
      setDrawerMounted(true);
      const t = setTimeout(() => setDrawerShown(true), 10);
      return () => clearTimeout(t);
    } else {
      setDrawerShown(false);
    }
  }, [drawerOpen]);

  const { data: results = [], isFetching } = useProductSearch(query);
  const { items, addItem } = useCart();
  const inputRef    = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const total = cartTotal(items);
  const count = cartCount(items);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        !inputRef.current?.contains(e.target as Node)
      ) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    document.body.style.overflow = (drawerOpen || cartOpen) ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen, cartOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setOpen(true);
  };

  const handleClear = () => {
    setQuery("");
    setOpen(false);
    inputRef.current?.focus();
  };

  const handleFocusOpen = () => {
    if (query.length >= 2) setOpen(true);
  };

  const handleProductClick = (_product: Product) => {
    setOpen(false);
    setQuery("");
    // navegação feita pelo <Link> no SearchBar
  };

  const searchBarProps: SearchBarProps = {
    query, open, results, isFetching,
    inputRef, dropdownRef,
    onChange:       handleChange,
    onClear:        handleClear,
    onFocusOpen:    handleFocusOpen,
    onAddToCart:    addItem,
    onProductClick: handleProductClick,
  };

  return (
    <>
      <header className={`w-full bg-white sticky top-0 z-40 transition-shadow duration-300 ${scrolled ? "shadow-md" : ""}`}>

        {/* ── Barra de anúncio ─────────────────────────────────────────────── */}
        <div className="bg-gray-900 text-white text-center py-2 px-4">
          <p className="text-[11px] md:text-xs font-medium tracking-wide uppercase">
            {STORE_SLOGAN && STORE_SLOGAN !== "Qualidade e bem-estar"
              ? STORE_SLOGAN
              : "Frete grátis em compras acima de R$ 199 | Parcele em até 6x sem juros no cartão"}
          </p>
        </div>

        {/* ── Header mobile ────────────────────────────────────────────────── */}
        <div className="md:hidden border-b border-gray-100 shadow-sm">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={() => setDrawerOpen(true)}
              className="text-gray-700 hover:text-gray-900 transition-colors"
            >
              <Menu className="h-6 w-6" />
            </button>

            <StoreLogo />

            <button
              onClick={() => setCartOpen(true)}
              className="flex items-center gap-1 text-gray-600 hover:text-gray-900 transition-colors relative"
            >
              <div className="relative">
                <ShoppingCart className="h-6 w-6" />
                <span className="absolute -top-2 -right-2.5 min-w-[16px] h-4 bg-gray-900 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                  {count > 99 ? "99+" : count}
                </span>
              </div>
            </button>
          </div>

          <div className="px-4 pb-3">
            <SearchBar {...searchBarProps} />
          </div>
        </div>

        {/* ── Header desktop ───────────────────────────────────────────────── */}
        <div className="hidden md:block border-b border-gray-100 shadow-sm">
          <div className="container mx-auto flex items-center gap-6 px-4 py-4">
            <StoreLogo />

            <div className="flex-1 max-w-2xl mx-auto">
              <SearchBar {...searchBarProps} />
            </div>

            <div className="flex items-center gap-5 shrink-0">
              {/* Favoritos */}
              <button
                className="flex flex-col items-center gap-0.5 text-gray-600 hover:text-gray-900 transition-colors"
                title="Favoritos"
              >
                <Heart className="h-5 w-5" />
                <span className="text-[11px] font-medium hidden lg:block">Favoritos</span>
              </button>

              <UserMenu />

              {/* Carrinho */}
              <button
                onClick={() => setCartOpen(true)}
                className="flex flex-col items-center gap-0.5 text-gray-600 hover:text-gray-900 transition-colors relative"
              >
                <div className="relative">
                  <ShoppingCart className="h-5 w-5" />
                  <span className="absolute -top-2 -right-2.5 min-w-[16px] h-4 bg-gray-900 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                    {count > 99 ? "99+" : count}
                  </span>
                </div>
                <span className="text-[11px] font-medium hidden lg:block">{fmt(total)}</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── Nav desktop ──────────────────────────────────────────────────── */}
        <div className="hidden md:block border-b border-gray-100">
          <div className="container mx-auto flex items-center justify-center gap-8 px-4 py-2.5">
            {NAV_LINKS.map(({ label, slug, highlight }) => (
              <Link
                key={slug}
                to={`/categoria/${slug}`}
                className={`text-sm font-semibold tracking-wider whitespace-nowrap hover:text-foreground nav-underline ${
                  highlight ? "text-foreground" : "text-gray-700"
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </header>

      {/* ── Drawer mobile (portal → fora do transform da página) ─────────────── */}
      {drawerMounted && createPortal(
        <>
          <div
            className={`fixed inset-0 z-50 bg-black/50 transition-opacity duration-300 md:hidden ${
              drawerShown ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
            }`}
            onClick={() => setDrawerOpen(false)}
          />
          <div
            className={`fixed left-0 top-0 bottom-0 z-[51] w-72 bg-white flex flex-col shadow-2xl
              transition-transform duration-300 ease-in-out md:hidden ${
              drawerShown ? "translate-x-0" : "-translate-x-full"
            }`}
            onTransitionEnd={() => { if (!drawerOpen) setDrawerMounted(false); }}
          >
            <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
              <StoreLogo />
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1.5 rounded-full border border-gray-200 text-gray-500 hover:text-gray-800 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <nav className="flex flex-col py-3">
              {NAV_LINKS.map(({ label, slug }) => (
                <Link
                  key={slug}
                  to={`/categoria/${slug}`}
                  onClick={() => setDrawerOpen(false)}
                  className="px-6 py-3.5 text-sm font-semibold tracking-wider text-gray-800 transition-colors hover:bg-gray-50"
                >
                  {label}
                </Link>
              ))}
            </nav>

            <div className="mt-auto px-5 py-5 border-t border-gray-100">
              <Link
                to="/minha-conta"
                onClick={() => setDrawerOpen(false)}
                className="flex items-center gap-3 text-sm text-gray-600 hover:text-gray-900 py-2"
              >
                <User className="h-4 w-4" /> Minha conta
              </Link>
              <Link
                to="/minha-conta"
                onClick={() => setDrawerOpen(false)}
                className="flex items-center gap-3 text-sm text-gray-600 hover:text-gray-900 py-2"
              >
                <Package className="h-4 w-4" /> Meus pedidos
              </Link>
            </div>
          </div>
        </>,
        document.body
      )}

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />

      <ProductPreviewModal
        product={previewProduct}
        onClose={() => setPreviewProduct(null)}
      />
    </>
  );
};

export default Header;
