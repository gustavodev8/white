import { restGet, restUpsert } from "./supabaseRest";

export interface CategoryCard {
  id:       string;   // slug único (feminino, masculino, acessorios)
  subtitle: string;
  label:    string;
  slug:     string;   // URL para /categoria/:slug
  bg:       string;   // cor hex do fundo
  visible:  boolean;
}

const CONFIG_KEY = "category_highlights";

export const DEFAULT_CATEGORIES: CategoryCard[] = [
  { id: "feminino",   subtitle: "Nova Coleção",          label: "FEMININO",   slug: "feminino",   bg: "#7D2828", visible: true },
  { id: "masculino",  subtitle: "Look Atual",             label: "MASCULINO",  slug: "masculino",  bg: "#222222", visible: true },
  { id: "acessorios", subtitle: "Detalhes que Importam",  label: "ACESSÓRIOS", slug: "acessorios", bg: "#7D4020", visible: true },
];

export async function fetchCategoryHighlights(): Promise<CategoryCard[]> {
  try {
    const rows = await restGet<{ id: string; valor: string }[]>("config", {
      id: `eq.${CONFIG_KEY}`,
    });
    if (rows && rows.length > 0) {
      const parsed = JSON.parse(rows[0].valor) as CategoryCard[];
      return DEFAULT_CATEGORIES.map(def => {
        const saved = parsed.find(p => p.id === def.id);
        return saved ? { ...def, ...saved } : def;
      });
    }
  } catch { /* fallback para defaults */ }
  return DEFAULT_CATEGORIES;
}

export async function saveCategoryHighlights(cats: CategoryCard[]): Promise<void> {
  await restUpsert("config", { id: CONFIG_KEY, valor: JSON.stringify(cats) });
}
