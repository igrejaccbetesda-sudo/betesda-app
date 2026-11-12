const DAY_NAMES = [
  "domingo",
  "segunda",
  "terça",
  "quarta",
  "quinta",
  "sexta",
  "sábado",
];

const SAO_PAULO_TIME_ZONE = "America/Sao_Paulo";

function formatDateTime(value: Date) {
  if (Number.isNaN(value.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: SAO_PAULO_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(value);
}

export function normalizeBusinessTime(value: unknown): string {
  if (value instanceof Date) return formatDateTime(value);
  if (typeof value === "number" && Number.isFinite(value) && value >= 0 && value < 1) {
    const totalMinutes = Math.round(value * 24 * 60) % (24 * 60);
    return `${String(Math.floor(totalMinutes / 60)).padStart(2, "0")}:${String(
      totalMinutes % 60,
    ).padStart(2, "0")}`;
  }
  if (typeof value !== "string") return "";

  const text = value.trim();
  const timeOnly = /^(\d{1,2}):([0-5]\d)(?::[0-5]\d(?:\.\d+)?)?$/.exec(text);
  if (timeOnly) {
    const hours = Number(timeOnly[1]);
    if (hours > 23) return "";
    return `${String(hours).padStart(2, "0")}:${timeOnly[2]}`;
  }

  const dateTextTime = /\b(\d{1,2}):([0-5]\d):[0-5]\d(?:\.\d+)?\b/.exec(text);
  if (dateTextTime && !/^\d{4}-\d\d-\d\dT/.test(text)) {
    const hours = Number(dateTextTime[1]);
    if (hours <= 23) return `${String(hours).padStart(2, "0")}:${dateTextTime[2]}`;
  }

  return formatDateTime(new Date(text));
}

export function normalizeBusinessDays(value: unknown): number[] {
  let days: unknown = value;
  if (typeof value === "string") {
    const text = value.trim().replace(/[{}]/g, "");
    if (!text) return [];
    try {
      days = JSON.parse(text);
    } catch {
      days = text.split(",").map((day) => Number(day.trim()));
    }
  }
  if (!Array.isArray(days)) return [];
  return Array.from(
    new Set(
      days.filter(
        (day): day is number =>
          typeof day === "number" && Number.isInteger(day) && day >= 0 && day <= 6,
      ),
    ),
  ).sort((left, right) => left - right);
}

export function formatBusinessDays(value: unknown): string {
  const days = normalizeBusinessDays(value);
  if (!days.length) return "Horário não informado";
  if (days.length === 7) return "Todos os dias";

  const ranges: number[][] = [];
  for (const day of days) {
    const currentRange = ranges[ranges.length - 1];
    if (currentRange && day === currentRange[currentRange.length - 1] + 1) {
      currentRange.push(day);
    } else {
      ranges.push([day]);
    }
  }

  return ranges
    .map((range) => {
      const firstDay =
        DAY_NAMES[range[0]].charAt(0).toUpperCase() + DAY_NAMES[range[0]].slice(1);
      const lastDay = DAY_NAMES[range[range.length - 1]];
      return range.length > 1 ? `${firstDay} a ${lastDay}` : firstDay;
    })
    .join(", ");
}

export function formatBusinessSchedule(
  days: unknown,
  openingTime: unknown,
  closingTime: unknown,
): string {
  const formattedDays = formatBusinessDays(days);
  const opening = normalizeBusinessTime(openingTime);
  const closing = normalizeBusinessTime(closingTime);
  if (!opening || !closing) return formattedDays;
  return `${formattedDays} · ${opening} às ${closing}`;
}
