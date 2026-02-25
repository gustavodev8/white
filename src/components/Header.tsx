import { Search, User, Package, ShoppingCart, MapPin, Menu, Heart } from "lucide-react";

const Header = () => {
  return (
    <header className="w-full border-b border-border bg-background sticky top-0 z-50">
      {/* Top bar */}
      <div className="container mx-auto flex items-center justify-between gap-4 py-3">
        {/* Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <Heart className="h-7 w-7 text-primary" fill="currentColor" />
          <span className="text-xl font-extrabold text-primary tracking-tight">FarmaBem</span>
        </div>

        {/* Search */}
        <div className="flex-1 max-w-2xl hidden md:flex">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar na farmacia..."
              className="w-full rounded-full border border-border bg-secondary pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            />
          </div>
        </div>

        {/* Right icons */}
        <div className="flex items-center gap-5 shrink-0 text-sm">
          <button className="hidden sm:flex flex-col items-center gap-0.5 text-foreground hover:text-primary transition-colors">
            <User className="h-5 w-5" />
            <span className="text-xs">Entrar</span>
          </button>
          <button className="hidden sm:flex flex-col items-center gap-0.5 text-foreground hover:text-primary transition-colors">
            <Package className="h-5 w-5" />
            <span className="text-xs">Pedidos</span>
          </button>
          <button className="flex flex-col items-center gap-0.5 text-foreground hover:text-primary transition-colors relative">
            <ShoppingCart className="h-5 w-5" />
            <span className="text-xs font-semibold">R$ 0,00</span>
          </button>
        </div>
      </div>

      {/* Navigation bar */}
      <div className="bg-background border-t border-border">
        <div className="container mx-auto flex items-center justify-between gap-2 py-2 overflow-x-auto scrollbar-hide">
          <div className="flex items-center gap-4 text-sm shrink-0">
            <button className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
              <MapPin className="h-4 w-4" />
              <span>Insira seu CEP</span>
            </button>
            <button className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
              <Menu className="h-4 w-4" />
              <span>Categorias</span>
            </button>
            <nav className="hidden lg:flex items-center gap-4 text-muted-foreground">
              {["Farmacias", "Blog", "Servicos de saude", "Descontos", "Lojas parceiras", "Baixe o app"].map((link) => (
                <a key={link} href="#" className="hover:text-foreground transition-colors whitespace-nowrap">
                  {link}
                </a>
              ))}
            </nav>
          </div>
          <button className="shrink-0 bg-primary text-primary-foreground px-5 py-2 rounded-full text-sm font-semibold hover:bg-primary-hover transition-colors">
            Exibir descontos
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
