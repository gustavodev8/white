import { Truck, Star, RotateCcw, Tag, ShieldCheck } from "lucide-react";

const benefits = [
  { icon: Truck,       text: "Entrega rápida para todo o Brasil" },
  { icon: Star,        text: "Ganhe pontos em cada compra" },
  { icon: RotateCcw,   text: "Troca fácil em até 30 dias" },
  { icon: Tag,         text: "Novidades toda semana na coleção" },
  { icon: ShieldCheck, text: "Compra 100% segura e garantida" },
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
