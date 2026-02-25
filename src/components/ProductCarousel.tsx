import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";
import ProductCard from "./ProductCard";

const sampleProducts = [
  { name: "Vitamina C Serum Facial 30ml", quantity: "30ml", oldPrice: "R$ 89,90", newPrice: "R$ 67,90", discount: 24, image: "/placeholder.svg" },
  { name: "Protetor Solar FPS 70 Facial", quantity: "50g", oldPrice: "R$ 79,90", newPrice: "R$ 59,90", discount: 25, image: "/placeholder.svg" },
  { name: "Hidratante Corporal Intensivo", quantity: "400ml", oldPrice: "R$ 45,90", newPrice: "R$ 34,90", discount: 24, image: "/placeholder.svg" },
  { name: "Shampoo Anticaspa", quantity: "200ml", oldPrice: "R$ 32,90", newPrice: "R$ 24,90", discount: 24, image: "/placeholder.svg" },
  { name: "Desodorante Aerosol 48h", quantity: "150ml", oldPrice: "R$ 22,90", newPrice: "R$ 16,90", discount: 26, image: "/placeholder.svg" },
  { name: "Creme Dental Branqueador", quantity: "90g", oldPrice: "R$ 18,90", newPrice: "R$ 13,90", discount: 26, image: "/placeholder.svg" },
  { name: "Agua Micelar Limpeza Facial", quantity: "200ml", oldPrice: "R$ 49,90", newPrice: "R$ 39,90", discount: 20, image: "/placeholder.svg" },
  { name: "Mascara de Cilios Volume Extra", quantity: "10ml", oldPrice: "R$ 55,90", newPrice: "R$ 42,90", discount: 23, image: "/placeholder.svg" },
];

interface ProductCarouselProps {
  title: string;
  products?: typeof sampleProducts;
}

const ProductCarousel = ({ title, products = sampleProducts }: ProductCarouselProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir === "left" ? -220 : 220, behavior: "smooth" });
    }
  };

  return (
    <section className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl md:text-2xl font-bold text-foreground">{title}</h2>
        <div className="flex gap-2">
          <button onClick={() => scroll("left")} className="w-9 h-9 rounded-full border border-border flex items-center justify-center hover:bg-secondary transition-colors">
            <ChevronLeft className="h-4 w-4 text-foreground" />
          </button>
          <button onClick={() => scroll("right")} className="w-9 h-9 rounded-full border border-border flex items-center justify-center hover:bg-secondary transition-colors">
            <ChevronRight className="h-4 w-4 text-foreground" />
          </button>
        </div>
      </div>
      <div ref={scrollRef} className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
        {products.map((p, i) => (
          <ProductCard key={i} {...p} />
        ))}
      </div>
    </section>
  );
};

export default ProductCarousel;
