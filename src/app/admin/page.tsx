"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

export default function AdminPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState("");
  const [carregandoSessao, setCarregandoSessao] = useState(true);
  const [entrando, setEntrando] = useState(false);

  useEffect(() => {
    let montado = true;

    async function verificarSessao() {
      try {
        const response = await fetch("/api/admin/session", { cache: "no-store" });
        if (response.ok) {
          router.replace("/admin/dashboard");
          return;
        }
      } catch {
        if (montado) setErro("Não foi possível verificar a sessão administrativa.");
      } finally {
        if (montado) setCarregandoSessao(false);
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

    if (!usuario.trim() || senha.length < 6) {
      setErro("Informe seu nome de usuário e uma senha com pelo menos 6 caracteres.");
      return;
    }

    setEntrando(true);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario: usuario.trim(), senha }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setErro(result.error || "Usuário ou senha incorretos. Verifique seus dados e tente novamente.");
        setEntrando(false);
        return;
      }
      router.replace("/admin/dashboard");
    } catch {
      setErro("Não foi possível conectar. Tente novamente.");
      setEntrando(false);
    }
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
            <label htmlFor="usuario" className="text-sm font-medium text-[#77736A]">
              Nome de usuário
            </label>
            <input
              id="usuario"
              type="text"
              autoComplete="username"
              value={usuario}
              onChange={(event) => setUsuario(event.target.value)}
              className="mt-2 h-12 w-full rounded-xl border border-[#E8E2D6] bg-white px-4 text-sm text-[#2B2B2B] outline-none placeholder:text-[#AAA49A] focus:border-[#C9A64A]"
              placeholder="Seu nome de usuário"
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
                minLength={6}
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