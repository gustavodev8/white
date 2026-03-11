import { Link } from "react-router-dom";

const categories = [
  {
    subtitle:   "Nova Coleção",
    label:      "FEMININO",
    slug:       "feminino",
    bg:         "#7D2828",
    circle:     "rgba(255,255,255,0.08)",
  },
  {
    subtitle:   "Look Atual",
    label:      "MASCULINO",
    slug:       "masculino",
    bg:         "#222222",
    circle:     "rgba(255,255,255,0.07)",
  },
  {
    subtitle:   "Detalhes que Importam",
    label:      "ACESSÓRIOS",
    slug:       "acessorios",
    bg:         "#7D4020",
    circle:     "rgba(255,255,255,0.08)",
  },
];

const CategoryHighlight = () => {
  return (
    <section className="container mx-auto py-10 px-4">
      {/* Título com linhas decorativas */}
      <div className="flex items-center gap-4 mb-8">
        <div className="flex-1 h-px bg-gray-200" />
        <h2 className="text-sm font-bold text-foreground tracking-[0.2em] uppercase whitespace-nowrap px-2">
          Por Categoria
        </h2>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {categories.map(({ subtitle, label, slug, bg, circle }) => (
          <div
            key={slug}
            className="relative rounded-xl overflow-hidden"
            style={{ backgroundColor: bg, minHeight: 200 }}
          >
            {/* Círculos decorativos */}
            <div
              className="absolute right-[-20px] top-1/2 -translate-y-1/2 w-48 h-48 rounded-full"
              style={{ backgroundColor: circle }}
            />
            <div
              className="absolute right-[-40px] top-1/2 -translate-y-1/2 w-64 h-64 rounded-full border"
              style={{ borderColor: circle }}
            />

            {/* Conteúdo */}
            <div className="relative z-10 p-8 flex flex-col gap-2 h-full" style={{ minHeight: 200 }}>
              <p className="text-xs text-white/70 font-semibold tracking-widest uppercase">
                {subtitle}
              </p>
              <h3 className="text-3xl md:text-4xl font-black text-white tracking-tight mt-1">
                {label}
              </h3>
              <div className="mt-auto pt-6">
                <Link
                  to={`/categoria/${slug}`}
                  className="inline-block bg-gray-900 text-white text-xs font-bold px-6 py-2.5 tracking-widest uppercase hover:bg-black transition-colors"
                >
                  Comprar
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default CategoryHighlight;
