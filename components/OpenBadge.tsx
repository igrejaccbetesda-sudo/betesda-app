"use client";

import { useEffect, useState } from "react";

type OpenBadgeProps = {
  diasFuncionamento?: number[] | string;
  horarioAbertura?: string;
  horarioFechamento?: string;
};

function timeToMinutes(time: string) {
  const match = /^(\d{2}):(\d{2})(?::\d{2})?$/.exec(time);

  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (hours > 23 || minutes > 59) {
    return null;
  }

  return hours * 60 + minutes;
}

function normalizeDiasFuncionamento(dias?: number[] | string) {
  if (Array.isArray(dias)) {
    return dias;
  }

  if (!dias) {
    return [];
  }

  return dias
    .replace(/[{}]/g, "")
    .split(",")
    .map((dia) => Number(dia.trim()))
    .filter((dia) => Number.isInteger(dia));
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
      const diasFuncionamentoNormalizados = normalizeDiasFuncionamento(
        diasFuncionamento,
      );

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
