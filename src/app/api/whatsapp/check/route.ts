import { NextRequest, NextResponse } from "next/server";
import { callAppsScript } from "@/lib/server/apps-script";
import { isRateLimited } from "@/lib/server/rate-limit";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (isRateLimited(request, "whatsapp-check", 10, 10 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Muitas verificações. Aguarde antes de tentar novamente." },
      { status: 429 },
    );
  }
  try {
    const body = (await request.json()) as { whatsapp?: unknown };
    if (
      typeof body.whatsapp !== "string" ||
      body.whatsapp.replace(/\D/g, "").length < 8 ||
      body.whatsapp.length > 32
    ) {
      return NextResponse.json({ error: "O WhatsApp informado é inválido." }, { status: 400 });
    }
    const result = await callAppsScript<{ exists: boolean }>("checkWhatsapp", {
      whatsapp: body.whatsapp,
    });
    return NextResponse.json({ exists: Boolean(result?.exists) });
  } catch {
    return NextResponse.json(
      { error: "Não foi possível verificar o WhatsApp." },
      { status: 502 },
    );
  }
}
