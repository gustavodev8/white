import { Link } from "react-router-dom";
import ProductCard from "./ProductCard";
import { useSectionProducts } from "@/hooks/useProducts";

interface ProductCarouselProps {
  title: string;
}

const ProductCarousel = ({ title }: ProductCarouselProps) => {
  const all      = useSectionProducts(title);
  const products = all.slice(0, 8);

  if (products.length === 0) return null;

  return (
    <section className="container mx-auto py-10 px-4">
      {/* Título com linhas decorativas */}
      <div className="flex items-center gap-4 mb-8">
        <div className="flex-1 h-px bg-gray-200" />
        <h2 className="text-sm font-bold text-foreground tracking-[0.2em] uppercase whitespace-nowrap px-2">
          {title}
        </h2>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* Grid de produtos — 4 colunas fixas, 2 linhas (8 itens) centralizado */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4 max-w-5xl mx-auto">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {/* Ver todos */}
      <div className="text-center mt-8">
        <Link
          to={`/colecao/${encodeURIComponent(title)}`}
          className="inline-block border border-gray-900 text-gray-900 text-xs font-bold px-8 py-3 tracking-widest uppercase hover:bg-gray-900 hover:text-white transition-colors"
        >
          Ver todos
        </Link>
      </div>
    </section>
  );
};

export default ProductCarousel;
