import { Link } from "react-router-dom";
import { useRef, useState, useEffect } from "react";
import ProductCard from "./ProductCard";
import { useSectionProducts } from "@/hooks/useProducts";

interface ProductCarouselProps {
  title: string;
}

// ─── Hook: detecta quando a seção entra no viewport ───────────────────────────
function useInView(threshold = 0.1) {
  const ref  = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, inView };
}

const ProductCarousel = ({ title }: ProductCarouselProps) => {
  const all      = useSectionProducts(title);
  const products = all.slice(0, 8);
  const { ref, inView } = useInView(0.08);

  if (products.length === 0) return null;

  return (
    <section ref={ref} className="container mx-auto py-10 px-4">
      {/* Título com linhas decorativas */}
      <div className={`flex items-center gap-4 mb-8 transition-all duration-500 ${
        inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
      }`}>
        <div className="flex-1 h-px bg-gray-200" />
        <h2 className="text-sm font-bold text-foreground tracking-[0.2em] uppercase whitespace-nowrap px-2">
          {title}
        </h2>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* Grid de produtos com stagger */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4 max-w-5xl mx-auto">
        {products.map((product, index) => (
          <div
            key={product.id}
            className={inView ? "animate-slide-up" : "opacity-0"}
            style={{ animationDelay: inView ? `${index * 70}ms` : undefined }}
          >
            <ProductCard product={product} />
          </div>
        ))}
      </div>

      {/* Ver todos */}
      <div className={`text-center mt-8 transition-all duration-500 delay-500 ${
        inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
      }`}>
        <Link
          to={`/colecao/${encodeURIComponent(title)}`}
          onClick={() => window.scrollTo({ top: 0 })}
          className="inline-block border border-gray-900 text-gray-900 text-xs font-bold px-8 py-3 tracking-widest uppercase hover:bg-gray-900 hover:text-white transition-colors"
        >
          Ver todos
        </Link>
      </div>
    </section>
  );
};

export default ProductCarousel;
