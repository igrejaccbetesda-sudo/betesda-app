"use client";

import Image from "next/image";
import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { ArrowLeft, Trash2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../../lib/supabaseClient";
import type { Categoria, Empresa } from "../../../../../types";

const diasDaSemana = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

type FormularioEmpresa = Pick<
  Empresa,
  | "nome"
  | "categoria_id"
  | "descricao"
  | "whatsapp"
  | "endereco"
  | "bairro"
  | "instagram"
  | "site"
  | "dias_funcionamento"
  | "horario_abertura"
  | "horario_fechamento"
  | "responsavel"
> & {
  status: "pendente" | "aprovado" | "rejeitado";
};

function normalizarDias(dias: number[] | string | null | undefined) {
  if (Array.isArray(dias)) {
    return dias;
  }

  if (!dias) {
    return [];
  }

  return dias
    .replace(/[{}]/g, "")
    .split(",")
    .map((dia) => Number(dia.trim()))
    .filter((dia) => Number.isInteger(dia));
}

function normalizarHorario(horario: string | null | undefined) {
  return horario?.slice(0, 5) ?? "";
}

function obterCaminhoDaFoto(url: string) {
  const marcador = "/fotos-empresas/";
  const indice = url.indexOf(marcador);
  return indice >= 0 ? decodeURIComponent(url.slice(indice + marcador.length)) : null;
}

export default function EditarEmpresaPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [formulario, setFormulario] = useState<FormularioEmpresa | null>(null);
  const [fotoAtual, setFotoAtual] = useState("");
  const [novaFoto, setNovaFoto] = useState<File | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let montado = true;

    async function carregarDados() {
      const { data: sessaoData } = await supabase.auth.getSession();
      if (!sessaoData.session) {
        router.replace("/admin");
        return;
      }

      const [empresaResult, categoriasResult] = await Promise.all([
        supabase.from("empresas").select("*").eq("id", params.id).maybeSingle(),
        supabase.from("categorias").select("*").order("nome", { ascending: true }),
      ]);

      if (!montado) {
        return;
      }

      if (empresaResult.error || !empresaResult.data) {
        setErro("Empresa não encontrada.");
      } else {
        const empresa = empresaResult.data as Empresa;
        setFormulario({
          nome: empresa.nome ?? "",
          categoria_id: empresa.categoria_id ?? "",
          descricao: empresa.descricao ?? "",
          whatsapp: empresa.whatsapp ?? "",
          endereco: empresa.endereco ?? "",
          bairro: empresa.bairro ?? "",
          instagram: empresa.instagram ?? "",
          site: empresa.site ?? "",
          dias_funcionamento: normalizarDias(empresa.dias_funcionamento),
          horario_abertura: normalizarHorario(empresa.horario_abertura),
          horario_fechamento: normalizarHorario(empresa.horario_fechamento),
          responsavel: empresa.responsavel ?? "",
          status: (empresa.status ?? "pendente") as FormularioEmpresa["status"],
        });
        setFotoAtual(empresa.foto_url ?? "");
      }

      if (!categoriasResult.error) {
        setCategorias((categoriasResult.data ?? []) as Categoria[]);
      }

      setCarregando(false);
    }

    if (params.id) {
      carregarDados();
    }

    return () => {
      montado = false;
    };
  }, [params.id, router]);

  function atualizarCampo(campo: keyof Omit<FormularioEmpresa, "dias_funcionamento">, valor: string) {
    setFormulario((estadoAtual) =>
      estadoAtual ? { ...estadoAtual, [campo]: valor } : estadoAtual,
    );
    setErro("");
  }

  function atualizarFoto(event: ChangeEvent<HTMLInputElement>) {
    setNovaFoto(event.target.files?.[0] ?? null);
    setErro("");
  }

  function alternarDia(dia: number) {
    setFormulario((estadoAtual) => {
      if (!estadoAtual) {
        return estadoAtual;
      }

      const dias = estadoAtual.dias_funcionamento.includes(dia)
        ? estadoAtual.dias_funcionamento.filter((diaAtual) => diaAtual !== dia)
        : [...estadoAtual.dias_funcionamento, dia].sort((a, b) => a - b);

      return { ...estadoAtual, dias_funcionamento: dias };
    });
  }

  async function salvarAlteracoes(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!formulario) {
      return;
    }

    setErro("");
    setSalvando(true);

    try {
      let fotoUrl = fotoAtual;

      if (novaFoto) {
        const nomeSeguro = novaFoto.name.replace(/[^a-zA-Z0-9._-]/g, "-");
        const caminhoFoto = `${params.id}-${Date.now()}-${nomeSeguro}`;
        const { error: uploadError } = await supabase.storage
          .from("fotos-empresas")
          .upload(caminhoFoto, novaFoto, { contentType: novaFoto.type, upsert: false });

        if (uploadError) {
          throw new Error("Não foi possível enviar a nova foto.");
        }

        fotoUrl = supabase.storage.from("fotos-empresas").getPublicUrl(caminhoFoto).data.publicUrl;

        const caminhoFotoAnterior = obterCaminhoDaFoto(fotoAtual);
        if (caminhoFotoAnterior) {
          await supabase.storage.from("fotos-empresas").remove([caminhoFotoAnterior]);
        }
      }

      const { error: updateError } = await supabase
        .from("empresas")
        .update({ ...formulario, foto_url: fotoUrl })
        .eq("id", params.id);

      if (updateError) {
        throw new Error("Não foi possível salvar as alterações.");
      }

      setFotoAtual(fotoUrl);
      setNovaFoto(null);
      setErro("");
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível salvar as alterações.");
    } finally {
      setSalvando(false);
    }
  }

  async function excluirCadastro() {
    if (!window.confirm("Tem certeza que deseja excluir este cadastro? Essa ação não pode ser desfeita.")) {
      return;
    }

    setErro("");
    setExcluindo(true);
    const { error: deleteError } = await supabase.from("empresas").delete().eq("id", params.id);

    if (deleteError) {
      setErro("Não foi possível excluir o cadastro.");
      setExcluindo(false);
      return;
    }

    const caminhoFoto = obterCaminhoDaFoto(fotoAtual);
    if (caminhoFoto) {
      await supabase.storage.from("fotos-empresas").remove([caminhoFoto]);
    }

    router.replace("/admin/dashboard");
  }

  const classesDoCampo =
    "mt-2 h-12 w-full rounded-xl border border-[#E8E2D6] bg-white px-4 text-sm text-[#2B2B2B] outline-none placeholder:text-[#AAA49A] focus:border-[#C9A64A]";
  const classesDoLabel = "text-sm font-medium text-[#77736A]";

  if (carregando) {
    return <main className="min-h-screen bg-[#F7F4EE] px-5 py-12 text-center text-sm text-[#77736A]">Carregando empresa...</main>;
  }

  if (!formulario) {
    return (
      <main className="min-h-screen bg-[#F7F4EE] px-5 py-12 text-center">
        <p className="text-[#8B3A32]">{erro || "Empresa não encontrada."}</p>
        <Link href="/admin/dashboard" className="mt-6 inline-flex text-sm font-semibold text-[#8A7A45] hover:underline">
          Voltar para o dashboard
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F7F4EE] px-5 py-8">
      <div className="mx-auto w-full max-w-2xl">
        <Link href="/admin/dashboard" className="inline-flex items-center gap-2 text-sm font-medium text-[#77736A] hover:text-[#2B2B2B]">
          <ArrowLeft size={17} aria-hidden="true" />
          Voltar
        </Link>

        <header className="mb-8 mt-6">
          <h1 className="font-[family-name:var(--font-playfair)] text-4xl font-bold text-[#2B2B2B]">Editar empresa</h1>
          <p className="mt-2 text-sm text-[#77736A]">Atualize os dados deste cadastro.</p>
        </header>

        {erro && (
          <p role="alert" className="mb-6 rounded-xl border border-[#D8A7A0] bg-[#FBEDEC] px-4 py-3 text-sm leading-6 text-[#8B3A32]">
            {erro}
          </p>
        )}

        <form onSubmit={salvarAlteracoes} className="space-y-6">
          <div>
            <label htmlFor="nome" className={classesDoLabel}>Nome da empresa</label>
            <input id="nome" value={formulario.nome} onChange={(event) => atualizarCampo("nome", event.target.value)} className={classesDoCampo} />
          </div>

          <div>
            <label htmlFor="categoria_id" className={classesDoLabel}>Categoria</label>
            <select id="categoria_id" value={formulario.categoria_id} onChange={(event) => atualizarCampo("categoria_id", event.target.value)} className={classesDoCampo}>
              <option value="">Selecione uma categoria</option>
              {categorias.map((categoria) => <option key={categoria.id} value={categoria.id}>{categoria.nome}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="descricao" className={classesDoLabel}>Descrição</label>
            <textarea id="descricao" value={formulario.descricao} onChange={(event) => atualizarCampo("descricao", event.target.value)} className="mt-2 min-h-32 w-full resize-y rounded-xl border border-[#E8E2D6] bg-white px-4 py-3 text-sm text-[#2B2B2B] outline-none focus:border-[#C9A64A]" />
          </div>

          <div>
            <label htmlFor="whatsapp" className={classesDoLabel}>WhatsApp</label>
            <input id="whatsapp" value={formulario.whatsapp} onChange={(event) => atualizarCampo("whatsapp", event.target.value)} className={classesDoCampo} />
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {(["endereco", "bairro"] as const).map((campo) => (
              <div key={campo}>
                <label htmlFor={campo} className={classesDoLabel}>{campo === "endereco" ? "Endereço" : "Bairro"}</label>
                <input id={campo} value={formulario[campo]} onChange={(event) => atualizarCampo(campo, event.target.value)} className={classesDoCampo} />
              </div>
            ))}
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {(["instagram", "site"] as const).map((campo) => (
              <div key={campo}>
                <label htmlFor={campo} className={classesDoLabel}>{campo === "instagram" ? "Instagram" : "Site"}</label>
                <input id={campo} value={formulario[campo]} onChange={(event) => atualizarCampo(campo, event.target.value)} className={classesDoCampo} />
              </div>
            ))}
          </div>

          <fieldset>
            <legend className={classesDoLabel}>Dias de funcionamento</legend>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {diasDaSemana.map((dia, index) => (
                <label key={dia} className="flex cursor-pointer items-center gap-2 rounded-xl border border-[#E8E2D6] bg-white px-3 py-3 text-sm text-[#555149]">
                  <input type="checkbox" checked={formulario.dias_funcionamento.includes(index)} onChange={() => alternarDia(index)} className="h-4 w-4 accent-[#C9A64A]" />
                  {dia}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-6 sm:grid-cols-2">
            {(["horario_abertura", "horario_fechamento"] as const).map((campo) => (
              <div key={campo}>
                <label htmlFor={campo} className={classesDoLabel}>{campo === "horario_abertura" ? "Horário de abertura" : "Horário de fechamento"}</label>
                <input id={campo} type="time" value={formulario[campo]} onChange={(event) => atualizarCampo(campo, event.target.value)} className={classesDoCampo} />
              </div>
            ))}
          </div>

          {fotoAtual && (
            <div>
              <p className={classesDoLabel}>Foto atual</p>
              <div className="relative mt-2 h-48 overflow-hidden rounded-xl bg-[#EFE2C0]">
                <Image src={fotoAtual} alt={`Foto atual de ${formulario.nome}`} fill unoptimized className="object-cover" sizes="(max-width: 768px) 100vw, 672px" />
              </div>
            </div>
          )}

          <div>
            <label htmlFor="foto" className={classesDoLabel}>Trocar foto</label>
            <input id="foto" type="file" accept="image/*" onChange={atualizarFoto} className="mt-2 block w-full rounded-xl border border-[#E8E2D6] bg-white text-sm text-[#77736A] file:mr-4 file:border-0 file:border-r file:border-[#E8E2D6] file:bg-[#F7F4EE] file:px-4 file:py-3 file:text-sm file:font-medium file:text-[#555149]" />
          </div>

          <div>
            <label htmlFor="responsavel" className={classesDoLabel}>Responsável</label>
            <input id="responsavel" value={formulario.responsavel} onChange={(event) => atualizarCampo("responsavel", event.target.value)} className={classesDoCampo} />
          </div>

          <div>
            <label htmlFor="status" className={classesDoLabel}>Status</label>
            <select id="status" value={formulario.status} onChange={(event) => atualizarCampo("status", event.target.value)} className={classesDoCampo}>
              <option value="pendente">Pendente</option>
              <option value="aprovado">Aprovado</option>
              <option value="rejeitado">Rejeitado</option>
            </select>
          </div>

          <button type="submit" disabled={salvando || excluindo} className="h-12 w-full rounded-full bg-[#0D0D0C] px-5 text-sm font-semibold text-[#E5D09A] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60">
            {salvando ? "Salvando alterações..." : "Salvar alterações"}
          </button>
        </form>

        <button type="button" onClick={excluirCadastro} disabled={salvando || excluindo} className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-[#B9584F] px-5 text-sm font-semibold text-[#A3483F] transition-colors hover:bg-[#FBEDEC] disabled:cursor-not-allowed disabled:opacity-60">
          <Trash2 size={18} aria-hidden="true" />
          {excluindo ? "Excluindo..." : "Excluir cadastro"}
        </button>
      </div>
    </main>
  );
}