"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

function FormularioLogin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/admin";

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCarregando(true);
    setErro(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: senha,
      });

      if (error) {
        setErro("Credenciais incorretas. Verifique seu e-mail e senha.");
        setCarregando(false);
        return;
      }

      router.push(redirectUrl);
      router.refresh();
    } catch {
      setErro("Erro inesperado ao conectar ao servidor. Tente novamente.");
      setCarregando(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-cafe/90 border border-ouro-suave backdrop-blur-md rounded-2xl p-8 sm:p-10 shadow-2xl relative z-10">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center size-14 rounded-full border border-ouro-medio bg-cafe-leve mb-4">
          <span className="font-serif text-2xl text-ouro font-bold">C</span>
        </div>
        <h1 className="text-2xl font-serif tracking-wide text-ouro-claro font-semibold uppercase">
          Cirlene Robalinho
        </h1>
        <p className="text-xs uppercase tracking-widest text-creme-mutado mt-1">
          Corretora de Imóveis · CRECI 4265
        </p>
        <div className="h-px w-20 bg-ouro/30 mx-auto mt-4" />
        <h2 className="text-sm uppercase tracking-wider text-creme/80 mt-4 font-medium">
          Painel Administrativo
        </h2>
      </div>

      {erro && (
        <div className="mb-6 p-3.5 bg-red-950/50 border border-red-500/40 rounded-xl text-red-200 text-xs text-center">
          {erro}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs uppercase tracking-wider text-creme-mutado mb-2">
            E-mail de acesso
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="cirlene@cirlenerobalinho.com.br"
            required
            className="w-full input-luxury text-sm"
            autoComplete="email"
          />
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wider text-creme-mutado mb-2">
            Senha
          </label>
          <input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="••••••••••••"
            required
            className="w-full input-luxury text-sm"
            autoComplete="current-password"
          />
        </div>

        <button
          type="submit"
          disabled={carregando}
          className="w-full py-3.5 rounded-xl btn-ouro text-xs uppercase tracking-widest transition-all mt-2 cursor-pointer disabled:opacity-50"
        >
          {carregando ? "Acessando..." : "Entrar no Painel"}
        </button>
      </form>

      <p className="text-center text-[0.6875rem] text-creme/40 mt-8">
        Acesso restrito e criptografado com Supabase Auth
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-espresso relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-ouro/10 rounded-full blur-[120px] pointer-events-none" />
      <Suspense fallback={<div className="text-ouro text-xs">Carregando...</div>}>
        <FormularioLogin />
      </Suspense>
    </main>
  );
}
