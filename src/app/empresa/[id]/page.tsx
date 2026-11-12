"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, MapPin, MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";
import OpenBadge from "../../../../components/OpenBadge";
import BusinessImage from "../../../../components/BusinessImage";
import {
  formatBusinessDays,
  normalizeBusinessTime,
} from "../../../lib/business-hours";
import { getInstagramProfileUrl } from "../../../lib/instagram";
import type { Empresa } from "../../../../types";

type EmpresaComCategoria = Empresa & {
  categorias: { nome: string } | { nome: string }[] | null;
};

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
  const router = useRouter();
  const [empresa, setEmpresa] = useState<EmpresaComCategoria | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function carregarEmpresa() {
      setCarregando(true);

      const id = Array.isArray(params.id) ? params.id[0] : params.id;
      try {
        const response = await fetch(`/api/businesses/${encodeURIComponent(id)}`, {
          cache: "no-store",
        });
        if (!response.ok) {
          setEmpresa(null);
        } else {
          setEmpresa((await response.json()) as EmpresaComCategoria);
        }
      } catch {
        setEmpresa(null);
      } finally {
        setCarregando(false);
      }
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
  const enderecoCompleto = [empresa.endereco, empresa.bairro]
    .filter((parte) => parte?.trim())
    .join(", ");
  const linkComoChegar = empresa.endereco.trim()
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(enderecoCompleto)}`
    : "";
  const diasFuncionamento = formatBusinessDays(empresa.dias_funcionamento);
  const horarioAbertura = normalizeBusinessTime(empresa.horario_abertura);
  const horarioFechamento = normalizeBusinessTime(empresa.horario_fechamento);
  const instagramUrl = getInstagramProfileUrl(empresa.instagram);

  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl px-5 py-6">
      <button
        type="button"
        onClick={() => {
          if (window.history.length > 1) router.back();
          else router.push("/consulta");
        }}
        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-[#8A7A45] transition-colors hover:text-[#2B2B2B]"
      >
        <ArrowLeft size={17} aria-hidden="true" />
        Voltar
      </button>
      <div className="relative h-64 overflow-hidden rounded-2xl sm:h-80">
        <BusinessImage
          src={empresa.foto_url}
          alt={`Imagem de ${empresa.nome}`}
          tipo={empresa.tipo_imagem}
          sizes="(max-width: 768px) 100vw, 672px"
          priority
          iconSize={64}
        />
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

        <div className="mt-7 space-y-6 border-t border-[#E8E2D6] pt-6 text-sm text-[#555149]">
          {(empresa.endereco || empresa.bairro) && (
            <section aria-labelledby="localizacao-heading">
              <h2
                id="localizacao-heading"
                className="text-sm font-semibold text-[#2B2B2B]"
              >
                Localização
              </h2>
              <div className="mt-3 flex items-start gap-3">
                <MapPin
                  className="mt-0.5 shrink-0 text-[#8A7A45]"
                  size={18}
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
                <div>
                  {empresa.endereco && <p>{empresa.endereco}</p>}
                  {empresa.bairro && (
                    <p className="mt-1 text-[#77736A]">{empresa.bairro}</p>
                  )}
                  {linkComoChegar && (
                    <a
                      href={linkComoChegar}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex font-medium text-[#8A7A45] hover:underline"
                    >
                      Como chegar
                    </a>
                  )}
                </div>
              </div>
            </section>
          )}

          <section aria-labelledby="funcionamento-heading">
            <h2
              id="funcionamento-heading"
              className="text-sm font-semibold text-[#2B2B2B]"
            >
              Horário de funcionamento
            </h2>
            <div className="mt-3 space-y-1 text-[#77736A]">
              <p>{diasFuncionamento}</p>
              {horarioAbertura && horarioFechamento && (
                <p>{horarioAbertura} às {horarioFechamento}</p>
              )}
            </div>
          </section>
        </div>

        {(empresa.whatsapp || empresa.instagram || empresa.site) && (
          <section className="mt-8">
            <div className="flex flex-col gap-3">
              {whatsapp && (
                <a
                  href={`https://wa.me/${whatsapp}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#0D0D0C] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#2B2B2B]"
                >
                  <MessageCircle size={19} aria-hidden="true" />
                  Chamar no WhatsApp
                </a>
              )}

              {(instagramUrl || empresa.site) && (
                <div className="flex flex-col gap-3 sm:flex-row">
                  {instagramUrl && (
                    <a
                      href={instagramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
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
        )}
      </section>
    </main>
  );
}