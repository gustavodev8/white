import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useBanners } from "@/hooks/useBanners";

const INTERVAL = 4000;

// Fallback hero quando não há banners cadastrados
function DefaultHero() {
  return (
    <div
      className="relative w-full flex items-center justify-center"
      style={{ aspectRatio: "16/5", background: "linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 50%, #1a1a1a 100%)" }}
    >
      {/* Círculos decorativos */}
      <div className="absolute left-12 top-1/2 -translate-y-1/2 w-52 h-52 rounded-full border border-white/10 hidden md:block" />
      <div className="absolute left-16 top-1/2 -translate-y-1/2 w-36 h-36 rounded-full border border-white/10 hidden md:block" />
      <div className="absolute right-16 top-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-white/5 rounded-full hidden md:block" />
      <div className="absolute right-20 top-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-white/5 rounded-full hidden md:block" />

      <div className="text-center z-10 px-6">
        <span className="inline-block bg-white text-gray-900 text-xs font-bold px-5 py-1.5 rounded-full mb-5 tracking-widest uppercase">
          Até 40% OFF
        </span>
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-white leading-tight mb-4">
          Promoção<br />Imperdível
        </h1>
        <a
          href="/categoria/novidades"
          className="inline-block bg-white text-gray-900 text-sm font-bold px-8 py-3 rounded-full tracking-widest uppercase hover:bg-gray-100 transition-colors"
        >
          Ver ofertas
        </a>
      </div>
    </div>
  );
}

const HeroBanner = () => {
  const { data: banners = [] } = useBanners();
  const [current,   setCurrent]   = useState(0);
  const [animating, setAnimating] = useState(false);

  useEffect(() => { setCurrent(0); }, [banners.length]);

  const goTo = useCallback((index: number) => {
    if (animating || banners.length === 0) return;
    setAnimating(true);
    setTimeout(() => {
      setCurrent(index);
      setAnimating(false);
    }, 400);
  }, [animating, banners.length]);

  const next = useCallback(() => {
    goTo((current + 1) % banners.length);
  }, [current, banners.length, goTo]);

  const prev = useCallback(() => {
    goTo((current - 1 + banners.length) % banners.length);
  }, [current, banners.length, goTo]);

  useEffect(() => {
    if (banners.length <= 1) return;
    const id = setInterval(next, INTERVAL);
    return () => clearInterval(id);
  }, [next, banners.length]);

  if (banners.length === 0) return <DefaultHero />;

  return (
    <section className="w-full">
      <div
        className="relative overflow-hidden select-none w-full"
        style={{ aspectRatio: "16/5" }}
      >
        {banners.map((banner, i) => (
          <div
            key={banner.id}
            className={`absolute inset-0 transition-all duration-500 ease-in-out ${
              i === current
                ? "opacity-100 scale-100 z-10"
                : "opacity-0 scale-[1.02] z-0"
            }`}
          >
            <img
              src={banner.url}
              alt={`Banner ${i + 1}`}
              className="w-full h-full object-cover"
            />
          </div>
        ))}

        {banners.length > 1 && (
          <button
            onClick={prev}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20
                       w-10 h-10 rounded-full bg-white/80 hover:bg-white
                       flex items-center justify-center shadow-md
                       transition-all hover:scale-110"
            aria-label="Banner anterior"
          >
            <ChevronLeft className="h-5 w-5 text-gray-700" />
          </button>
        )}

        {banners.length > 1 && (
          <button
            onClick={next}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20
                       w-10 h-10 rounded-full bg-white/80 hover:bg-white
                       flex items-center justify-center shadow-md
                       transition-all hover:scale-110"
            aria-label="Próximo banner"
          >
            <ChevronRight className="h-5 w-5 text-gray-700" />
          </button>
        )}

        {banners.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                aria-label={`Ir para banner ${i + 1}`}
                className={`rounded-full transition-all duration-300 ${
                  i === current
                    ? "w-7 h-2.5 bg-white shadow"
                    : "w-2.5 h-2.5 bg-white/50 hover:bg-white/80"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default HeroBanner;
