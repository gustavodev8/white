import { supabase } from "./supabaseClient";
import { restPatch } from "./supabaseRest";

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface UserRole {
  id:             string;
  user_id:        string;
  role:           "admin" | "colaborador";
  colaborador_id: string | null;
  permissoes:     string[];   // IDs das abas que o colaborador pode acessar
  ativo:          boolean;
  created_at:     string;
  updated_at:     string;
}

// Abas que podem ser liberadas para colaboradores (admin vê tudo)
export const ABAS_COLABORADOR: { id: string; label: string; grupo: string }[] = [
  { id: "pdv",         label: "Nova Venda (PDV)",    grupo: "Atendimento" },
  { id: "pedidos",     label: "Pedidos",             grupo: "Atendimento" },
  { id: "clientes",    label: "Clientes",            grupo: "Atendimento" },
  { id: "caixa",       label: "Fechamento de Caixa", grupo: "Financeiro"  },
  { id: "fluxo-caixa", label: "Fluxo de Caixa",      grupo: "Financeiro"  },
  { id: "estoque",     label: "Estoque",             grupo: "Catálogo"    },
];

// ── Buscar papel do usuário logado ────────────────────────────────────────────

export async function fetchUserRole(userId: string): Promise<UserRole | null> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    // 42P01 = tabela não existe (migração não rodada) → tratar como admin
    if (error.code === "42P01" || error.message.includes("does not exist")) return null;
    throw error;
  }
  return data as UserRole | null;
}

// ── Buscar acesso de um colaborador específico ────────────────────────────────

export async function fetchColaboradorAcesso(
  colaboradorId: string,
): Promise<UserRole | null> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("*")
    .eq("colaborador_id", colaboradorId)
    .maybeSingle();

  if (error) {
    if (error.code === "42P01" || error.message.includes("does not exist")) return null;
    throw error;
  }
  return data as UserRole | null;
}

// ── Atualizar permissões (abas) ───────────────────────────────────────────────

export async function updatePermissoes(
  userId: string,
  permissoes: string[],
): Promise<void> {
  await restPatch(
    "user_roles",
    { column: "user_id", value: userId },
    { permissoes, updated_at: new Date().toISOString() },
  );
}

// ── Ativar / revogar acesso ───────────────────────────────────────────────────

export async function toggleAcesso(userId: string, ativo: boolean): Promise<void> {
  await restPatch(
    "user_roles",
    { column: "user_id", value: userId },
    { ativo, updated_at: new Date().toISOString() },
  );
}

// ── Funções que chamam a Edge Function (operações que precisam de service role)

const EDGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-colaborador-user`;

async function callEdge(body: object): Promise<Record<string, unknown>> {
  const { data: { session } } = await supabase.auth.getSession();
  const token   = session?.access_token ?? "";
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

  const res = await fetch(EDGE_URL, {
    method:  "POST",
    headers: {
      "Content-Type":  "application/json",
      "apikey":        anonKey,          // obrigatório para o gateway do Supabase
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  // "failed to fetch" geralmente = função não deployada ou URL errada
  const json = await res.json() as Record<string, unknown>;
  if (!res.ok) throw new Error((json.error as string) ?? `Erro ${res.status}`);
  return json;
}

// ── Criar conta de colaborador ────────────────────────────────────────────────

export async function createColaboradorUser(input: {
  email:          string;
  password:       string;
  colaborador_id: string;
  permissoes:     string[];
}): Promise<string> {
  const result = await callEdge({ action: "create", ...input });
  return result.user_id as string;
}

// ── Listar admins ─────────────────────────────────────────────────────────────

export interface AdminEntry {
  id:         string;
  user_id:    string;
  ativo:      boolean;
  created_at: string;
  email?:     string;
  name?:      string;
}

export async function fetchAdmins(): Promise<AdminEntry[]> {
  const { data: roles, error } = await supabase
    .from("user_roles")
    .select("id, user_id, ativo, created_at")
    .eq("role", "admin")
    .order("created_at", { ascending: true });

  if (error) {
    if (error.code === "42P01" || error.message.includes("does not exist")) return [];
    throw error;
  }

  if (!roles || roles.length === 0) return [];

  // Buscar profiles separadamente — sem coluna email (pode não existir no schema)
  const userIds = roles.map((r: any) => r.user_id);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, name")
    .in("id", userIds);

  const profileMap: Record<string, { name?: string }> = {};
  (profiles ?? []).forEach((p: any) => { profileMap[p.id] = { name: p.name }; });

  return roles.map((r: any) => ({
    id:         r.id,
    user_id:    r.user_id,
    ativo:      r.ativo,
    created_at: r.created_at,
    name:       profileMap[r.user_id]?.name,
    email:      undefined,
  }));
}

// ── Promover usuário existente a admin ────────────────────────────────────────
// Usa a Edge Function (que tem service role) para buscar o user_id pelo e-mail
// em auth.users e então atualiza/insere em user_roles com role="admin".

export async function promoteToAdmin(email: string): Promise<void> {
  const result = await callEdge({ action: "promote_admin", email });
  const userId = result.user_id as string | undefined;

  if (!userId) throw new Error("Usuário não encontrado com esse e-mail.");

  // Verificar se já existe entrada em user_roles
  const { data: existing } = await supabase
    .from("user_roles")
    .select("id, role")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    if (existing.role === "admin") throw new Error("Este usuário já é administrador.");
    const { error } = await supabase
      .from("user_roles")
      .update({ role: "admin", permissoes: [], ativo: true })
      .eq("user_id", userId);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("user_roles")
      .insert({ user_id: userId, role: "admin", permissoes: [], ativo: true });
    if (error) throw error;
  }
}

// ── Alterar senha ─────────────────────────────────────────────────────────────

export async function updatePassword(userId: string, password: string): Promise<void> {
  await callEdge({ action: "update_password", user_id: userId, password });
}

// ── Deletar conta do colaborador (remove do Auth + cascade em user_roles) ─────

export async function deleteColaboradorUser(userId: string): Promise<void> {
  await callEdge({ action: "delete", user_id: userId });
}

// ── Gerar senha aleatória segura ──────────────────────────────────────────────

export function gerarSenhaAleatoria(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
  return Array.from({ length: 12 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}
