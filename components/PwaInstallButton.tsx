"use client";

import Image from "next/image";
import { Download, MoreHorizontal, Share, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isStandalone() {
  const iosNavigator = navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    iosNavigator.standalone === true
  );
}

function isAppleMobileDevice() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export default function PwaInstallButton() {
  const pathname = usePathname();
  const [installed, setInstalled] = useState(true);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const [appleDevice, setAppleDevice] = useState(false);

  useEffect(() => {
    setInstalled(isStandalone());
    setAppleDevice(isAppleMobileDevice());

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const handleAppInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
      setInstructionsOpen(false);
    };
    const displayMode = window.matchMedia("(display-mode: standalone)");
    const handleDisplayModeChange = () => setInstalled(isStandalone());

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    if (displayMode.addEventListener) {
      displayMode.addEventListener("change", handleDisplayModeChange);
    } else {
      displayMode.addListener(handleDisplayModeChange);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      if (displayMode.removeEventListener) {
        displayMode.removeEventListener("change", handleDisplayModeChange);
      } else {
        displayMode.removeListener(handleDisplayModeChange);
      }
    };
  }, []);

  if (installed || pathname.startsWith("/admin")) return null;

  async function handleInstallClick() {
    if (!installPrompt) {
      setInstructionsOpen(true);
      return;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setInstallPrompt(null);
    if (choice.outcome === "accepted") setInstructionsOpen(false);
  }

  return (
    <>
      {instructionsOpen && (
        <aside
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-install-title"
          className="fixed bottom-[136px] right-4 z-[60] w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-[#E8E2D6] bg-[#F7F4EE] p-5 text-[#2B2B2B] shadow-xl md:bottom-24 md:right-6"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="pwa-install-title" className="font-semibold">
                Adicionar Guia Betesda à tela inicial
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#77736A]">
                {appleDevice
                  ? "No Safari, toque em Compartilhar e escolha “Adicionar à Tela de Início”. Em outros navegadores no iPhone ou iPad, abra esta página no Safari para concluir."
                  : "No menu do navegador, escolha “Instalar aplicativo” ou “Adicionar à tela inicial”. A opção pode variar conforme o navegador e o dispositivo."}
              </p>
              <div className="mt-4 flex items-center gap-3 text-xs font-medium text-[#8A7A45]">
                {appleDevice ? (
                  <>
                    <Share size={18} aria-hidden="true" />
                    <span>Compartilhar</span>
                    <span aria-hidden="true">→</span>
                    <span>Adicionar à Tela de Início</span>
                  </>
                ) : (
                  <>
                    <MoreHorizontal size={20} aria-hidden="true" />
                    <span>Menu do navegador</span>
                    <span aria-hidden="true">→</span>
                    <span>Instalar</span>
                  </>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setInstructionsOpen(false)}
              aria-label="Fechar instruções"
              className="shrink-0 rounded-full p-1 text-[#77736A] hover:text-[#2B2B2B]"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        </aside>
      )}

      <button
        type="button"
        onClick={handleInstallClick}
        className="fixed bottom-[76px] right-4 z-40 inline-flex h-11 items-center gap-2 rounded-full border border-[#C9A64A] bg-[#0D0D0C] px-3 text-xs font-semibold text-[#E5D09A] shadow-lg transition-opacity hover:opacity-90 sm:right-6 sm:px-4 sm:text-sm md:bottom-6"
      >
        <Image
          src="/pwa-icon-192.png"
          alt=""
          width={25}
          height={25}
          aria-hidden="true"
          className="rounded-full"
        />
        <Download size={16} aria-hidden="true" />
        Instalar Guia Betesda
      </button>
    </>
  );
}
