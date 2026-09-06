"use client";

import Image from "next/image";
import { useParams } from "next/navigation";
import { MapPin, MessageCircle, Store } from "lucide-react";
import { useEffect, useState } from "react";
import OpenBadge from "../../../../components/OpenBadge";
import { supabase } from "../../../../lib/supabaseClient";
import type { Empresa } from "../../../../types";

type EmpresaComCategoria = Empresa & {
  categorias: { nome: string } | { nome: string }[] | null;
};

const nomesDosDias = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

function formatarDias(dias: number[]) {
  const diasValidos = dias
    .filter((dia, index) => dias.indexOf(dia) === index)
    .filter((dia) => dia >= 0 && dia <= 6)
    .sort((a, b) => a - b);

  if (!diasValidos.length) {
    return "Horário não informado";
  }

  if (diasValidos.length === 7) {
    return "Todos os dias";
  }

  const grupos: number[][] = [];
  diasValidos.forEach((dia) => {
    const grupoAtual = grupos[grupos.length - 1];
    if (grupoAtual && dia === grupoAtual[grupoAtual.length - 1] + 1) {
      grupoAtual.push(dia);
    } else {
      grupos.push([dia]);
    }
  });

  return grupos
    .map((grupo) => {
      const primeiro = nomesDosDias[grupo[0]];
      const ultimo = nomesDosDias[grupo[grupo.length - 1]];
      return grupo.length > 1 ? `${primeiro} a ${ultimo}` : primeiro;
    })
    .join(", ");
}

function formatarHorario(empresa: Empresa) {
  const dias = formatarDias(empresa.dias_funcionamento ?? []);
  if (!empresa.horario_abertura || !empresa.horario_fechamento) {
    return dias;
  }

  return `${dias}, ${empresa.horario_abertura} às ${empresa.horario_fechamento}`;
}

function obterNomeDaCategoria(categorias: EmpresaComCategoria["categorias"]) {
  if (Array.isArray(categorias)) {
    return categorias[0]?.nome ?? "Sem categoria";
  }

  return categorias?.nome ?? "Sem categoria";
}

function obterLink(url: string) {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

export default function EmpresaPage() {
  const params = useParams<{ id: string }>();
  const [empresa, setEmpresa] = useState<EmpresaComCategoria | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function carregarEmpresa() {
      setCarregando(true);

      const id = Array.isArray(params.id) ? params.id[0] : params.id;
      const { data, error } = await supabase
        .from("empresas")
        .select("*, categorias(nome)")
        .eq("id", id)
        .eq("status", "aprovado")
        .maybeSingle();

      if (error || !data) {
        setEmpresa(null);
      } else {
        setEmpresa(data as EmpresaComCategoria);
      }

      setCarregando(false);
    }

    if (params.id) {
      carregarEmpresa();
    }
  }, [params.id]);

  if (carregando) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-2xl px-5 py-12 text-center text-sm text-[#77736A]">
        Carregando empresa...
      </main>
    );
  }

  if (!empresa) {
    return (
      <main className="mx-auto flex min-h-[50vh] w-full max-w-2xl items-center justify-center px-5 py-12 text-center">
        <p className="text-lg font-medium text-[#2B2B2B]">Empresa não encontrada</p>
      </main>
    );
  }

  const whatsapp = empresa.whatsapp.replace(/\D/g, "");

  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl px-5 py-6">
      <div className="relative h-64 overflow-hidden rounded-2xl bg-[#EFE2C0] sm:h-80">
        {empresa.foto_url ? (
          <Image
            src={empresa.foto_url}
            alt={`Imagem de ${empresa.nome}`}
            fill
            sizes="(max-width: 768px) 100vw, 672px"
            className="object-cover"
            priority
          />
        ) : (
          <Store
            aria-hidden="true"
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[#8A7A45]"
            size={64}
            strokeWidth={1.25}
          />
        )}
      </div>

      <section className="py-7">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex rounded-full bg-[#F3E9CC] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#8A7A45]">
            {obterNomeDaCategoria(empresa.categorias)}
          </span>
          <OpenBadge
            diasFuncionamento={empresa.dias_funcionamento}
            horarioAbertura={empresa.horario_abertura}
            horarioFechamento={empresa.horario_fechamento}
          />
        </div>

        <h1 className="mt-4 font-[family-name:var(--font-playfair)] text-4xl font-bold leading-tight text-[#2B2B2B] sm:text-5xl">
          {empresa.nome}
        </h1>

        <p className="mt-6 whitespace-pre-line text-base leading-7 text-[#555149]">
          {empresa.descricao}
        </p>

        <div className="mt-7 space-y-4 border-t border-[#E8E2D6] pt-6 text-sm text-[#555149]">
          <div className="flex items-start gap-3">
            <MapPin className="mt-0.5 shrink-0 text-[#8A7A45]" size={19} aria-hidden="true" />
            <div>
              <p>{empresa.endereco}</p>
              <p className="mt-1 text-[#77736A]">{empresa.bairro}</p>
            </div>
          </div>
          <p className="text-[#77736A]">{formatarHorario(empresa)}</p>
        </div>

        <div className="mt-8 flex flex-col gap-3">
          <a
            href={`https://wa.me/${whatsapp}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#0D0D0C] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#2B2B2B]"
          >
            <MessageCircle size={19} aria-hidden="true" />
            Chamar no WhatsApp
          </a>

          {(empresa.instagram || empresa.site) && (
            <div className="flex flex-col gap-3 sm:flex-row">
              {empresa.instagram && (
                <a
                  href={obterLink(empresa.instagram)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-11 flex-1 items-center justify-center rounded-full border border-[#C9A64A] px-5 text-sm font-medium text-[#8A7A45] transition-colors hover:bg-[#F3E9CC]"
                >
                  Instagram
                </a>
              )}
              {empresa.site && (
                <a
                  href={obterLink(empresa.site)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-11 flex-1 items-center justify-center rounded-full border border-[#C9A64A] px-5 text-sm font-medium text-[#8A7A45] transition-colors hover:bg-[#F3E9CC]"
                >
                  Site
                </a>
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}