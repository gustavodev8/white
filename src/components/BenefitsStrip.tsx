import { Truck, Star, MapPin, Heart, Stethoscope } from "lucide-react";

const benefits = [
  { icon: Truck, text: "Receba em ate 1 hora com a entrega rapida!" },
  { icon: Star, text: "Ganhe pontos em suas compras." },
  { icon: MapPin, text: "Retire na farmacia em ate 30min, gratis!" },
  { icon: Heart, text: "Descontos e beneficios em medicamentos." },
  { icon: Stethoscope, text: "Exames, testes, vacinas e muito mais." },
];

const BenefitsStrip = () => {
  return (
    <section className="container mx-auto py-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {benefits.map(({ icon: Icon, text }, i) => (
          <div
            key={i}
            className="flex items-start gap-3 p-4 rounded-card bg-secondary hover:shadow-sm transition-shadow"
          >
            <Icon className="h-5 w-5 text-primary shrink-0 mt-0.5" strokeWidth={2} />
            <p className="text-xs text-foreground leading-snug">{text}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default BenefitsStrip;
