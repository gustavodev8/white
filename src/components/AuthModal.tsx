import { useState } from "react";
import { X, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, ChevronLeft } from "lucide-react";
import { STORE_NAME } from "@/config/storeConfig";
import { useAuth } from "@/hooks/useAuth";

/* ── helpers ──────────────────────────────────────────────────── */
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

/* ── Input base ───────────────────────────────────────────────── */
const inputCls =
  "w-full bg-gray-100 border-0 rounded-2xl px-4 py-3.5 text-sm text-gray-800 " +
  "placeholder-gray-400 focus:outline-none focus:bg-gray-200 transition-colors";

function DInput({
  label, value, onChange, placeholder, type = "text",
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm text-gray-600 font-medium">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={inputCls}
      />
    </div>
  );
}

function DPasswordInput({
  label, value, onChange,
}: { label: string; value: string; onChange: (v: string) => void }) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm text-gray-600 font-medium">{label}</label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="••••••••"
          className={inputCls + " pr-12"}
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </div>
    </div>
  );
}

/* ── Checkbox ─────────────────────────────────────────────────── */
function DCheckbox({
  checked, onChange, children,
}: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <div className="relative shrink-0 mt-0.5">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
          ${checked ? "bg-[#e8001c] border-[#e8001c]" : "border-gray-300 group-hover:border-[#e8001c]/60"}`}>
          {checked && (
            <svg className="w-3 h-3 text-white" viewBox="0 0 10 8" fill="none">
              <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      </div>
      <span className="text-xs text-gray-500 leading-relaxed">{children}</span>
    </label>
  );
}

/* ── Barra de progresso ───────────────────────────────────────── */
function StepBar({ current, total }: { current: number; total: number }) {
  return (
    <div className="mb-5">
      <p className="text-xs text-gray-400 mb-2">Passo {current} de {total}</p>
      <div className="flex gap-1">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all ${
              i < current ? "bg-[#e8001c]" : "bg-gray-200"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

/* ── Ícones sociais SVG ──────────────────────────────────────── */
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}
function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5">
      <path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}
function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
    </svg>
  );
}

/* ══════════════════════════════════════════════════════════════
   LOGIN
══════════════════════════════════════════════════════════════ */
function LoginTab({ onSuccess, onRegister }: { onSuccess: () => void; onRegister: () => void }) {
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <DInput label="E-mail ou CPF" value={email} onChange={setEmail} placeholder="Digite seu e-mail ou CPF" type="email" />
      <DPasswordInput label="Senha" value={password} onChange={setPassword} />

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-[#e8001c] hover:bg-[#c4001a] text-white font-bold py-3.5 rounded-full
          transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-60 mt-1"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Entrar
      </button>

      <button
        type="button"
        className="text-sm text-gray-600 underline underline-offset-2 text-center hover:text-gray-800 transition-colors"
      >
        Esqueci a senha
      </button>

      {/* Divider */}
      <div className="flex items-center gap-3 my-1">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400 whitespace-nowrap">Outros métodos de entrada</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* Social */}
      <div className="flex gap-3">
        {[
          { label: "Google", icon: <GoogleIcon /> },
          { label: "Facebook", icon: <FacebookIcon /> },
          { label: "Apple", icon: <AppleIcon /> },
        ].map(({ label, icon }) => (
          <button
            key={label}
            type="button"
            aria-label={label}
            className="flex-1 border border-gray-300 rounded-full py-2.5 flex items-center justify-center
              hover:bg-gray-50 hover:border-gray-400 transition-colors"
          >
            {icon}
          </button>
        ))}
      </div>

      {/* Entrar sem senha */}
      <button
        type="button"
        className="w-full border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400
          font-semibold py-3 rounded-full transition-colors text-sm"
      >
        Entrar sem senha
      </button>

      <p className="text-sm text-gray-500 text-center mt-1">
        Não tem conta?{" "}
        <button type="button" onClick={onRegister} className="font-bold text-gray-800 underline underline-offset-2 hover:text-[#e8001c] transition-colors">
          Cadastre-se
        </button>
      </p>
    </form>
  );
}

/* ══════════════════════════════════════════════════════════════
   CADASTRO — 2 passos
══════════════════════════════════════════════════════════════ */
function RegisterTab({ onSuccess, onLogin }: { onSuccess: () => void; onLogin: () => void }) {
  const { signUp } = useAuth();

  // Passo 1
  const [step,      setStep]      = useState(1);
  const [cpf,       setCpf]       = useState("");
  const [name,      setName]      = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender,    setGender]    = useState("");
  const [phone,     setPhone]     = useState("");
  const [email,     setEmail]     = useState("");
  const [offers,    setOffers]    = useState(false);
  const [terms,     setTerms]     = useState(false);

  // Passo 2
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [done,    setDone]    = useState(false);

  function nextStep(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim() || !email.trim())
      return setError("Nome e e-mail são obrigatórios.");
    if (!terms)
      return setError("Aceite os Termos de Uso para continuar.");
    setStep(2);
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
      <div className="flex flex-col items-center gap-5 py-10 text-center">
        <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center">
          <CheckCircle2 className="h-10 w-10 text-green-500" />
        </div>
        <div>
          <p className="text-lg font-bold text-gray-800">Bem-vindo(a) à {STORE_NAME}!</p>
          <p className="text-sm text-gray-500 mt-1">Sua conta foi criada com sucesso, {name.split(" ")[0]}!</p>
        </div>
      </div>
    );
  }

  /* ── PASSO 1 ── */
  if (step === 1) {
    return (
      <form onSubmit={nextStep} className="flex flex-col gap-4">
        <StepBar current={1} total={2} />

        <div>
          <h2 className="text-xl font-bold text-gray-800">Vamos começar?</h2>
          <p className="text-sm text-gray-400 mt-0.5">Complete os dados e crie seu cadastro.</p>
        </div>

        <DInput label="CPF" value={cpf} onChange={(v) => setCpf(maskCPF(v))} placeholder="000.000.000-00" />
        <DInput label="Nome completo" value={name} onChange={setName} placeholder="Seu nome completo" />

        <div className="grid grid-cols-2 gap-3">
          <DInput label="Data de nascimento" value={birthDate} onChange={setBirthDate} type="date" />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-gray-600 font-medium">Gênero</label>
            <div className="relative">
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className={inputCls + " appearance-none pr-10 cursor-pointer"}
              >
                <option value="">Selecione</option>
                <option value="M">Masculino</option>
                <option value="F">Feminino</option>
                <option value="O">Outro</option>
                <option value="N">Prefiro não informar</option>
              </select>
              <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          </div>
        </div>

        <DInput label="Telefone celular" value={phone} onChange={(v) => setPhone(maskPhone(v))} placeholder="(00) 00000-0000" />
        <DInput label="Seu e-mail" value={email} onChange={setEmail} type="email" placeholder="seu@email.com" />

        {/* Bloco informativo */}
        <div className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-xs text-gray-500 leading-relaxed">
          Ao se cadastrar você também acessa o{" "}
          <span className="font-semibold text-[#e8001c]">Programa de Fidelidade {STORE_NAME}</span> com
          descontos exclusivos e vantagens especiais!
        </div>

        <DCheckbox checked={offers} onChange={setOffers}>
          Receber ofertas, comunicações e participação no Programa de fidelidade.
        </DCheckbox>

        <DCheckbox checked={terms} onChange={setTerms}>
          Li e aceito os{" "}
          <span className="text-[#e8001c] font-semibold">Termos de uso</span> e{" "}
          <span className="text-[#e8001c] font-semibold">Políticas de privacidade.</span>
        </DCheckbox>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <button
          type="submit"
          className="w-full bg-[#e8001c] hover:bg-[#c4001a] text-white font-bold py-3.5 rounded-full
            transition-colors text-sm mt-1"
        >
          Continuar
        </button>

        <p className="text-sm text-gray-500 text-center">
          Já tem conta?{" "}
          <button type="button" onClick={onLogin} className="font-bold text-gray-800 underline underline-offset-2 hover:text-[#e8001c] transition-colors">
            Entrar
          </button>
        </p>
      </form>
    );
  }

  /* ── PASSO 2 ── */
  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <StepBar current={2} total={2} />

      <button
        type="button"
        onClick={() => { setStep(1); setError(""); }}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors -mt-1 mb-1"
      >
        <ChevronLeft className="h-4 w-4" /> Voltar
      </button>

      <div>
        <h2 className="text-xl font-bold text-gray-800">Crie sua senha</h2>
        <p className="text-sm text-gray-400 mt-0.5">Escolha uma senha segura para sua conta.</p>
      </div>

      <DPasswordInput label="Senha (mín. 6 caracteres)" value={password} onChange={setPassword} />
      <DPasswordInput label="Confirmar senha" value={confirm} onChange={setConfirm} />

      {/* Dica de senha */}
      <ul className="text-xs text-gray-400 space-y-1 pl-1">
        {[
          { ok: password.length >= 6, label: "Pelo menos 6 caracteres" },
          { ok: /[A-Z]/.test(password), label: "Uma letra maiúscula" },
          { ok: /[0-9]/.test(password), label: "Um número" },
        ].map(({ ok, label }) => (
          <li key={label} className={`flex items-center gap-1.5 transition-colors ${ok ? "text-green-600" : ""}`}>
            <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 ${ok ? "bg-green-500" : "bg-gray-200"}`}>
              {ok && <svg className="w-2 h-2 text-white" viewBox="0 0 10 8" fill="none">
                <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>}
            </div>
            {label}
          </li>
        ))}
      </ul>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-[#e8001c] hover:bg-[#c4001a] text-white font-bold py-3.5 rounded-full
          transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-60 mt-1"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Criar minha conta
      </button>
    </form>
  );
}

/* ══════════════════════════════════════════════════════════════
   AUTH MODAL PRINCIPAL
══════════════════════════════════════════════════════════════ */
export default function AuthModal() {
  const { authModalOpen, authModalTab, openAuthModal, closeAuthModal } = useAuth();

  if (!authModalOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) closeAuthModal(); }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeAuthModal} />

      {/* Card */}
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm max-h-[92vh] overflow-y-auto">

        {/* Topo: logo + fechar */}
        <div className="sticky top-0 bg-white z-10 px-6 pt-5 pb-4 flex items-center justify-between border-b border-gray-100">
          {/* Logo */}
          <span className="text-base font-extrabold text-gray-900 tracking-tight leading-none">
            {STORE_NAME}
          </span>

          <button
            onClick={closeAuthModal}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="px-6 py-5">
          {authModalTab === "login" ? (
            <LoginTab
              onSuccess={closeAuthModal}
              onRegister={() => openAuthModal("register")}
            />
          ) : (
            <RegisterTab
              onSuccess={closeAuthModal}
              onLogin={() => openAuthModal("login")}
            />
          )}
        </div>

        {/* Rodapé segurança */}
        <div className="px-6 pb-5 flex items-center justify-center gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            Ambiente seguro
          </span>
          <span className="w-1 h-1 rounded-full bg-gray-300" />
          <span className="flex items-center gap-1">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            Dados criptografados
          </span>
        </div>
      </div>
    </div>
  );
}
