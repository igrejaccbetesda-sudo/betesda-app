import { NextRequest, NextResponse } from "next/server";
import { callAppsScript } from "@/lib/server/apps-script";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_SECONDS,
  createAdminSession,
  hasSameOrigin,
} from "@/lib/server/admin-session";
import {
  isValidAdminPassword,
  normalizeAdminUsername,
  verifyAdminPassword,
} from "@/lib/server/admin-password";

export const runtime = "nodejs";

type AdminRecord = {
  usuario?: unknown;
  senha_hash?: unknown;
  senha_salt?: unknown;
};

export async function POST(request: NextRequest) {
  if (!hasSameOrigin(request)) {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 403 });
  }
  let username = "";
  try {
    const body = (await request.json()) as { usuario?: unknown; senha?: unknown };
    const normalizedUsername = normalizeAdminUsername(body.usuario);
    if (!normalizedUsername || !isValidAdminPassword(body.senha)) {
      return NextResponse.json(
        { error: "Informe seu nome de usuário e uma senha com pelo menos 6 caracteres." },
        { status: 400 },
      );
    }

    username = normalizedUsername;
    const admin = await callAppsScript<AdminRecord | null>("getAdmin", {
      usuario: username,
    });
    const valid =
      typeof admin?.usuario === "string" &&
      typeof admin.senha_hash === "string" &&
      typeof admin.senha_salt === "string" &&
      admin.usuario.trim().toLowerCase() === username &&
      (await verifyAdminPassword(body.senha, admin.senha_hash, admin.senha_salt));

    if (!valid) {
      return NextResponse.json(
        { error: "Usuário ou senha inválidos." },
        { status: 401 },
      );
    }

    await callAppsScript("resetAdminLoginAttempts", { usuario: username });
    const response = NextResponse.json({ ok: true });
    response.cookies.set(ADMIN_SESSION_COOKIE, createAdminSession(username), {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: ADMIN_SESSION_SECONDS,
    });
    return response;
  } catch (error) {
    if (error instanceof Error && error.message.includes("LOGIN_RATE_LIMITED")) {
      return NextResponse.json(
        { error: "Muitas tentativas. Aguarde antes de tentar novamente." },
        { status: 429 },
      );
    }
    return NextResponse.json(
      { error: "Não foi possível concluir o login. Verifique a configuração do administrador." },
      { status: 502 },
    );
  }
}
