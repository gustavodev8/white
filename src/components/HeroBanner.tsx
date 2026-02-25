import { useState } from "react";
import heroBanner from "@/assets/hero-banner.jpg";

const slides = [
  {
    title: "Rotina de cuidados diarios",
    subtitle: "com ate 25% de desconto",
    cta: "Confira",
  },
  {
    title: "Vitaminas e suplementos",
    subtitle: "com ate 30% de desconto",
    cta: "Aproveite",
  },
  {
    title: "Higiene e bem-estar",
    subtitle: "com ate 20% de desconto",
    cta: "Veja mais",
  },
];

const HeroBanner = () => {
  const [current, setCurrent] = useState(0);

  return (
    <section className="container mx-auto">
      <div className="relative rounded-card overflow-hidden bg-gradient-to-r from-primary/10 to-primary/5">
        <div className="flex flex-col md:flex-row items-center">
          <div className="p-8 md:p-12 flex-1 z-10">
            <p className="text-primary font-extrabold text-3xl md:text-4xl italic leading-tight">
              {slides[current].title}
            </p>
            <p className="mt-3 text-lg text-muted-foreground">
              {slides[current].subtitle}
            </p>
            <button className="mt-5 bg-primary text-primary-foreground px-8 py-3 rounded-full font-semibold hover:bg-primary-hover transition-colors">
              {slides[current].cta}
            </button>
          </div>
          <div className="flex-1 relative">
            <img
              src={heroBanner}
              alt="Produtos em promocao"
              className="w-full h-48 md:h-72 object-cover"
            />
          </div>
        </div>
        {/* Dots */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`w-2.5 h-2.5 rounded-full transition-colors ${
                i === current ? "bg-primary" : "bg-border"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default HeroBanner;
