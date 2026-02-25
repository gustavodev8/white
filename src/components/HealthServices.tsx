import { ArrowRight } from "lucide-react";

const services = [
  { title: "Testes de COVID-19", desc: "Resultados rapidos e confiaveis." },
  { title: "Exames clinicos", desc: "Acompanhe sua saude regularmente." },
  { title: "Servicos farma", desc: "Aferir pressao, glicemia e mais." },
  { title: "Telessaude", desc: "Consultas online com profissionais." },
  { title: "Vacinas", desc: "Vacinas para todas as idades." },
];

const HealthServices = () => {
  return (
    <section className="container mx-auto py-8">
      <h2 className="text-xl md:text-2xl font-bold text-foreground mb-5">Espaco Mais Saude</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
        {services.map(({ title, desc }) => (
          <div
            key={title}
            className="p-5 rounded-card bg-secondary flex flex-col gap-3 hover:shadow-sm transition-shadow"
          >
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-primary font-bold text-sm">+</span>
            </div>
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
            <button className="mt-auto flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-hover transition-colors">
              Saiba mais <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
};

export default HealthServices;
