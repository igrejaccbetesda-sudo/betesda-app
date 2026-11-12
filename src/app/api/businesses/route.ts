import { NextRequest, NextResponse } from "next/server";
import { callAppsScript } from "@/lib/server/apps-script";
import { normalizeBusinessInput, validateImageBytes } from "@/lib/server/validation";
import { isRateLimited } from "@/lib/server/rate-limit";
import { toPublicBusiness } from "@/lib/server/business-view";

export const runtime = "nodejs";

function isDuplicateError(message: string) {
  return /WHATSAPP_ALREADY_EXISTS|já existe|duplicad/i.test(message);
}

export async function GET() {
  try {
    const businesses = await callAppsScript<Record<string, unknown>[]>("listBusinesses");
    return NextResponse.json(
      businesses
        .filter((business) => business.status === "aprovado")
        .map(toPublicBusiness),
    );
  } catch {
    return NextResponse.json(
      { error: "Não foi possível carregar as empresas." },
      { status: 502 },
    );
  }
}

export async function POST(request: NextRequest) {
  if (isRateLimited(request, "business-submit", 5, 15 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Muitos envios. Aguarde antes de tentar novamente." },
      { status: 429 },
    );
  }

  try {
    const formData = await request.formData();
    const rawBusiness = formData.get("business");
    if (typeof rawBusiness !== "string") {
      return NextResponse.json({ error: "Dados do cadastro inválidos." }, { status: 400 });
    }

    let parsedBusiness: unknown;
    try {
      parsedBusiness = JSON.parse(rawBusiness);
    } catch {
      return NextResponse.json({ error: "Dados do cadastro inválidos." }, { status: 400 });
    }
    const business = normalizeBusinessInput(parsedBusiness);

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

    const created = await callAppsScript("createBusiness", {
      business: { ...business, status: "pendente" },
      photo: photoPayload,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (
      message.includes("Dados do cadastro") ||
      message.includes("Preencha") ||
      message.includes("WhatsApp") ||
      message.includes("horário") ||
      message.includes("dias de funcionamento")
    ) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    if (isDuplicateError(message)) {
      return NextResponse.json(
        { error: "Já existe um cadastro com esse WhatsApp." },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "Não foi possível enviar o cadastro. Tente novamente." },
      { status: 502 },
    );
  }
}
