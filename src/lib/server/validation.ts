export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export type BusinessInput = {
  nome: string;
  categoria_id: string;
  descricao: string;
  whatsapp: string;
  endereco: string;
  bairro: string;
  instagram: string;
  site: string;
  dias_funcionamento: number[];
  horario_abertura: string;
  horario_fechamento: string;
  responsavel: string;
  status?: "pendente" | "aprovado" | "rejeitado";
  foto_url?: string;
  foto_drive_file_id?: string;
};

export function normalizeBusinessInput(value: unknown): BusinessInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Dados do cadastro inválidos.");
  }

  const input = value as Record<string, unknown>;
  const stringField = (name: string, limit: number) => {
    const field = input[name] ?? "";
    if (typeof field !== "string" || field.length > limit) {
      throw new Error(`O campo ${name} é inválido.`);
    }
    return field.trim();
  };

  const nome = stringField("nome", 160);
  const categoria_id = stringField("categoria_id", 160);
  const whatsapp = stringField("whatsapp", 32);
  const responsavel = stringField("responsavel", 160);
  const dias = input.dias_funcionamento ?? [];

  if (!nome || !categoria_id || !whatsapp || !responsavel) {
    throw new Error("Preencha nome, categoria, WhatsApp e responsável.");
  }
  if (!/^[+\d\s().-]{8,32}$/.test(whatsapp) || whatsapp.replace(/\D/g, "").length < 8) {
    throw new Error("O WhatsApp informado é inválido.");
  }
  if (
    !Array.isArray(dias) ||
    dias.length > 7 ||
    dias.some((day) => !Number.isInteger(day) || day < 0 || day > 6)
  ) {
    throw new Error("Os dias de funcionamento são inválidos.");
  }

  const horario_abertura = stringField("horario_abertura", 8);
  const horario_fechamento = stringField("horario_fechamento", 8);
  for (const horario of [horario_abertura, horario_fechamento]) {
    if (horario && !/^([01]\d|2[0-3]):[0-5]\d$/.test(horario)) {
      throw new Error("Os horários devem estar no formato HH:mm.");
    }
  }

  const status = input.status;
  if (
    status !== undefined &&
    status !== "pendente" &&
    status !== "aprovado" &&
    status !== "rejeitado"
  ) {
    throw new Error("O status informado é inválido.");
  }

  return {
    nome,
    categoria_id,
    descricao: stringField("descricao", 5000),
    whatsapp,
    endereco: stringField("endereco", 500),
    bairro: stringField("bairro", 200),
    instagram: stringField("instagram", 500),
    site: stringField("site", 500),
    dias_funcionamento: Array.from(new Set(dias as number[])).sort((a, b) => a - b),
    horario_abertura,
    horario_fechamento,
    responsavel,
    ...(status ? { status } : {}),
  };
}

export function validateImageBytes(
  declaredType: string,
  bytes: Uint8Array,
): (typeof IMAGE_MIME_TYPES)[number] {
  if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) {
    throw new Error("A imagem deve ter no máximo 5 MB.");
  }

  const startsWith = (...values: number[]) =>
    values.every((value, index) => bytes[index] === value);
  let actualType: (typeof IMAGE_MIME_TYPES)[number] | null = null;

  if (startsWith(0xff, 0xd8, 0xff)) actualType = "image/jpeg";
  if (startsWith(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) {
    actualType = "image/png";
  }
  if (
    bytes.length >= 12 &&
    startsWith(0x52, 0x49, 0x46, 0x46) &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    actualType = "image/webp";
  }

  if (!actualType || declaredType !== actualType) {
    throw new Error("Envie uma imagem JPEG, PNG ou WebP válida.");
  }
  return actualType;
}
