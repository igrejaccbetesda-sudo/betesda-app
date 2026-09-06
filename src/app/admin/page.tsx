"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "../../../lib/supabaseClient";

export default function AdminPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState("");
  const [carregandoSessao, setCarregandoSessao] = useState(true);
  const [entrando, setEntrando] = useState(false);

  useEffect(() => {
    let montado = true;

    async function verificarSessao() {
      const { data } = await supabase.auth.getSession();

      if (data.session) {
        router.replace("/admin/dashboard");
        return;
      }

      if (montado) {
        setCarregandoSessao(false);
      }
    }

    verificarSessao();

    return () => {
      montado = false;
    };
  }, [router]);

  async function fazerLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro("");

    if (!email.trim() || !senha) {
      setErro("Informe seu e-mail e sua senha para entrar.");
      return;
    }

    setEntrando(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: senha,
    });

    if (error) {
      setErro("E-mail ou senha incorretos. Verifique seus dados e tente novamente.");
      setEntrando(false);
      return;
    }

    router.replace("/admin/dashboard");
  }

  if (carregandoSessao) {
    return <main className="flex min-h-screen items-center justify-center bg-[#0D0D0C]" />;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0D0D0C] px-5 py-12">
      <section className="w-full max-w-md rounded-2xl bg-white p-7 shadow-2xl sm:p-9">
        <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-[#2B2B2B]">
          Acesso administrativo
        </h1>
        <p className="mt-2 text-sm text-[#77736A]">Entre para gerenciar os cadastros.</p>

        {erro && (
          <p
            role="alert"
            className="mt-6 rounded-xl border border-[#D8A7A0] bg-[#FBEDEC] px-4 py-3 text-sm leading-6 text-[#8B3A32]"
          >
            {erro}
          </p>
        )}

        <form onSubmit={fazerLogin} className="mt-7 space-y-5">
          <div>
            <label htmlFor="email" className="text-sm font-medium text-[#77736A]">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 h-12 w-full rounded-xl border border-[#E8E2D6] bg-white px-4 text-sm text-[#2B2B2B] outline-none placeholder:text-[#AAA49A] focus:border-[#C9A64A]"
              placeholder="admin@exemplo.com"
            />
          </div>

          <div>
            <label htmlFor="senha" className="text-sm font-medium text-[#77736A]">
              Senha
            </label>
            <div className="relative mt-2">
              <input
                id="senha"
                type={mostrarSenha ? "text" : "password"}
                autoComplete="current-password"
                value={senha}
                onChange={(event) => setSenha(event.target.value)}
                className="h-12 w-full rounded-xl border border-[#E8E2D6] bg-white px-4 pr-12 text-sm text-[#2B2B2B] outline-none placeholder:text-[#AAA49A] focus:border-[#C9A64A]"
                placeholder="Sua senha"
              />
              <button
                type="button"
                onClick={() => setMostrarSenha((valorAtual) => !valorAtual)}
                aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-[#77736A] transition-colors hover:text-[#2B2B2B]"
              >
                {mostrarSenha ? (
                  <EyeOff size={19} aria-hidden="true" />
                ) : (
                  <Eye size={19} aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={entrando}
            className="h-12 w-full rounded-full bg-[#0D0D0C] px-5 text-sm font-semibold text-[#E5D09A] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {entrando ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </section>
    </main>
  );
}