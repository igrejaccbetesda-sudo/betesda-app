export type AppsScriptAction =
  | "health"
  | "listCategories"
  | "listBusinesses"
  | "adminListBusinesses"
  | "getBusiness"
  | "checkWhatsapp"
  | "createBusiness"
  | "updateBusiness"
  | "setStatus"
  | "deleteBusiness"
  | "getAdmin"
  | "resetAdminLoginAttempts"
  | "uploadPhoto"
  | "deletePhoto";

function logAppsScriptError(action: AppsScriptAction, message: string, secret: string) {
  const safeMessage = message
    .split(secret)
    .join("[REDACTED]")
    .replace(/("(?:secret|token|password|senha|base64)"\s*:\s*")[^"]*"/gi, '$1[REDACTED]"')
    .replace(/[A-Za-z0-9+/=_-]{120,}/g, "[REDACTED]");
  console.error(`[Apps Script:${action}] ${safeMessage.slice(0, 1000)}`);
}

export async function callAppsScript<T>(
  action: AppsScriptAction,
  data: Record<string, unknown> = {},
): Promise<T> {
  const url = process.env.APPS_SCRIPT_WEB_APP_URL;
  const secret = process.env.APPS_SCRIPT_API_SECRET;

  if (!url || !secret) {
    throw new Error("A integração com o backend não está configurada.");
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, action, data }),
      cache: "no-store",
      signal: AbortSignal.timeout(25_000),
    });
  } catch {
    console.error(`[Apps Script:${action}] Falha de conexão.`);
    throw new Error("Não foi possível conectar ao backend.");
  }

  let responseText: string;
  try {
    responseText = await response.text();
  } catch {
    console.error(`[Apps Script:${action}] Não foi possível ler a resposta.`);
    throw new Error("O backend retornou uma resposta inválida.");
  }

  let result: unknown;
  try {
    result = JSON.parse(responseText);
  } catch {
    console.error(
      `[Apps Script:${action}] Resposta não JSON (HTTP ${response.status}, ${response.headers.get("content-type") || "tipo desconhecido"}).`,
    );
    throw new Error("O backend retornou uma resposta inválida.");
  }

  if (
    !result ||
    typeof result !== "object" ||
    !("ok" in result) ||
    typeof result.ok !== "boolean"
  ) {
    console.error(`[Apps Script:${action}] Envelope de resposta inválido.`);
    throw new Error("O backend retornou uma resposta inválida.");
  }

  if (!result.ok) {
    const message =
      "error" in result && typeof result.error === "string"
        ? result.error
        : "A operação não foi concluída.";
    logAppsScriptError(action, message, secret);
    throw new Error(message);
  }

  if (!response.ok || !("data" in result)) {
    console.error(`[Apps Script:${action}] Resposta de sucesso inválida (HTTP ${response.status}).`);
    throw new Error("O backend retornou uma resposta inválida.");
  }

  return result.data as T;
}
