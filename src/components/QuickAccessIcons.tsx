import { TrendingUp, FlaskConical, Syringe, Tag, Percent, Sparkles, Star, Ticket, Pill } from "lucide-react";

const icons = [
  { label: "Mais Buscados", Icon: TrendingUp },
  { label: "Manipulacao", Icon: FlaskConical },
  { label: "Servicos e Vacinas", Icon: Syringe },
  { label: "Suas ofertas", Icon: Tag },
  { label: "Ofertas do dia", Icon: Percent },
  { label: "Perfumes", Icon: Sparkles },
  { label: "Seus Pontos", Icon: Star },
  { label: "Cupons", Icon: Ticket },
  { label: "Dose Certa", Icon: Pill },
];

const QuickAccessIcons = () => {
  return (
    <section className="container mx-auto py-6">
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
        {icons.map(({ label, Icon }) => (
          <button
            key={label}
            className="flex flex-col items-center gap-2 min-w-[80px] group"
          >
            <div className="w-14 h-14 rounded-2xl bg-quick-icon flex items-center justify-center group-hover:scale-105 transition-transform">
              <Icon className="h-6 w-6 text-foreground" strokeWidth={1.5} />
            </div>
            <span className="text-xs text-muted-foreground text-center leading-tight group-hover:text-foreground transition-colors">
              {label}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
};

export default QuickAccessIcons;
