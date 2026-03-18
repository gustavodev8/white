import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { STORE_NAME } from "@/config/storeConfig";
import {
  Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, ChevronLeft, ShieldCheck, Lock, Package, User, Mail, KeyRound,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

/* ── helpers ────────────────────────────────────────────────── */
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

/* ── Input ──────────────────────────────────────────────────── */
const inputCls =
  "w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 bg-white " +
  "placeholder-gray-300 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10 transition-colors";

function FInput({
  label, value, onChange, placeholder, type = "text", required = false,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-gray-500">{label}{required && <span className="text-[#e8001c] ml-0.5">*</span>}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={inputCls}
        autoComplete="off"
      />
    </div>
  );
}

function FPasswordInput({
  label, value, onChange, placeholder = "••••••••",
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-gray-500">{label}<span className="text-[#e8001c] ml-0.5">*</span></label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={inputCls + " pr-11"}
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

function FCheckbox({
  checked, onChange, children,
}: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <label className="flex items-start gap-2.5 cursor-pointer group">
      <div className="relative shrink-0 mt-0.5">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only" />
        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors
          ${checked ? "bg-gray-900 border-gray-900" : "border-gray-300 group-hover:border-gray-500"}`}>
          {checked && (
            <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 8" fill="none">
              <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      </div>
      <span className="text-xs text-gray-500 leading-relaxed">{children}</span>
    </label>
  );
}

const REGISTER_STEPS = [
  { label: "Conta",    icon: <Mail className="h-3.5 w-3.5" /> },
  { label: "Pessoal", icon: <User className="h-3.5 w-3.5" /> },
  { label: "Senha",   icon: <KeyRound className="h-3.5 w-3.5" /> },
];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-start mb-8">
      {REGISTER_STEPS.map((s, i) => {
        const num = i + 1;
        const isDone   = num < current;
        const isActive = num === current;
        return (
          <div key={s.label} className="flex items-start flex-1">
            <div className="flex flex-col items-center gap-1.5 flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shrink-0
                ${isDone ? "bg-green-500 text-white" : isActive ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-400"}`}>
                {isDone ? <CheckCircle2 className="h-4 w-4" /> : s.icon}
              </div>
              <span className={`text-[11px] font-medium transition-colors
                ${isActive ? "text-gray-900" : isDone ? "text-green-600" : "text-gray-400"}`}>
                {s.label}
              </span>
            </div>
            {i < REGISTER_STEPS.length - 1 && (
              <div className={`h-px flex-1 mt-4 transition-colors ${isDone ? "bg-green-400" : "bg-gray-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   LOGIN FORM
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
      <div className="mb-1">
        <h1 className="text-2xl font-bold text-gray-900">Entrar na sua conta</h1>
        <p className="text-sm text-gray-400 mt-1">Acesse seus pedidos e dados pessoais.</p>
      </div>

      <FInput
        label="E-mail"
        value={email}
        onChange={setEmail}
        placeholder="seu@email.com"
        type="email"
        required
      />
      <FPasswordInput label="Senha" value={password} onChange={setPassword} />

      <div className="flex justify-end -mt-2">
        <button
          type="button"
          className="text-xs text-gray-400 hover:text-gray-700 transition-colors underline underline-offset-2"
        >
          Esqueci a senha
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3.5 py-2.5">
          <AlertCircle className="h-4 w-4 shrink-0" />{error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-[#e8001c] hover:bg-[#c4001a] text-white font-semibold py-2.5 rounded-lg
          transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-60"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        Entrar
      </button>

      <p className="text-sm text-gray-500 text-center pt-1">
        Não tem conta?{" "}
        <button
          type="button"
          onClick={onRegister}
          className="font-semibold text-gray-900 hover:text-[#e8001c] transition-colors"
        >
          Cadastre-se
        </button>
      </p>
    </form>
  );
}

/* ══════════════════════════════════════════════════════════════
   REGISTER FORM — 3 etapas
══════════════════════════════════════════════════════════════ */
function RegisterForm({ onSuccess, onLogin }: { onSuccess: () => void; onLogin: () => void }) {
  const { signUp } = useAuth();

  const [step,      setStep]      = useState(1);
  const [cpf,       setCpf]       = useState("");
  const [name,      setName]      = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender,    setGender]    = useState("");
  const [phone,     setPhone]     = useState("");
  const [email,     setEmail]     = useState("");
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

  /* Sucesso */
  if (done) {
    return (
      <div className="flex flex-col items-center gap-6 py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-green-50 border border-green-100 flex items-center justify-center">
          <CheckCircle2 className="h-8 w-8 text-green-500" />
        </div>
        <div>
          <p className="text-lg font-bold text-gray-900">Bem-vindo(a) à {STORE_NAME}!</p>
          <p className="text-sm text-gray-400 mt-1">Conta criada com sucesso, {name.split(" ")[0]}.</p>
        </div>
        <Loader2 className="h-4 w-4 text-gray-300 animate-spin" />
      </div>
    );
  }

  const isLastStep = step === 3;

  return (
    <form onSubmit={isLastStep ? handleSubmit : goNext} className="flex flex-col gap-5">
      <StepIndicator current={step} />

      {/* Cabeçalho */}
      <div className="flex items-start gap-3 -mt-1">
        {step > 1 && (
          <button
            type="button"
            onClick={() => { setStep(step - 1); setError(""); }}
            className="mt-1 text-gray-400 hover:text-gray-700 transition-colors shrink-0"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {step === 1 && "Criar conta"}
            {step === 2 && "Dados pessoais"}
            {step === 3 && "Crie sua senha"}
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {step === 1 && "Informe seu nome e e-mail para começar."}
            {step === 2 && "Opcional — você pode preencher depois."}
            {step === 3 && "Escolha uma senha segura para sua conta."}
          </p>
        </div>
      </div>

      {/* ── Etapa 1: Conta ─────────────────────────────────────── */}
      {step === 1 && (
        <div className="flex flex-col gap-4">
          <FInput label="Nome completo" value={name} onChange={setName} placeholder="Seu nome completo" required />
          <FInput label="E-mail" value={email} onChange={setEmail} type="email" placeholder="seu@email.com" required />
          <FInput label="CPF" value={cpf} onChange={(v) => setCpf(maskCPF(v))} placeholder="000.000.000-00" />
        </div>
      )}

      {/* ── Etapa 2: Dados pessoais ─────────────────────────────── */}
      {step === 2 && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <FInput label="Data de nascimento" value={birthDate} onChange={setBirthDate} type="date" />
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-500">Gênero</label>
              <div className="relative">
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className={inputCls + " appearance-none pr-8 cursor-pointer"}
                >
                  <option value="">Selecione</option>
                  <option value="M">Masculino</option>
                  <option value="F">Feminino</option>
                  <option value="O">Outro</option>
                  <option value="N">Prefiro não informar</option>
                </select>
                <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400"
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </div>
          </div>
          <FInput label="Telefone" value={phone} onChange={(v) => setPhone(maskPhone(v))} placeholder="(00) 00000-0000" />

          <div className="h-px bg-gray-100" />

          <FCheckbox checked={offers} onChange={setOffers}>
            Quero receber ofertas e novidades da {STORE_NAME} por e-mail.
          </FCheckbox>
          <FCheckbox checked={terms} onChange={setTerms}>
            Li e aceito os{" "}
            <span className="text-gray-900 font-semibold underline underline-offset-1">Termos de uso</span>{" "}e a{" "}
            <span className="text-gray-900 font-semibold underline underline-offset-1">Política de privacidade.</span>
          </FCheckbox>
        </div>
      )}

      {/* ── Etapa 3: Senha ─────────────────────────────────────── */}
      {step === 3 && (
        <div className="flex flex-col gap-4">
          <FPasswordInput label="Senha (mín. 6 caracteres)" value={password} onChange={setPassword} />
          <FPasswordInput label="Confirmar senha" value={confirm} onChange={setConfirm} placeholder="Repita a senha" />

          <div className="flex flex-col gap-2 p-3.5 bg-gray-50 rounded-lg border border-gray-100">
            {[
              { ok: password.length >= 6,   label: "Pelo menos 6 caracteres" },
              { ok: /[A-Z]/.test(password), label: "Uma letra maiúscula"     },
              { ok: /[0-9]/.test(password), label: "Um número"               },
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
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3.5 py-2.5">
          <AlertCircle className="h-4 w-4 shrink-0" />{error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-[#e8001c] hover:bg-[#c4001a] text-white font-semibold py-2.5 rounded-lg
          transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-60"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {step < 3 ? "Continuar" : "Criar minha conta"}
      </button>

      {step === 1 && (
        <p className="text-sm text-gray-500 text-center">
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
    <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row">

      {/* ── Painel esquerdo (desktop) ──────────────────────────── */}
      <div className="hidden lg:flex lg:w-[420px] xl:w-[480px] shrink-0 bg-gray-900 flex-col justify-between p-10">
        {/* Logo */}
        <Link to="/" className="text-white font-bold text-2xl tracking-tight">
          {STORE_NAME}
        </Link>

        {/* Centro */}
        <div className="space-y-8">
          <div>
            <p className="text-3xl font-bold text-white leading-snug">
              Moda com qualidade<br />e estilo próprio.
            </p>
            <p className="text-gray-400 text-sm mt-3 leading-relaxed">
              Acesse sua conta para acompanhar pedidos, salvar favoritos e aproveitar condições exclusivas.
            </p>
          </div>

          <div className="space-y-3">
            {[
              { icon: <Package className="h-4 w-4" />, text: "Acompanhe seus pedidos em tempo real" },
              { icon: <ShieldCheck className="h-4 w-4" />, text: "Pagamentos 100% seguros com Mercado Pago" },
              { icon: <Lock className="h-4 w-4" />, text: "Seus dados protegidos e privados" },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white shrink-0">
                  {icon}
                </div>
                <p className="text-sm text-gray-300">{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Rodapé */}
        <p className="text-xs text-gray-600">
          © {new Date().getFullYear()} {STORE_NAME}. Todos os direitos reservados.
        </p>
      </div>

      {/* ── Painel direito — formulário ───────────────────────── */}
      <div className="flex-1 flex flex-col">
        {/* Header mobile */}
        <header className="lg:hidden border-b border-gray-100 bg-white px-5 py-4">
          <Link to="/" className="text-lg font-bold text-gray-900">{STORE_NAME}</Link>
        </header>

        <div className="flex-1 flex items-center justify-center px-5 py-12">
          <div className="w-full max-w-lg">
            {/* Card */}
            <div className="bg-white border border-gray-100 rounded-2xl p-10 shadow-sm">
              {tab === "login" ? (
                <LoginForm
                  onSuccess={handleSuccess}
                  onRegister={() => setTab("register")}
                />
              ) : (
                <RegisterForm
                  onSuccess={handleSuccess}
                  onLogin={() => setTab("login")}
                />
              )}
            </div>

            {/* Voltar à loja */}
            <div className="mt-6 text-center">
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
