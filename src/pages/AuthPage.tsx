import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { STORE_NAME } from "@/config/storeConfig";
import { Eye, EyeOff, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

/* ── masks ── */
function maskCPF(v: string) {
  return v.replace(/\D/g, "").slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}
function maskPhone(v: string) {
  return v.replace(/\D/g, "").slice(0, 11)
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

/* ── Field ── */
function Field({
  label, value, onChange, placeholder, type = "text",
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm text-gray-500">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-400
          focus:outline-none focus:bg-gray-150 focus:ring-2 focus:ring-gray-900/10 transition-all"
        autoComplete="off"
      />
    </div>
  );
}

function PasswordField({
  label, value, onChange, placeholder = "••••••••",
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm text-gray-500">{label}</label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-gray-100 rounded-xl px-4 py-3 pr-12 text-sm text-gray-800 placeholder-gray-400
            focus:outline-none focus:ring-2 focus:ring-gray-900/10 transition-all"
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

function Checkbox({ checked, onChange, children }: {
  checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <div className="relative shrink-0 mt-0.5">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only" />
        <div className={`w-4.5 h-4.5 w-[18px] h-[18px] rounded border-2 flex items-center justify-center transition-colors
          ${checked ? "bg-gray-900 border-gray-900" : "border-gray-300 group-hover:border-gray-500"}`}>
          {checked && (
            <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 8" fill="none">
              <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      </div>
      <span className="text-sm text-gray-500 leading-relaxed">{children}</span>
    </label>
  );
}

/* ── Progress bar ── */
function StepBar({ current, total }: { current: number; total: number }) {
  return (
    <div className="mb-8">
      <p className="text-xs text-gray-400 mb-2.5">Passo {current} de {total}</p>
      <div className="flex gap-1.5">
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} className={`h-[3px] flex-1 rounded-full transition-all ${i < current ? "bg-gray-900" : "bg-gray-200"}`} />
        ))}
      </div>
    </div>
  );
}

function ErrorMsg({ msg }: { msg: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">
      <AlertCircle className="h-4 w-4 shrink-0" />{msg}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   LOGIN
══════════════════════════════════════════════════════════════ */
function LoginForm({ onSuccess, onRegister }: { onSuccess: () => void; onRegister: () => void }) {
  const { signIn } = useAuth();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) { setError("Preencha todos os campos."); return; }
    setLoading(true); setError("");
    const result = await signIn(email, password);
    setLoading(false);
    if (result.error) { setError(result.error); return; }
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-gray-900">Bem-vindo de volta</h1>
        <p className="text-sm text-gray-400 mt-1">Entre na sua conta para continuar.</p>
      </div>

      <Field label="E-mail" value={email} onChange={setEmail} placeholder="seu@email.com" type="email" />
      <PasswordField label="Senha" value={password} onChange={setPassword} />

      <div className="flex justify-end -mt-2">
        <button type="button" className="text-xs text-gray-400 hover:text-gray-700 transition-colors">
          Esqueci a senha
        </button>
      </div>

      {error && <ErrorMsg msg={error} />}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-gray-900 hover:bg-gray-800 text-white font-semibold py-3.5 rounded-2xl
          transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-60 mt-1"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        Entrar
      </button>

      <p className="text-sm text-gray-400 text-center">
        Não tem conta?{" "}
        <button type="button" onClick={onRegister}
          className="font-semibold text-gray-900 hover:text-[#e8001c] transition-colors">
          Cadastre-se
        </button>
      </p>
    </form>
  );
}

/* ══════════════════════════════════════════════════════════════
   REGISTER — 3 etapas
══════════════════════════════════════════════════════════════ */
function RegisterForm({ onSuccess, onLogin }: { onSuccess: () => void; onLogin: () => void }) {
  const { signUp } = useAuth();

  const [step,      setStep]      = useState(1);
  const [name,      setName]      = useState("");
  const [email,     setEmail]     = useState("");
  const [cpf,       setCpf]       = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender,    setGender]    = useState("");
  const [phone,     setPhone]     = useState("");
  const [offers,    setOffers]    = useState(false);
  const [terms,     setTerms]     = useState(false);
  const [password,  setPassword]  = useState("");
  const [confirm,   setConfirm]   = useState("");
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");
  const [done,      setDone]      = useState(false);

  function goNext(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (step === 1) {
      if (!name.trim()) return setError("Nome completo é obrigatório.");
      if (!email.trim()) return setError("E-mail é obrigatório.");
      setStep(2);
    } else if (step === 2) {
      if (!terms) return setError("Aceite os Termos de Uso para continuar.");
      setStep(3);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!password) return setError("Crie uma senha.");
    if (password.length < 6) return setError("A senha deve ter pelo menos 6 caracteres.");
    if (password !== confirm) return setError("As senhas não coincidem.");
    setLoading(true);
    const result = await signUp({ name, email, password, cpf, phone, birth_date: birthDate });
    setLoading(false);
    if (result.error) { setError(result.error); return; }
    setDone(true);
    setTimeout(onSuccess, 2200);
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-6 py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center">
          <CheckCircle2 className="h-8 w-8 text-green-500" />
        </div>
        <div>
          <p className="text-lg font-bold text-gray-900">Tudo certo, {name.split(" ")[0]}!</p>
          <p className="text-sm text-gray-400 mt-1">Sua conta foi criada com sucesso.</p>
        </div>
        <Loader2 className="h-4 w-4 text-gray-300 animate-spin" />
      </div>
    );
  }

  const titles = ["Vamos começar?", "Dados pessoais", "Crie sua senha"];
  const subtitles = [
    "Informe seu nome e e-mail para começar.",
    "Opcional — você pode preencher depois.",
    "Escolha uma senha segura.",
  ];

  return (
    <form onSubmit={step === 3 ? handleSubmit : goNext} className="flex flex-col gap-5">
      <StepBar current={step} total={3} />

      <div className="mb-1">
        <h1 className="text-2xl font-bold text-gray-900">{titles[step - 1]}</h1>
        <p className="text-sm text-gray-400 mt-1">{subtitles[step - 1]}</p>
      </div>

      {/* Etapa 1 */}
      {step === 1 && (
        <>
          <Field label="Nome completo" value={name} onChange={setName} placeholder="Seu nome completo" />
          <Field label="Seu e-mail" value={email} onChange={setEmail} type="email" placeholder="seu@email.com" />
          <Field label="CPF" value={cpf} onChange={(v) => setCpf(maskCPF(v))} placeholder="000.000.000-00" />
        </>
      )}

      {/* Etapa 2 */}
      {step === 2 && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Data de nascimento" value={birthDate} onChange={setBirthDate} type="date" />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-gray-500">Gênero</label>
              <div className="relative">
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm text-gray-800 appearance-none
                    focus:outline-none focus:ring-2 focus:ring-gray-900/10 transition-all cursor-pointer pr-10"
                >
                  <option value="">Selecione</option>
                  <option value="M">Masculino</option>
                  <option value="F">Feminino</option>
                  <option value="O">Outro</option>
                  <option value="N">Prefiro não informar</option>
                </select>
                <svg className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400"
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </div>
          </div>
          <Field label="Telefone celular" value={phone} onChange={(v) => setPhone(maskPhone(v))} placeholder="(00) 00000-0000" />

          <div className="h-px bg-gray-100 my-1" />

          <Checkbox checked={offers} onChange={setOffers}>
            Quero receber ofertas e novidades da {STORE_NAME} por e-mail.
          </Checkbox>
          <Checkbox checked={terms} onChange={setTerms}>
            Li e aceito os{" "}
            <span className="text-gray-900 font-semibold underline underline-offset-2">Termos de uso</span>{" "}e a{" "}
            <span className="text-gray-900 font-semibold underline underline-offset-2">Política de privacidade.</span>
          </Checkbox>
        </>
      )}

      {/* Etapa 3 */}
      {step === 3 && (
        <>
          <PasswordField label="Senha" value={password} onChange={setPassword} placeholder="Mínimo 6 caracteres" />
          <PasswordField label="Confirmar senha" value={confirm} onChange={setConfirm} placeholder="Repita a senha" />

          <div className="flex flex-col gap-2">
            {[
              { ok: password.length >= 6,   label: "Pelo menos 6 caracteres" },
              { ok: /[A-Z]/.test(password), label: "Uma letra maiúscula" },
              { ok: /[0-9]/.test(password), label: "Um número" },
            ].map(({ ok, label }) => (
              <div key={label} className={`flex items-center gap-2 text-xs transition-colors ${ok ? "text-green-600" : "text-gray-400"}`}>
                <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 transition-colors ${ok ? "bg-green-500" : "bg-gray-200"}`}>
                  {ok && <svg className="w-2 h-2 text-white" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>}
                </div>
                {label}
              </div>
            ))}
          </div>
        </>
      )}

      {error && <ErrorMsg msg={error} />}

      <div className="flex flex-col gap-3 mt-1">
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gray-900 hover:bg-gray-800 text-white font-semibold py-3.5 rounded-2xl
            transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {step < 3 ? "Continuar" : "Criar minha conta"}
        </button>

        {step > 1 && (
          <button
            type="button"
            onClick={() => { setStep(step - 1); setError(""); }}
            className="w-full py-3 rounded-2xl text-sm text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
          >
            Voltar
          </button>
        )}
      </div>

      {step === 1 && (
        <p className="text-sm text-gray-400 text-center">
          Já tem conta?{" "}
          <button type="button" onClick={onLogin}
            className="font-semibold text-gray-900 hover:text-[#e8001c] transition-colors">
            Entrar
          </button>
        </p>
      )}
    </form>
  );
}

/* ══════════════════════════════════════════════════════════════
   AUTH PAGE
══════════════════════════════════════════════════════════════ */
export default function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from: string = (location.state as { from?: string })?.from ?? "/";

  const [tab, setTab] = useState<"login" | "register">(
    location.state && (location.state as { tab?: string }).tab === "register"
      ? "register"
      : "login"
  );

  function handleSuccess() {
    navigate(from, { replace: true });
  }

  return (
    <div className="min-h-screen bg-white flex flex-col lg:flex-row">

      {/* ── Painel esquerdo (desktop) ── */}
      <div className="hidden lg:flex lg:w-[400px] xl:w-[460px] shrink-0 bg-gray-900 flex-col justify-between p-10">
        <Link to="/" className="text-white font-bold text-xl tracking-tight">{STORE_NAME}</Link>

        <div className="space-y-6">
          <p className="text-3xl font-bold text-white leading-snug">
            Moda com qualidade<br />e estilo próprio.
          </p>
          <p className="text-gray-400 text-sm leading-relaxed">
            Acesse sua conta para acompanhar pedidos, salvar favoritos e aproveitar condições exclusivas.
          </p>
        </div>

        <p className="text-xs text-gray-600">© {new Date().getFullYear()} {STORE_NAME}.</p>
      </div>

      {/* ── Painel direito ── */}
      <div className="flex-1 flex flex-col">
        <header className="lg:hidden border-b border-gray-100 px-6 py-4">
          <Link to="/" className="text-lg font-bold text-gray-900">{STORE_NAME}</Link>
        </header>

        <div className="flex-1 flex items-center justify-center px-6 py-14">
          <div className="w-full max-w-xl">
            {tab === "login" ? (
              <LoginForm onSuccess={handleSuccess} onRegister={() => setTab("register")} />
            ) : (
              <RegisterForm onSuccess={handleSuccess} onLogin={() => setTab("login")} />
            )}

            <div className="mt-8 text-center">
              <Link to="/" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
                ← Voltar à loja
              </Link>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
