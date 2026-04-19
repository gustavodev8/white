import { createClient } from "@supabase/supabase-js";

const url  = import.meta.env.VITE_SUPABASE_URL  as string | undefined;
const key  = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** Retorna true se as variáveis de ambiente do Supabase estão configuradas */
export function isSupabaseConfigured(): boolean {
  if (import.meta.env.VITE_ADMIN_DEMO === "true") return false;
  return Boolean(url && key && url.startsWith("https://") && key.length > 10);
}

/**
 * Client Supabase — singleton global.
 *
 * Usamos uma instância global (window.__supabase__) para evitar que o HMR
 * do Vite crie múltiplas instâncias concorrentes que disputam o mesmo
 * Navigator Lock de autenticação (NavigatorLockAcquireTimeoutError).
 *
 * O `lock` customizado substitui o navigator.locks do browser por uma
 * chamada direta, eliminando o timeout em ambiente de desenvolvimento.
 */

type SupabaseClient = ReturnType<typeof createClient>;

declare global {
  interface Window { __supabase__?: SupabaseClient }
}

function makeClient(): SupabaseClient {
  return createClient(
    url ?? "https://placeholder.supabase.co",
    key ?? "placeholder-key",
    {
      auth: {
        persistSession:   true,
        detectSessionInUrl: true,
        // Substitui o navigator.locks por uma chamada simples —
        // resolve o NavigatorLockAcquireTimeoutError no HMR do Vite
        lock: async <T>(_name: string, _timeout: number, fn: () => Promise<T>): Promise<T> =>
          fn(),
      },
    }
  );
}

export const supabase: SupabaseClient =
  (window.__supabase__ ??= makeClient());
