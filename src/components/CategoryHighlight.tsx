import { ArrowRight } from "lucide-react";
import categorySkin from "@/assets/category-skin.jpg";
import categoryMakeup from "@/assets/category-makeup.jpg";
import categoryDermo from "@/assets/category-dermo.jpg";
import categoryPerfume from "@/assets/category-perfume.jpg";
import categorySunscreen from "@/assets/category-sunscreen.jpg";

const categories = [
  { label: "Cuidados com a Pele", image: categorySkin },
  { label: "Maquiagem", image: categoryMakeup },
  { label: "Dermocosmeticos", image: categoryDermo },
  { label: "Perfumes", image: categoryPerfume },
  { label: "Protecao Solar", image: categorySunscreen },
];

const CategoryHighlight = () => {
  return (
    <section className="container mx-auto py-8">
      <h2 className="text-xl md:text-2xl font-bold text-foreground mb-5">Cuidados que voce merece</h2>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {categories.map(({ label, image }) => (
          <a
            key={label}
            href="#"
            className="relative rounded-card overflow-hidden group h-56 md:h-72 block"
          >
            <img
              src={image}
              alt={label}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
              <span className="text-sm font-semibold text-background">{label}</span>
              <ArrowRight className="h-4 w-4 text-background" />
            </div>
          </a>
        ))}
      </div>
    </section>
  );
};

export default CategoryHighlight;
