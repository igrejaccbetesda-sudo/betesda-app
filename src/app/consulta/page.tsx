"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, SearchX } from "lucide-react";
import BusinessCard from "../../../components/BusinessCard";
import { supabase } from "../../../lib/supabaseClient";
import type { Categoria, Empresa } from "../../../types";

type EmpresaComCategoria = Empresa & {
  categorias: { nome: string } | { nome: string }[] | null;
};

function getCategoryName(categorias: EmpresaComCategoria["categorias"]) {
  if (Array.isArray(categorias)) {
    return categorias[0]?.nome ?? "Sem categoria";
  }

  return categorias?.nome ?? "Sem categoria";
}

export default function ConsultaPage() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [empresas, setEmpresas] = useState<EmpresaComCategoria[]>([]);
  const [busca, setBusca] = useState("");
  const [categoriaSelecionada, setCategoriaSelecionada] = useState("todos");
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function carregarDados() {
      setCarregando(true);

      const [categoriasResult, empresasResult] = await Promise.all([
        supabase.from("categorias").select("*").order("nome", { ascending: true }),
        supabase
          .from("empresas")
          .select("*, categorias(nome)")
          .eq("status", "aprovado"),
      ]);

      if (!categoriasResult.error) {
        setCategorias((categoriasResult.data ?? []) as Categoria[]);
      }

      if (!empresasResult.error) {
        setEmpresas((empresasResult.data ?? []) as EmpresaComCategoria[]);
      }

      setCarregando(false);
    }

    carregarDados();
  }, []);

  const empresasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return empresas.filter((empresa) => {
      const correspondeBusca = !termo || empresa.nome.toLowerCase().includes(termo);
      const correspondeCategoria =
        categoriaSelecionada === "todos" ||
        empresa.categoria_id === categoriaSelecionada;

      return correspondeBusca && correspondeCategoria;
    });
  }, [busca, categoriaSelecionada, empresas]);

  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl px-5 py-8">
      <h1 className="text-sm font-medium text-[#77736A]">O que você procura?</h1>

      <div className="relative mt-3">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#77736A]"
          size={19}
        />
        <input
          type="search"
          value={busca}
          onChange={(event) => setBusca(event.target.value)}
          placeholder="Buscar negócios e serviços"
          aria-label="Buscar negócios e serviços"
          className="h-12 w-full rounded-full border border-[#E8E2D6] bg-white pl-11 pr-5 text-sm text-[#2B2B2B] outline-none placeholder:text-[#77736A] focus:border-[#C9A64A]"
        />
      </div>

      <div className="-mx-5 mt-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          type="button"
          onClick={() => setCategoriaSelecionada("todos")}
          className={`shrink-0 rounded-full px-4 py-2 text-xs font-medium transition-colors ${
            categoriaSelecionada === "todos"
              ? "bg-[#0D0D0C] text-[#E5D09A]"
              : "border border-[#E8E2D6] bg-white text-[#77736A]"
          }`}
        >
          Todos
        </button>

        {categorias.map((categoria) => {
          const isSelected = categoriaSelecionada === categoria.id;

          return (
            <button
              key={categoria.id}
              type="button"
              onClick={() => setCategoriaSelecionada(categoria.id)}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-medium transition-colors ${
                isSelected
                  ? "bg-[#0D0D0C] text-[#E5D09A]"
                  : "border border-[#E8E2D6] bg-white text-[#77736A]"
              }`}
            >
              {categoria.nome}
            </button>
          );
        })}
      </div>

      <section className="mt-6" aria-live="polite">
        {carregando ? (
          <p className="py-10 text-center text-sm text-[#77736A]">Carregando negócios...</p>
        ) : empresasFiltradas.length > 0 ? (
          <div className="flex flex-col gap-3">
            {empresasFiltradas.map((empresa) => (
              <BusinessCard
                key={empresa.id}
                empresa={empresa}
                categoria={getCategoryName(empresa.categorias)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-12 text-center text-[#77736A]">
            <SearchX aria-hidden="true" size={34} strokeWidth={1.5} />
            <p className="text-sm">Nenhuma empresa encontrada por aqui ainda.</p>
          </div>
        )}
      </section>
    </main>
  );
}