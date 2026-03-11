import { Sparkles, Shirt, Footprints, ShoppingBag, Watch, Gem, Baby } from "lucide-react";
import { Link } from "react-router-dom";

const icons = [
  { label: "FEMININO",   Icon: Sparkles,     slug: "feminino"   },
  { label: "MASCULINO",  Icon: Shirt,        slug: "masculino"  },
  { label: "SAPATOS",    Icon: Footprints,   slug: "sapatos"    },
  { label: "BOLSAS",     Icon: ShoppingBag,  slug: "bolsas"     },
  { label: "ACESSÓRIOS", Icon: Watch,        slug: "acessorios" },
  { label: "JOIAS",      Icon: Gem,          slug: "joias"      },
  { label: "INFANTIL",   Icon: Baby,         slug: "infantil"   },
];

const QuickAccessIcons = () => {
  return (
    <section className="container mx-auto py-8 px-4">
      <div className="flex justify-center gap-3 md:gap-6 overflow-x-auto scrollbar-hide pb-1">
        {icons.map(({ label, Icon, slug }) => (
          <Link
            key={slug}
            to={`/categoria/${slug}`}
            className="flex flex-col items-center gap-2.5 min-w-[72px] md:min-w-[88px] group"
          >
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-quick-icon flex items-center justify-center group-hover:scale-105 transition-transform">
              <Icon
                className="h-7 w-7 md:h-8 md:h-8 text-gray-500 group-hover:text-primary transition-colors"
                strokeWidth={1.5}
              />
            </div>
            <span className="text-[11px] md:text-xs text-primary font-semibold text-center leading-tight tracking-wide">
              {label}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default QuickAccessIcons;
