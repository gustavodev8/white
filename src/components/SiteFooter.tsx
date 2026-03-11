import { useState } from "react";
import { Mail, Truck, Shield, RefreshCw, CreditCard } from "lucide-react";
import { STORE_NAME, STORE_CNPJ, STORE_LEGAL, STORE_SLOGAN } from "@/config/storeConfig";

const footerLinks = {
  INSTITUCIONAL: ["Sobre nós", "Trabalhe conosco", "Nossa loja", "Política de privacidade"],
  AJUDA:         ["Rastrear pedido", "Trocas e devoluções", "Formas de pagamento", "Como comprar"],
};

const benefits = [
  { Icon: Truck,      title: "Frete Grátis",   desc: "Acima de R$ 199"            },
  { Icon: Shield,     title: "Compra Segura",   desc: "Ambiente protegido"         },
  { Icon: RefreshCw,  title: "Troca Grátis",    desc: "Primeira troca por nossa conta" },
  { Icon: CreditCard, title: "Parcele em 6x",   desc: "Sem juros no cartão"        },
];

const SiteFooter = () => {
  const [nome,  setNome]  = useState("");
  const [email, setEmail] = useState("");

  return (
    <footer className="mt-12">

      {/* ── Newsletter ─────────────────────────────────────────────────────── */}
      <div className="bg-gray-900 text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 shrink-0">
              <Mail className="h-5 w-5 text-primary shrink-0" />
              <p className="text-sm font-medium">
                Cadastre seu email e ganhe{" "}
                <span className="text-primary font-bold">5% de desconto</span>{" "}
                em sua primeira compra
              </p>
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <input
                type="text"
                placeholder="Nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="flex-1 md:w-40 bg-gray-800 text-white placeholder-gray-400 text-sm px-4 py-2.5 border border-gray-700 focus:outline-none focus:border-gray-500"
              />
              <input
                type="email"
                placeholder="E-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 md:w-52 bg-gray-800 text-white placeholder-gray-400 text-sm px-4 py-2.5 border border-gray-700 focus:outline-none focus:border-gray-500"
              />
              <button
                onClick={() => { setNome(""); setEmail(""); }}
                className="bg-white text-gray-900 text-xs font-bold px-5 py-2.5 tracking-widest uppercase hover:bg-gray-100 transition-colors shrink-0"
              >
                Assinar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Benefícios ─────────────────────────────────────────────────────── */}
      <div className="bg-gray-100 border-y border-gray-200">
        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {benefits.map(({ Icon, title, desc }) => (
              <div key={title} className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-gray-900 flex items-center justify-center shrink-0">
                  <Icon className="h-5 w-5 text-white" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">{title}</p>
                  <p className="text-xs text-gray-500">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Footer principal ───────────────────────────────────────────────── */}
      <div className="bg-gray-900 text-white">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">

            {/* Marca */}
            <div className="col-span-2 md:col-span-1">
              <span className="text-xl font-black tracking-tight">{STORE_NAME}</span>
              <p className="text-sm text-gray-400 mt-3 leading-relaxed max-w-xs">
                {STORE_SLOGAN || "Moda acessível com estilo e qualidade para todos os momentos."}
              </p>
            </div>

            {/* Links */}
            {Object.entries(footerLinks).map(([title, links]) => (
              <div key={title}>
                <h4 className="text-xs font-bold tracking-[0.15em] mb-5 text-white uppercase">
                  {title}
                </h4>
                <ul className="space-y-2.5">
                  {links.map((link) => (
                    <li key={link}>
                      <a href="#" className="text-sm text-gray-400 hover:text-white transition-colors">
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {/* Contato */}
            <div>
              <h4 className="text-xs font-bold tracking-[0.15em] mb-5 text-white uppercase">
                Contato
              </h4>
              <ul className="space-y-2.5 text-sm text-gray-400">
                <li>contato@{STORE_NAME.toLowerCase().replace(/\s+/g, "")}.com</li>
                <li>0800 123 4567</li>
                <li>Seg–Sex 8h às 20h</li>
                <li>Sáb 9h às 17h</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-10 pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-xs text-gray-500">
              {STORE_CNPJ && `CNPJ: ${STORE_CNPJ} — `}{STORE_LEGAL}
            </p>
            <p className="text-xs text-gray-600">
              © {new Date().getFullYear()} {STORE_NAME}. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default SiteFooter;
