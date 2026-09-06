import Link from "next/link";
import { CheckCircle } from "lucide-react";

export default function CadastroSucessoPage() {
  return (
    <main className="flex min-h-[calc(100vh-80px)] items-center justify-center bg-[#F7F4EE] px-5 py-12">
      <section className="w-full max-w-lg text-center">
        <CheckCircle
          aria-hidden="true"
          className="mx-auto text-[#C9A64A]"
          size={76}
          strokeWidth={1.5}
        />

        <h1 className="mt-6 font-[family-name:var(--font-playfair)] text-4xl font-bold text-[#2B2B2B]">
          Cadastro recebido!
        </h1>

        <p className="mt-4 text-base leading-7 text-[#77736A]">
          Seu negócio foi enviado com sucesso e está em análise. Assim que for
          aprovado pela administração, ele aparecerá na consulta.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/consulta"
            className="inline-flex h-12 items-center justify-center rounded-full bg-[#0D0D0C] px-6 text-sm font-semibold text-[#E5D09A] transition-opacity hover:opacity-90"
          >
            Voltar para o início
          </Link>
          <Link
            href="/cadastro"
            className="inline-flex h-12 items-center justify-center rounded-full border border-[#C9A64A] px-6 text-sm font-semibold text-[#8A7A45] transition-colors hover:bg-[#F3E9CC]"
          >
            Fazer novo cadastro
          </Link>
        </div>
      </section>
    </main>
  );
}