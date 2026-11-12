import { NextRequest, NextResponse } from "next/server";
import { callAppsScript } from "@/lib/server/apps-script";
import { getAdminSession, hasSameOrigin } from "@/lib/server/admin-session";
import {
  normalizeBusinessInput,
  validateImageBytes,
} from "@/lib/server/validation";
import { isRateLimited } from "@/lib/server/rate-limit";

export const runtime = "nodejs";

type BusinessRecord = Record<string, unknown> & {
  foto_url?: string;
  foto_drive_file_id?: string;
};
function authorized(request: NextRequest) {
  return getAdminSession(request) !== null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Sessão administrativa inválida." }, { status: 401 });
  }
  try {
    const [business, categories] = await Promise.all([
      callAppsScript<BusinessRecord | null>("getBusiness", { id: params.id }),
      callAppsScript<unknown[]>("listCategories"),
    ]);
    if (!business) {
      return NextResponse.json({ error: "Empresa não encontrada." }, { status: 404 });
    }
    return NextResponse.json({ business, categories });
  } catch {
    return NextResponse.json(
      { error: "Não foi possível carregar os dados da empresa." },
      { status: 502 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Sessão administrativa inválida." }, { status: 401 });
  }
  if (!hasSameOrigin(request)) {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 403 });
  }
  if (isRateLimited(request, "admin-business-update", 20, 15 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Muitas operações. Aguarde antes de tentar novamente." },
      { status: 429 },
    );
  }

  try {
    const formData = await request.formData();
    const rawBusiness = formData.get("business");
    if (typeof rawBusiness !== "string") {
      return NextResponse.json({ error: "Dados da empresa inválidos." }, { status: 400 });
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawBusiness);
    } catch {
      return NextResponse.json({ error: "Dados da empresa inválidos." }, { status: 400 });
    }
    const business = normalizeBusinessInput(parsed);
    if (
      !business.status ||
      !["pendente", "aprovado", "rejeitado"].includes(business.status)
    ) {
      return NextResponse.json({ error: "Selecione um status válido." }, { status: 400 });
    }

    const photo = formData.get("foto");
    if (photo !== null && !(photo instanceof File)) {
      return NextResponse.json({ error: "Arquivo de imagem inválido." }, { status: 400 });
    }
    let photoPayload: { base64: string; mimeType: string; fileName: string } | undefined;
    if (photo instanceof File && photo.size > 0) {
      const bytes = new Uint8Array(await photo.arrayBuffer());
      const mimeType = validateImageBytes(photo.type, bytes);
      photoPayload = {
        base64: Buffer.from(bytes).toString("base64"),
        mimeType,
        fileName: photo.name,
      };
    }

    const updated = await callAppsScript("updateBusiness", {
      id: params.id,
      business,
      photo: photoPayload,
    });
    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("WHATSAPP_ALREADY_EXISTS")) {
      return NextResponse.json(
        { error: "Já existe um cadastro com esse WhatsApp." },
        { status: 409 },
      );
    }
    if (
      message.includes("Dados da empresa") ||
      message.includes("Preencha") ||
      message.includes("WhatsApp") ||
      message.includes("horário") ||
      message.includes("dias de funcionamento")
    ) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Não foi possível salvar as alterações." },
      { status: 502 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Sessão administrativa inválida." }, { status: 401 });
  }
  if (!hasSameOrigin(request)) {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 403 });
  }
  try {
    await callAppsScript("deleteBusiness", { id: params.id });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Não foi possível excluir o cadastro e sua foto." },
      { status: 502 },
    );
  }
}
