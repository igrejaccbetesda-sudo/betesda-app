import Image from "next/image";

export default function Header() {
  return (
    <header className="bg-[#0D0D0C] px-6 py-8 text-center text-[#F7F4EE] sm:py-10">
      <Image
        className="mx-auto h-auto w-[180px]"
        src="/logo-betesda.png"
        alt="Logo Betesda"
        width={360}
        height={160}
        priority
      />

      <p className="mt-3 font-[family-name:var(--font-dancing-script)] text-5xl font-bold text-[#E5D09A] sm:text-6xl">
        Guia de Negócios e Serviços
      </p>
      <p className="mt-3 text-sm text-[#F7F4EE]/80 sm:text-base">
        Encontre e apoie negócios da nossa comunidade
      </p>
    </header>
  );
}
