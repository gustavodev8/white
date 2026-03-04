import { restGet, restPost, restPatch, restDelete } from "./supabaseRest";

export interface ColaboradorInput {
  nome:           string;
  telefone?:      string;
  email?:         string;
  cpf?:           string;
  salario?:       number | null;
  data_admissao?: string | null; // YYYY-MM-DD
  observacao?:    string;
  ativo?:         boolean;
}

export interface Colaborador extends ColaboradorInput {
  id:         string;
  ativo:      boolean;
  created_at: string;
}

/* ── fetch ──────────────────────────────────────────────────────────── */
export async function fetchColaboradores(): Promise<Colaborador[]> {
  try {
    return await restGet<Colaborador>("colaboradores", {
      select: "*",
      order:  "nome.asc",
    });
  } catch {
    return [];
  }
}

/* ── create ─────────────────────────────────────────────────────────── */
export async function createColaborador(
  input: ColaboradorInput,
): Promise<{ colaborador: Colaborador | null; error?: string }> {
  try {
    const row = await restPost<Colaborador>("colaboradores", {
      nome:          input.nome,
      telefone:      input.telefone      ?? null,
      email:         input.email         ?? null,
      cpf:           input.cpf           ?? null,
      salario:       input.salario       ?? null,
      data_admissao: input.data_admissao ?? null,
      observacao:    input.observacao    ?? null,
      ativo:         true,
    });
    return { colaborador: row };
  } catch (err) {
    return { colaborador: null, error: err instanceof Error ? err.message : "Erro ao criar colaborador" };
  }
}

/* ── update ─────────────────────────────────────────────────────────── */
export async function updateColaborador(
  id: string,
  input: Partial<ColaboradorInput>,
): Promise<void> {
  await restPatch("colaboradores", { column: "id", value: id }, {
    ...input,
    updated_at: new Date().toISOString(),
  });
}

/* ── toggle ativo ───────────────────────────────────────────────────── */
export async function toggleColaboradorAtivo(
  id: string,
  ativo: boolean,
): Promise<void> {
  await restPatch("colaboradores", { column: "id", value: id }, { ativo });
}

/* ── delete ─────────────────────────────────────────────────────────── */
export async function deleteColaborador(id: string): Promise<void> {
  await restDelete("colaboradores", { column: "id", value: id });
}
