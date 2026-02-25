import { Heart } from "lucide-react";

const footerLinks = {
  Institucional: ["Sobre nos", "Trabalhe conosco", "Politica de privacidade", "Termos de uso"],
  Atendimento: ["Central de ajuda", "Fale conosco", "Trocas e devolucoes", "Como comprar"],
  Categorias: ["Medicamentos", "Beleza", "Higiene", "Vitaminas", "Infantil"],
  Aplicativo: ["Baixe para iOS", "Baixe para Android", "Vantagens do app"],
};

const SiteFooter = () => {
  return (
    <footer className="bg-foreground text-background mt-12">
      <div className="container mx-auto py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="font-semibold text-sm mb-4 text-background/90">{title}</h4>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link}>
                    <a href="#" className="text-xs text-background/60 hover:text-background/90 transition-colors">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-background/10 mt-10 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary" fill="currentColor" />
            <span className="font-bold text-sm text-background/90">FarmaBem</span>
          </div>
          <p className="text-xs text-background/40 text-center">
            CNPJ: 00.000.000/0001-00 - FarmaBem Comercio de Medicamentos LTDA. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default SiteFooter;
