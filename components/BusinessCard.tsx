import Link from "next/link";
import { ArrowRight, MapPin, MessageCircle } from "lucide-react";
import OpenBadge from "./OpenBadge";
import BusinessImage from "./BusinessImage";
import type { Empresa } from "../types";

type BusinessCardProps = {
  empresa: Empresa;
  categoria: string;
};

export default function BusinessCard({
  empresa,
  categoria,
}: BusinessCardProps) {
  const whatsapp = empresa.whatsapp.replace(/\D/g, "");

  return (
    <article className="block overflow-hidden rounded-2xl border border-[#E8E2D6] bg-white transition-shadow hover:shadow-md">
      <div className="relative h-[100px]">
        <BusinessImage
          src={empresa.foto_url}
          alt={`Imagem de ${empresa.nome}`}
          tipo={empresa.tipo_imagem}
          sizes="(max-width: 768px) 100vw, 420px"
          iconSize={34}
        />
        <div className="absolute bottom-3 left-3">
          <OpenBadge
            diasFuncionamento={empresa.dias_funcionamento}
            horarioAbertura={empresa.horario_abertura}
            horarioFechamento={empresa.horario_fechamento}
          />
        </div>
      </div>

      <div className="p-5">
        <span className="inline-flex rounded-full bg-[#F3E9CC] px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[#8A7A45]">
          {categoria}
        </span>

        <h2 className="mt-3 font-[family-name:var(--font-playfair)] text-2xl font-bold text-[#2B2B2B]">
          {empresa.nome}
        </h2>

        <p className="mt-2 flex items-center gap-1.5 text-sm text-[#77736A]">
          <MapPin size={16} aria-hidden="true" />
          <span>{empresa.bairro}</span>
        </p>

        <div className="mt-5 flex items-center justify-between border-t border-[#E8E2D6] pt-4 text-sm font-semibold text-[#C9A64A]">
          {whatsapp ? (
            <a
              href={`https://wa.me/${whatsapp}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-[#C9A64A] px-3 text-xs font-semibold text-[#8A7A45] transition-colors hover:bg-[#F3E9CC]"
            >
              <MessageCircle size={15} aria-hidden="true" />
              Chamar no WhatsApp
            </a>
          ) : (
            <span />
          )}
          <Link href={`/empresa/${empresa.id}`} className="inline-flex items-center">
            <span>Ver detalhes</span>
            <ArrowRight className="ml-2" size={17} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}
