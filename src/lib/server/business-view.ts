const PUBLIC_FIELDS = [
  "id",
  "nome",
  "categoria_id",
  "descricao",
  "whatsapp",
  "endereco",
  "bairro",
  "instagram",
  "site",
  "foto_url",
  "status",
  "dias_funcionamento",
  "horario_abertura",
  "horario_fechamento",
  "created_at",
] as const;

export function toPublicBusiness(record: Record<string, unknown>) {
  const result: Record<string, unknown> = {};
  for (const field of PUBLIC_FIELDS) result[field] = record[field];
  const categories = record.categorias;
  if (categories && typeof categories === "object") {
    if (Array.isArray(categories)) {
      result.categorias = categories.map((category) => ({
        nome:
          category && typeof category === "object" && "nome" in category
            ? category.nome
            : "",
      }));
    } else {
      result.categorias = {
        nome: "nome" in categories ? categories.nome : "",
      };
    }
  } else {
    result.categorias = null;
  }
  return result;
}
