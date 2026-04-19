/**
 * supabaseRest.ts
 *
 * Helper de fetch direto à REST API do Supabase.
 * Substitui o cliente JS para todas as operações de banco de dados,
 * eliminando o travamento causado pelo refresh de token do cliente JS.
 *
 * Token: lido diretamente do localStorage (síncrono, 0ms, sem rede).
 */

// Supabase project config
const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL      as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

const REST_TIMEOUT_MS = 10_000;

const DEMO_MODE = import.meta.env.VITE_ADMIN_DEMO === "true";

// ─── Token ───────────────────────────────────────────────────────────────────

/**
 * Lê o access_token diretamente do localStorage.
 * O Supabase armazena a sessão em `sb-{project-ref}-auth-token`.
 * Síncrono — sem chamadas de rede, sem travamento.
 */
function getTokenFromStorage(): string | null {
  try {
    const ref = SUPABASE_URL.replace(/^https?:\/\//, "").split(".")[0];
    const raw = localStorage.getItem(`sb-${ref}-auth-token`);
    if (!raw) return null;

    const session = JSON.parse(raw) as Record<string, unknown>;
    const token     = session.access_token as string | undefined;
    const expiresAt = session.expires_at   as number | undefined; // segundos Unix

    if (!token) return null;
    // Considera expirado se faltam menos de 60s para o vencimento
    if (expiresAt && Date.now() / 1000 > expiresAt - 60) return null;

    return token;
  } catch {
    return null;
  }
}

/** Retorna o JWT do usuário logado, ou o anon key como fallback */
function getToken(): string {
  return getTokenFromStorage() ?? SUPABASE_ANON_KEY;
}

// ─── Headers ─────────────────────────────────────────────────────────────────

function makeHeaders(token: string, extra: Record<string, string> = {}): HeadersInit {
  return {
    "apikey":        SUPABASE_ANON_KEY,
    "Authorization": `Bearer ${token}`,
    "Content-Type":  "application/json",
    "Accept":        "application/json",
    ...extra,
  };
}

// ─── GET ─────────────────────────────────────────────────────────────────────

/**
 * Lista registros de uma tabela via REST API.
 *
 * @param table  Nome da tabela
 * @param params Parâmetros de query.
 *               Filtros no formato PostgREST: { is_active: "eq.true", order: "created_at.desc" }
 */
export async function restGet<T = Record<string, unknown>>(
  table: string,
  params: Record<string, string> = {},
): Promise<T[]> {
  if (DEMO_MODE) return [];
  const token = getToken();

  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
  if (!params.select) url.searchParams.set("select", "*");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REST_TIMEOUT_MS);

  try {
    const res = await fetch(url.toString(), {
      method:  "GET",
      headers: makeHeaders(token),
      signal:  controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Supabase REST ${res.status}: ${text.slice(0, 300)}`);
    }

    return res.json() as Promise<T[]>;
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      throw new Error(`Supabase não respondeu em ${REST_TIMEOUT_MS / 1000}s`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// ─── POST ─────────────────────────────────────────────────────────────────────

/**
 * Upsert — INSERT com ON CONFLICT DO UPDATE (merge-duplicates).
 * Útil para tabelas com chave primária conhecida (ex: profiles).
 */
export async function restUpsert(
  table: string,
  body: Record<string, unknown>,
): Promise<void> {
  if (DEMO_MODE) return;
  const token = getToken();
  const url   = `${SUPABASE_URL}/rest/v1/${table}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REST_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method:  "POST",
      headers: makeHeaders(token, { "Prefer": "resolution=merge-duplicates,return=minimal" }),
      body:    JSON.stringify(body),
      signal:  controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Supabase REST ${res.status}: ${text.slice(0, 300)}`);
    }
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      throw new Error(`Supabase não respondeu em ${REST_TIMEOUT_MS / 1000}s`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Insere múltiplos registros sem retornar dados (fire-and-check).
 * Ideal para inserções em lote (ex: itens de pedido).
 */
export async function restPostMany(
  table: string,
  rows: Record<string, unknown>[],
): Promise<void> {
  if (DEMO_MODE) return;
  const token = getToken();
  const url   = `${SUPABASE_URL}/rest/v1/${table}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REST_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method:  "POST",
      headers: makeHeaders(token, { "Prefer": "return=minimal" }),
      body:    JSON.stringify(rows),
      signal:  controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Supabase REST ${res.status}: ${text.slice(0, 300)}`);
    }
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      throw new Error(`Supabase não respondeu em ${REST_TIMEOUT_MS / 1000}s`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Insere um registro e retorna o criado.
 * Lança erro se a inserção for bloqueada (ex: RLS sem autenticação).
 */
export async function restPost<T = Record<string, unknown>>(
  table: string,
  body: Record<string, unknown>,
): Promise<T> {
  if (DEMO_MODE) throw new Error("Modo Demo: banco de dados desconectado.");
  const token = getToken();
  const url   = `${SUPABASE_URL}/rest/v1/${table}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REST_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method:  "POST",
      headers: makeHeaders(token, { "Prefer": "return=representation" }),
      body:    JSON.stringify(body),
      signal:  controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Supabase REST ${res.status}: ${text.slice(0, 300)}`);
    }

    const data = await res.json() as T[];
    if (!data || data.length === 0) {
      throw new Error("Sem permissão para criar o registro. Verifique se você está logado.");
    }
    return data[0];
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      throw new Error(`Supabase não respondeu em ${REST_TIMEOUT_MS / 1000}s`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// ─── PATCH ───────────────────────────────────────────────────────────────────

/**
 * Atualiza registros filtrados por igualdade de coluna.
 *
 * @param returnData  Se true, retorna a linha atualizada. Lança erro se 0 linhas afetadas.
 */
export async function restPatch<T = Record<string, unknown>>(
  table: string,
  filter: { column: string; value: string },
  body: Record<string, unknown>,
  returnData = false,
): Promise<T | void> {
  if (DEMO_MODE) return;
  const token = getToken();
  const url   = `${SUPABASE_URL}/rest/v1/${table}?${filter.column}=eq.${encodeURIComponent(filter.value)}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REST_TIMEOUT_MS);

  try {
    const prefer = returnData ? "return=representation" : "return=minimal";
    const fullUrl = returnData ? `${url}&select=*` : url;

    const res = await fetch(fullUrl, {
      method:  "PATCH",
      headers: makeHeaders(token, { "Prefer": prefer }),
      body:    JSON.stringify(body),
      signal:  controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Supabase REST ${res.status}: ${text.slice(0, 300)}`);
    }

    if (returnData) {
      const data = await res.json() as T[];
      if (!data || data.length === 0) {
        throw new Error("Sem permissão para atualizar o registro. Verifique se você está logado.");
      }
      return data[0];
    }
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      throw new Error(`Supabase não respondeu em ${REST_TIMEOUT_MS / 1000}s`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// ─── DELETE ──────────────────────────────────────────────────────────────────

/**
 * Remove registros filtrados por igualdade de coluna.
 */
export async function restDelete(
  table: string,
  filter: { column: string; value: string },
): Promise<void> {
  if (DEMO_MODE) return;
  const token = getToken();
  const url   = `${SUPABASE_URL}/rest/v1/${table}?${filter.column}=eq.${encodeURIComponent(filter.value)}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REST_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method:  "DELETE",
      headers: makeHeaders(token, { "Prefer": "return=minimal" }),
      signal:  controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Supabase REST ${res.status}: ${text.slice(0, 300)}`);
    }
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      throw new Error(`Supabase não respondeu em ${REST_TIMEOUT_MS / 1000}s`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

