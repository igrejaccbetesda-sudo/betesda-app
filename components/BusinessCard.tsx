import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MapPin, Store } from "lucide-react";
import OpenBadge from "./OpenBadge";
import type { Empresa } from "../types";

type BusinessCardProps = {
  empresa: Empresa;
  categoria: string;
};

export default function BusinessCard({
  empresa,
  categoria,
}: BusinessCardProps) {
  return (
    <Link
      href={`/empresa/${empresa.id}`}
      className="block overflow-hidden rounded-2xl border border-[#E8E2D6] bg-white transition-shadow hover:shadow-md"
    >
      <article>
        <div className="relative h-[100px] bg-[#EFE2C0]">
          {empresa.foto_url ? (
            <Image
              src={empresa.foto_url}
              alt={`Imagem de ${empresa.nome}`}
              fill
              sizes="(max-width: 768px) 100vw, 420px"
              className="object-cover"
            />
          ) : (
            <Store
              aria-hidden="true"
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[#8A7A45]"
              size={34}
              strokeWidth={1.5}
            />
          )}

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

          <div className="mt-5 flex items-center justify-end border-t border-[#E8E2D6] pt-4 text-sm font-semibold text-[#C9A64A]">
            <span>Ver detalhes</span>
            <ArrowRight className="ml-2" size={17} aria-hidden="true" />
          </div>
        </div>
      </article>
    </Link>
  );
}
