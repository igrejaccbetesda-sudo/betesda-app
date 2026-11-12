"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, LogOut, Pencil, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Empresa } from "../../../../types";

type EmpresaComCategoria = Empresa & {
  categorias: { nome: string } | { nome: string }[] | null;
};

type FiltroStatus = "todos" | "pendente" | "aprovado" | "rejeitado";

const filtros: { valor: FiltroStatus; label: string }[] = [
  { valor: "todos", label: "Todos" },
  { valor: "pendente", label: "Pendente" },
  { valor: "aprovado", label: "Aprovado" },
  { valor: "rejeitado", label: "Rejeitado" },
];

function obterCategoria(categorias: EmpresaComCategoria["categorias"]) {
  if (Array.isArray(categorias)) {
    return categorias[0]?.nome ?? "Sem categoria";
  }

  return categorias?.nome ?? "Sem categoria";
}

function formatarData(data: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(data));
}

function classeDoStatus(status: string) {
  if (status === "aprovado") {
    return "bg-[#E5F3E5] text-[#347A34]";
  }
  if (status === "rejeitado") {
    return "bg-[#FBEDEC] text-[#A3483F]";
  }
  return "bg-[#F3E9CC] text-[#8A7A45]";
}

function nomeDoStatus(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [empresas, setEmpresas] = useState<EmpresaComCategoria[]>([]);
  const [filtro, setFiltro] = useState<FiltroStatus>("pendente");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [atualizandoId, setAtualizandoId] = useState<string | null>(null);

  useEffect(() => {
    let montado = true;

    async function carregarDashboard() {
      try {
        const response = await fetch("/api/admin/businesses", { cache: "no-store" });
        if (response.status === 401) {
          router.replace("/admin");
          return;
        }
        if (!response.ok) throw new Error("Falha ao carregar cadastros");
        const data = (await response.json()) as EmpresaComCategoria[];
        if (montado) {
          setEmpresas(data);
          setErro("");
        }
      } catch {
        if (montado) setErro("Não foi possível carregar os cadastros. Tente novamente.");
      } finally {
        if (montado) setCarregando(false);
      }
    }

    carregarDashboard();

    return () => {
      montado = false;
    };
  }, [router]);

  const empresasFiltradas = useMemo(
    () =>
      filtro === "todos"
        ? empresas
        : empresas.filter((empresa) => empresa.status === filtro),
    [empresas, filtro],
  );

  async function atualizarStatus(id: string, status: "aprovado" | "rejeitado") {
    setErro("");
    setAtualizandoId(id);

    try {
      const response = await fetch(`/api/admin/businesses/${encodeURIComponent(id)}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (response.status === 401) {
        router.replace("/admin");
        return;
      }
      if (!response.ok) throw new Error("Falha ao atualizar status");
      setEmpresas((current) =>
        current.map((business) =>
          business.id === id ? { ...business, status } : business,
        ),
      );
    } catch {
      setErro("Não foi possível atualizar o status. Tente novamente.");
    } finally {
      setAtualizandoId(null);
    }
  }

  async function sair() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin");
  }

  return (
    <main className="min-h-screen bg-[#F7F4EE] px-5 py-8">
      <div className="mx-auto w-full max-w-5xl">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-[#77736A]">Área administrativa</p>
            <h1 className="mt-1 font-[family-name:var(--font-playfair)] text-4xl font-bold text-[#2B2B2B]">
              Cadastros de empresas
            </h1>
          </div>
          <button
            type="button"
            onClick={sair}
            className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-full border border-[#E8E2D6] bg-white px-4 text-sm font-medium text-[#555149] transition-colors hover:border-[#C9A64A] sm:self-auto"
          >
            <LogOut size={17} aria-hidden="true" />
            Sair
          </button>
        </header>

        <div className="mt-8 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {filtros.map((item) => (
            <button
              key={item.valor}
              type="button"
              onClick={() => setFiltro(item.valor)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                filtro === item.valor
                  ? "bg-[#0D0D0C] text-[#E5D09A]"
                  : "border border-[#E8E2D6] bg-white text-[#77736A] hover:border-[#C9A64A]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {erro && (
          <p
            role="alert"
            className="mt-6 rounded-xl border border-[#D8A7A0] bg-[#FBEDEC] px-4 py-3 text-sm text-[#8B3A32]"
          >
            {erro}
          </p>
        )}

        <section className="mt-6" aria-live="polite">
          {carregando ? (
            <p className="py-12 text-center text-sm text-[#77736A]">Carregando cadastros...</p>
          ) : empresasFiltradas.length === 0 ? (
            <div className="rounded-2xl border border-[#E8E2D6] bg-white px-5 py-12 text-center text-sm text-[#77736A]">
              Nenhum cadastro neste status.
            </div>
          ) : (
            <div className="space-y-3">
              {empresasFiltradas.map((empresa) => (
                <article
                  key={empresa.id}
                  className="rounded-2xl border border-[#E8E2D6] bg-white p-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[#2B2B2B]">
                          {empresa.nome}
                        </h2>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${classeDoStatus(empresa.status)}`}
                        >
                          {nomeDoStatus(empresa.status)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-[#77736A]">
                        {obterCategoria(empresa.categorias)} · {empresa.whatsapp}
                      </p>
                      <p className="mt-1 text-xs text-[#AAA49A]">
                        Criado em {formatarData(empresa.created_at)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => atualizarStatus(empresa.id, "aprovado")}
                        disabled={atualizandoId === empresa.id || empresa.status === "aprovado"}
                        className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-[#E5F3E5] px-4 text-sm font-semibold text-[#347A34] transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Check size={16} aria-hidden="true" />
                        Aprovar
                      </button>
                      <button
                        type="button"
                        onClick={() => atualizarStatus(empresa.id, "rejeitado")}
                        disabled={atualizandoId === empresa.id || empresa.status === "rejeitado"}
                        className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-[#FBEDEC] px-4 text-sm font-semibold text-[#A3483F] transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <X size={16} aria-hidden="true" />
                        Rejeitar
                      </button>
                      <Link
                        href={`/admin/dashboard/${empresa.id}`}
                        className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full border border-[#C9A64A] px-4 text-sm font-semibold text-[#8A7A45] transition-colors hover:bg-[#F3E9CC]"
                      >
                        <Pencil size={16} aria-hidden="true" />
                        Editar
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}