"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import type { Categoria } from "../../../types";

const diasDaSemana = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

type FormularioCadastro = {
  nome: string;
  categoria_id: string;
  descricao: string;
  whatsapp: string;
  endereco: string;
  bairro: string;
  instagram: string;
  site: string;
  dias_funcionamento: number[];
  horario_abertura: string;
  horario_fechamento: string;
  responsavel: string;
};

type ErrosFormulario = Partial<Record<"nome" | "categoria_id" | "whatsapp" | "responsavel", string>>;

const estadoInicial: FormularioCadastro = {
  nome: "",
  categoria_id: "",
  descricao: "",
  whatsapp: "",
  endereco: "",
  bairro: "",
  instagram: "",
  site: "",
  dias_funcionamento: [],
  horario_abertura: "",
  horario_fechamento: "",
  responsavel: "",
};

export default function CadastroPage() {
  const router = useRouter();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [formulario, setFormulario] = useState<FormularioCadastro>(estadoInicial);
  const [foto, setFoto] = useState<File | null>(null);
  const [erros, setErros] = useState<ErrosFormulario>({});
  const [mensagemErro, setMensagemErro] = useState("");
  const [carregandoCategorias, setCarregandoCategorias] = useState(true);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    async function carregarCategorias() {
      const { data, error } = await supabase
        .from("categorias")
        .select("*")
        .order("nome", { ascending: true });

      if (!error) {
        setCategorias((data ?? []) as Categoria[]);
      } else {
        setMensagemErro("Não foi possível carregar as categorias. Tente novamente.");
      }

      setCarregandoCategorias(false);
    }

    carregarCategorias();
  }, []);

  function atualizarCampo(
    campo: Exclude<keyof FormularioCadastro, "dias_funcionamento">,
    valor: string,
  ) {
    setFormulario((estadoAtual) => ({ ...estadoAtual, [campo]: valor }));
    setErros((errosAtuais) => ({ ...errosAtuais, [campo]: undefined }));
    setMensagemErro("");
  }

  function atualizarWhatsapp(event: ChangeEvent<HTMLInputElement>) {
    atualizarCampo("whatsapp", event.target.value);
  }

  function alternarDia(dia: number) {
    setFormulario((estadoAtual) => {
      const dias = estadoAtual.dias_funcionamento.includes(dia)
        ? estadoAtual.dias_funcionamento.filter((diaAtual) => diaAtual !== dia)
        : [...estadoAtual.dias_funcionamento, dia].sort((a, b) => a - b);

      return { ...estadoAtual, dias_funcionamento: dias };
    });
  }

  function atualizarFoto(event: ChangeEvent<HTMLInputElement>) {
    const arquivo = event.target.files?.[0] ?? null;
    setFoto(arquivo);
    setMensagemErro("");
  }

  function validarFormulario() {
    const novosErros: ErrosFormulario = {};

    if (!formulario.nome.trim()) {
      novosErros.nome = "Informe o nome da empresa.";
    }
    if (!formulario.categoria_id) {
      novosErros.categoria_id = "Selecione uma categoria.";
    }
    if (!formulario.whatsapp.trim()) {
      novosErros.whatsapp = "Informe o WhatsApp da empresa.";
    }
    if (!formulario.responsavel.trim()) {
      novosErros.responsavel = "Informe o nome do responsável.";
    }

    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  }

  async function enviarCadastro(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMensagemErro("");

    if (!validarFormulario()) {
      return;
    }

    setEnviando(true);

    try {
      const whatsapp = formulario.whatsapp;
      const { data: empresaExistente, error: consultaError } = await supabase
        .from("empresas")
        .select("id")
        .eq("whatsapp", whatsapp)
        .maybeSingle();

      console.log("[Cadastro] verificação de WhatsApp", {
        whatsappConsultado: whatsapp,
        empresaExistente,
        consultaError,
      });

      if (consultaError) {
        throw new Error("Não foi possível verificar o WhatsApp informado.");
      }

      if (empresaExistente) {
        setMensagemErro(
          "Já existe um cadastro com esse WhatsApp. Entre em contato com a administração se precisar atualizar seus dados.",
        );
        return;
      }

      let fotoUrl = "";
      if (foto) {
        const nomeSeguro = foto.name.replace(/[^a-zA-Z0-9._-]/g, "-");
        const caminhoFoto = `${Date.now()}-${nomeSeguro}`;
        const { error: uploadError } = await supabase.storage
          .from("fotos-empresas")
          .upload(caminhoFoto, foto, { contentType: foto.type, upsert: false });

        if (uploadError) {
          throw new Error("Não foi possível enviar a foto. Tente novamente.");
        }

        const { data: urlData } = supabase.storage
          .from("fotos-empresas")
          .getPublicUrl(caminhoFoto);
        fotoUrl = urlData.publicUrl;
      }

      const { error: insertError } = await supabase.from("empresas").insert({
        ...formulario,
        nome: formulario.nome.trim(),
        whatsapp,
        responsavel: formulario.responsavel.trim(),
        foto_url: fotoUrl,
        status: "pendente",
      });

      if (insertError) {
        throw new Error("Não foi possível enviar o cadastro. Tente novamente.");
      }

      router.push("/cadastro/sucesso");
    } catch (error) {
      setMensagemErro(
        error instanceof Error
          ? error.message
          : "Não foi possível enviar o cadastro. Tente novamente.",
      );
    } finally {
      setEnviando(false);
    }
  }

  const classesDoCampo =
    "mt-2 h-12 w-full rounded-xl border border-[#E8E2D6] bg-white px-4 text-sm text-[#2B2B2B] outline-none placeholder:text-[#AAA49A] focus:border-[#C9A64A]";
  const classesDoLabel = "text-sm font-medium text-[#77736A]";

  return (
    <main className="min-h-screen bg-[#F7F4EE] px-5 py-8">
      <div className="mx-auto w-full max-w-2xl">
        <header className="mb-8">
          <h1 className="font-[family-name:var(--font-playfair)] text-4xl font-bold text-[#2B2B2B]">
            Cadastre seu negócio
          </h1>
          <p className="mt-2 text-sm leading-6 text-[#77736A]">
            Compartilhe sua empresa com a comunidade Betesda.
          </p>
        </header>

        {mensagemErro && (
          <p
            role="alert"
            className="mb-6 rounded-xl border border-[#D8A7A0] bg-[#FBEDEC] px-4 py-3 text-sm leading-6 text-[#8B3A32]"
          >
            {mensagemErro}
          </p>
        )}

        <form onSubmit={enviarCadastro} className="space-y-6" noValidate>
          <div>
            <label htmlFor="nome" className={classesDoLabel}>
              Nome da empresa *
            </label>
            <input
              id="nome"
              value={formulario.nome}
              onChange={(event) => atualizarCampo("nome", event.target.value)}
              className={classesDoCampo}
              aria-invalid={Boolean(erros.nome)}
            />
            {erros.nome && <p className="mt-1 text-xs text-[#8B3A32]">{erros.nome}</p>}
          </div>

          <div>
            <label htmlFor="categoria_id" className={classesDoLabel}>
              Categoria *
            </label>
            <select
              id="categoria_id"
              value={formulario.categoria_id}
              onChange={(event) => atualizarCampo("categoria_id", event.target.value)}
              className={classesDoCampo}
              disabled={carregandoCategorias}
              aria-invalid={Boolean(erros.categoria_id)}
            >
              <option value="">
                {carregandoCategorias ? "Carregando categorias..." : "Selecione uma categoria"}
              </option>
              {categorias.map((categoria) => (
                <option key={categoria.id} value={categoria.id}>
                  {categoria.nome}
                </option>
              ))}
            </select>
            {erros.categoria_id && (
              <p className="mt-1 text-xs text-[#8B3A32]">{erros.categoria_id}</p>
            )}
          </div>

          <div>
            <label htmlFor="descricao" className={classesDoLabel}>
              Descrição
            </label>
            <textarea
              id="descricao"
              value={formulario.descricao}
              onChange={(event) => atualizarCampo("descricao", event.target.value)}
              className="mt-2 min-h-32 w-full resize-y rounded-xl border border-[#E8E2D6] bg-white px-4 py-3 text-sm text-[#2B2B2B] outline-none placeholder:text-[#AAA49A] focus:border-[#C9A64A]"
              placeholder="Conte um pouco sobre sua empresa"
            />
          </div>

          <div>
            <label htmlFor="whatsapp" className={classesDoLabel}>
              WhatsApp *
            </label>
            <input
              id="whatsapp"
              type="tel"
              inputMode="numeric"
              value={formulario.whatsapp}
              onChange={atualizarWhatsapp}
              placeholder="21999999999"
              className={classesDoCampo}
              aria-invalid={Boolean(erros.whatsapp)}
            />
            {erros.whatsapp && <p className="mt-1 text-xs text-[#8B3A32]">{erros.whatsapp}</p>}
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="endereco" className={classesDoLabel}>
                Endereço
              </label>
              <input
                id="endereco"
                value={formulario.endereco}
                onChange={(event) => atualizarCampo("endereco", event.target.value)}
                className={classesDoCampo}
              />
            </div>
            <div>
              <label htmlFor="bairro" className={classesDoLabel}>
                Bairro
              </label>
              <input
                id="bairro"
                value={formulario.bairro}
                onChange={(event) => atualizarCampo("bairro", event.target.value)}
                className={classesDoCampo}
              />
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="instagram" className={classesDoLabel}>
                Instagram
              </label>
              <input
                id="instagram"
                value={formulario.instagram}
                onChange={(event) => atualizarCampo("instagram", event.target.value)}
                placeholder="@suaempresa"
                className={classesDoCampo}
              />
            </div>
            <div>
              <label htmlFor="site" className={classesDoLabel}>
                Site
              </label>
              <input
                id="site"
                type="url"
                value={formulario.site}
                onChange={(event) => atualizarCampo("site", event.target.value)}
                placeholder="www.suaempresa.com.br"
                className={classesDoCampo}
              />
            </div>
          </div>

          <fieldset>
            <legend className={classesDoLabel}>Dias de funcionamento</legend>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {diasDaSemana.map((dia, index) => (
                <label
                  key={dia}
                  className="flex cursor-pointer items-center gap-2 rounded-xl border border-[#E8E2D6] bg-white px-3 py-3 text-sm text-[#555149]"
                >
                  <input
                    type="checkbox"
                    checked={formulario.dias_funcionamento.includes(index)}
                    onChange={() => alternarDia(index)}
                    className="h-4 w-4 accent-[#C9A64A]"
                  />
                  {dia}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="horario_abertura" className={classesDoLabel}>
                Horário de abertura
              </label>
              <input
                id="horario_abertura"
                type="time"
                value={formulario.horario_abertura}
                onChange={(event) => atualizarCampo("horario_abertura", event.target.value)}
                className={classesDoCampo}
              />
            </div>
            <div>
              <label htmlFor="horario_fechamento" className={classesDoLabel}>
                Horário de fechamento
              </label>
              <input
                id="horario_fechamento"
                type="time"
                value={formulario.horario_fechamento}
                onChange={(event) => atualizarCampo("horario_fechamento", event.target.value)}
                className={classesDoCampo}
              />
            </div>
          </div>

          <div>
            <label htmlFor="foto" className={classesDoLabel}>
              Foto da empresa
            </label>
            <input
              id="foto"
              type="file"
              accept="image/*"
              onChange={atualizarFoto}
              className="mt-2 block w-full rounded-xl border border-[#E8E2D6] bg-white text-sm text-[#77736A] file:mr-4 file:border-0 file:border-r file:border-[#E8E2D6] file:bg-[#F7F4EE] file:px-4 file:py-3 file:text-sm file:font-medium file:text-[#555149]"
            />
          </div>

          <div>
            <label htmlFor="responsavel" className={classesDoLabel}>
              Nome do responsável *
            </label>
            <input
              id="responsavel"
              value={formulario.responsavel}
              onChange={(event) => atualizarCampo("responsavel", event.target.value)}
              className={classesDoCampo}
              aria-invalid={Boolean(erros.responsavel)}
            />
            {erros.responsavel && (
              <p className="mt-1 text-xs text-[#8B3A32]">{erros.responsavel}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={enviando}
            className="h-12 w-full rounded-full bg-[#0D0D0C] px-5 text-sm font-semibold text-[#E5D09A] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {enviando ? "Enviando cadastro..." : "Enviar cadastro"}
          </button>
        </form>
      </div>
    </main>
  );
}