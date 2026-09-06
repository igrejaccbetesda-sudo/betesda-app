import Link from "next/link";
import { Compass, Store } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-[calc(100vh-280px)] bg-[#F7F4EE] px-5 py-10 pb-28 sm:py-16">
      <section className="mx-auto grid w-full max-w-4xl gap-5 sm:grid-cols-2">
        <Link
          href="/consulta"
          className="group rounded-2xl border border-[#E8E2D6] bg-white p-7 transition-colors hover:border-[#C9A64A] sm:p-9"
        >
          <Compass className="text-[#C9A64A]" size={42} strokeWidth={1.5} aria-hidden="true" />
          <h2 className="mt-6 font-[family-name:var(--font-playfair)] text-2xl font-bold text-[#2B2B2B]">
            Explorar negócios
          </h2>
          <p className="mt-3 text-sm leading-6 text-[#77736A]">
            Veja empresas, lojas e serviços da nossa comunidade
          </p>
        </Link>

        <Link
          href="/cadastro"
          className="group rounded-2xl border border-[#E8E2D6] bg-white p-7 transition-colors hover:border-[#C9A64A] sm:p-9"
        >
          <Store className="text-[#C9A64A]" size={42} strokeWidth={1.5} aria-hidden="true" />
          <h2 className="mt-6 font-[family-name:var(--font-playfair)] text-2xl font-bold text-[#2B2B2B]">
            Cadastrar meu negócio
          </h2>
          <p className="mt-3 text-sm leading-6 text-[#77736A]">
            Divulgue seu negócio para toda a comunidade Betesda
          </p>
        </Link>
      </section>
    </main>
  );
}
