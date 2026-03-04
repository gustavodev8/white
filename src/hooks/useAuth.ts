import { create } from "zustand";
import { supabase, isSupabaseConfigured } from "@/services/supabaseClient";
import { restGet, restUpsert } from "@/services/supabaseRest";
import type { User, Session } from "@supabase/supabase-js";

export interface UserProfile {
  id: string;
  name: string;
  cpf: string | null;
  phone: string | null;
  birth_date: string | null;
  email: string;
}

export interface SignUpData {
  name: string;
  email: string;
  password: string;
  cpf?: string;
  phone?: string;
  birth_date?: string;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;

  /** Controla visibilidade do modal de auth */
  authModalOpen: boolean;
  authModalTab: "login" | "register";

  // Actions
  openAuthModal:  (tab?: "login" | "register") => void;
  closeAuthModal: () => void;

  signIn:   (email: string, password: string) => Promise<{ error?: string }>;
  signUp:   (data: SignUpData) => Promise<{ error?: string }>;
  signOut:  () => Promise<void>;
  updateProfile: (data: Partial<Omit<UserProfile, "id" | "email">>) => Promise<{ error?: string }>;

  // Internal
  _setUser:    (user: User | null, session: Session | null) => void;
  _setProfile: (profile: UserProfile | null) => void;
  _setLoading: (v: boolean) => void;
  _loadProfile:(userId: string) => Promise<void>;
}

export const useAuth = create<AuthState>()((set, get) => ({
  user:          null,
  session:       null,
  profile:       null,
  loading:       true,
  authModalOpen: false,
  authModalTab:  "login",

  openAuthModal:  (tab = "login") => set({ authModalOpen: true, authModalTab: tab }),
  closeAuthModal: ()               => set({ authModalOpen: false }),

  _setUser:    (user, session) => set({ user, session }),
  _setProfile: (profile)       => set({ profile }),
  _setLoading: (loading)       => set({ loading }),

  _loadProfile: async (userId: string) => {
    if (!isSupabaseConfigured()) return;
    try {
      const rows = await restGet<{
        id: string; name: string | null; cpf: string | null;
        phone: string | null; birth_date: string | null;
      }>("profiles", { id: `eq.${userId}` });

      if (rows.length > 0) {
        const data = rows[0];
        const { user } = get();
        set({
          profile: {
            id:         data.id,
            name:       data.name ?? "",
            cpf:        data.cpf ?? null,
            phone:      data.phone ?? null,
            birth_date: data.birth_date ?? null,
            email:      user?.email ?? "",
          },
        });
      }
    } catch { /* silencioso — profile é opcional */ }
  },

  signIn: async (email, password) => {
    if (!isSupabaseConfigured()) return { error: "Supabase não configurado." };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.message.includes("Invalid login credentials"))
        return { error: "E-mail ou senha incorretos." };
      return { error: error.message };
    }
    return {};
  },

  signUp: async ({ name, email, password, cpf, phone, birth_date }) => {
    if (!isSupabaseConfigured()) return { error: "Supabase não configurado." };

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });

    if (error) {
      if (error.message.includes("already registered"))
        return { error: "E-mail já cadastrado. Tente fazer login." };
      return { error: error.message };
    }

    // Cria / atualiza perfil via REST
    if (data.user) {
      await restUpsert("profiles", {
        id:         data.user.id,
        name,
        cpf:        cpf || null,
        phone:      phone || null,
        birth_date: birth_date || null,
        updated_at: new Date().toISOString(),
      }).catch(() => { /* não bloqueia o cadastro se o upsert falhar */ });
    }
    return {};
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null, profile: null });
  },

  updateProfile: async (data) => {
    const { user } = get();
    if (!user) return { error: "Não autenticado." };
    if (!isSupabaseConfigured()) return { error: "Supabase não configurado." };

    try {
      // Upsert: cria o perfil se não existir, atualiza se já existir
      await restUpsert("profiles", {
        id: user.id,
        ...data,
        // Converte strings vazias para null em campos de tipo date/text opcionais
        birth_date: data.birth_date || null,
        cpf:        data.cpf        || null,
        phone:      data.phone      || null,
        updated_at: new Date().toISOString(),
      });
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Erro ao atualizar perfil." };
    }

    // Atualiza estado local
    set((s) => ({
      profile: s.profile
        ? { ...s.profile, ...data }
        : { id: user.id, email: user.email ?? "", name: data.name ?? "", cpf: data.cpf ?? null, phone: data.phone ?? null, birth_date: data.birth_date ?? null },
    }));
    return {};
  },
}));

// ── Inicialização automática (roda uma vez ao importar) ─────────────────────
if (isSupabaseConfigured()) {
  // Restaura sessão existente
  supabase.auth.getSession().then(async ({ data: { session } }) => {
    if (session?.user) {
      useAuth.getState()._setUser(session.user, session);
      await useAuth.getState()._loadProfile(session.user.id);
    }
    useAuth.getState()._setLoading(false);
  });

  // Escuta mudanças de auth em tempo real
  supabase.auth.onAuthStateChange(async (_event, session) => {
    useAuth.getState()._setUser(session?.user ?? null, session);
    if (session?.user) {
      await useAuth.getState()._loadProfile(session.user.id);
    } else {
      useAuth.getState()._setProfile(null);
    }
    useAuth.getState()._setLoading(false);
  });
} else {
  useAuth.getState()._setLoading(false);
}
