"use client";

import { useEffect, useState } from "react";
import { normalizeBusinessDays, normalizeBusinessTime } from "../src/lib/business-hours";

type OpenBadgeProps = {
  diasFuncionamento?: number[] | string;
  horarioAbertura?: string;
  horarioFechamento?: string;
};

function timeToMinutes(value: unknown) {
  const time = normalizeBusinessTime(value);
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export default function OpenBadge({
  diasFuncionamento,
  horarioAbertura,
  horarioFechamento,
}: OpenBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  console.log("[OpenBadge] props e status atual", {
    diasFuncionamento,
    horarioAbertura,
    horarioFechamento,
    diaSemanaAtual: now.getDay(),
    horaAtualCalculada: currentMinutes,
    estaAberto: isOpen,
  });

  useEffect(() => {
    const updateStatus = () => {
      const diasFuncionamentoNormalizados = normalizeBusinessDays(diasFuncionamento);

      if (
        !diasFuncionamentoNormalizados.length ||
        !horarioAbertura ||
        !horarioFechamento
      ) {
        setIsOpen(false);
        return;
      }

      const openingMinutes = timeToMinutes(horarioAbertura);
      const closingMinutes = timeToMinutes(horarioFechamento);

      if (openingMinutes === null || closingMinutes === null) {
        setIsOpen(false);
        return;
      }

      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const isScheduledDay = diasFuncionamentoNormalizados.includes(now.getDay());
      const isWithinHours =
        currentMinutes >= openingMinutes && currentMinutes <= closingMinutes;

      setIsOpen(isScheduledDay && isWithinHours);
    };

    updateStatus();
    const intervalId = window.setInterval(updateStatus, 60_000);

    return () => window.clearInterval(intervalId);
  }, [diasFuncionamento, horarioAbertura, horarioFechamento]);

  if (!isOpen) {
    return null;
  }

  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-[#0D0D0C] px-3 py-1.5 text-sm text-white">
      <span
        aria-hidden="true"
        className="h-2 w-2 rounded-full bg-[#5CB85C]"
      />
      Aberto agora
    </span>
  );
}
