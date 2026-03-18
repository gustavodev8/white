import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** Decodifica o payload de um JWT (base64url → JSON) sem verificar assinatura.
 *  O Supabase Gateway já verificou a assinatura antes de chamar a função. */
function decodeJwtPayload(jwt: string): Record<string, unknown> {
  const [, b64] = jwt.split(".");
  // base64url → base64 padrão
  const padded = b64.replace(/-/g, "+").replace(/_/g, "/") + "===".slice(0, (4 - (b64.length % 4)) % 4);
  return JSON.parse(atob(padded));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Cliente admin (service role) — pode fazer tudo
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // Verificar que a requisição vem de um usuário autenticado
    const authHeader = req.headers.get("Authorization");
    console.log("[auth] Authorization header presente:", !!authHeader);
    console.log("[auth] Começa com Bearer:", authHeader?.startsWith("Bearer "));

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extrair user_id diretamente do JWT (Gateway já verificou a assinatura)
    const token = authHeader.slice(7); // remove "Bearer "
    console.log("[auth] Token length:", token.length, "| primeiros 20 chars:", token.slice(0, 20));

    let callerId: string;
    try {
      const payload = decodeJwtPayload(token);
      callerId = payload.sub as string;
      console.log("[auth] callerId extraído:", callerId);
      if (!callerId) throw new Error("sub ausente");
    } catch (e) {
      console.log("[auth] Erro ao decodificar token:", e);
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verificar papel do chamador
    // null = sem registro = admin original (retrocompat) → permite tudo
    const { data: callerRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .maybeSingle();

    if (callerRole && callerRole.role !== "admin") {
      return new Response(JSON.stringify({ error: "Apenas administradores podem gerenciar acessos" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action } = body;

    // ── Criar usuário colaborador ────────────────────────────────────────────
    if (action === "create") {
      const { email, password, colaborador_id, permissoes } = body as {
        email: string;
        password: string;
        colaborador_id: string;
        permissoes: string[];
      };

      if (!email || !password || !colaborador_id) {
        return new Response(JSON.stringify({ error: "email, password e colaborador_id são obrigatórios" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Criar usuário no Supabase Auth (email já confirmado automaticamente)
      const { data: newUser, error: authErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (authErr || !newUser.user) {
        return new Response(JSON.stringify({ error: authErr?.message ?? "Erro ao criar usuário" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Inserir papel na tabela user_roles
      const { error: roleErr } = await supabaseAdmin.from("user_roles").insert({
        user_id:        newUser.user.id,
        role:           "colaborador",
        colaborador_id: colaborador_id,
        permissoes:     permissoes ?? [],
        ativo:          true,
      });

      if (roleErr) {
        // Rollback: remover usuário do Auth
        await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
        return new Response(JSON.stringify({ error: "Erro ao salvar permissões: " + roleErr.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ user_id: newUser.user.id }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Alterar senha ────────────────────────────────────────────────────────
    if (action === "update_password") {
      const { user_id, password } = body as { user_id: string; password: string };

      if (!user_id || !password) {
        return new Response(JSON.stringify({ error: "user_id e password são obrigatórios" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await supabaseAdmin.auth.admin.updateUserById(user_id, { password });
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ ok: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Deletar usuário (remove do Auth — user_roles faz cascade) ────────────
    if (action === "delete") {
      const { user_id } = body as { user_id: string };

      if (!user_id) {
        return new Response(JSON.stringify({ error: "user_id é obrigatório" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await supabaseAdmin.auth.admin.deleteUser(user_id);
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ ok: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Promover usuário existente a admin ───────────────────────────────────
    if (action === "promote_admin") {
      const { email } = body as { email: string };

      if (!email) {
        return new Response(JSON.stringify({ error: "email é obrigatório" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: { users }, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
      if (listErr) {
        return new Response(JSON.stringify({ error: listErr.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const found = users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
      if (!found) {
        return new Response(JSON.stringify({ error: "Nenhuma conta encontrada com esse e-mail." }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ user_id: found.id }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Ação desconhecida: " + action }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro interno";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
