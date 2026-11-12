import { NextRequest, NextResponse } from "next/server";
import { callAppsScript } from "@/lib/server/apps-script";
import { getAdminSession, hasSameOrigin } from "@/lib/server/admin-session";

export const runtime = "nodejs";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  if (!getAdminSession(request)) {
    return NextResponse.json({ error: "Sessão administrativa inválida." }, { status: 401 });
  }
  if (!hasSameOrigin(request)) {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 403 });
  }
  try {
    const body = (await request.json()) as { status?: unknown };
    if (body.status !== "aprovado" && body.status !== "rejeitado") {
      return NextResponse.json({ error: "Status inválido." }, { status: 400 });
    }
    const result = await callAppsScript("setStatus", {
      id: params.id,
      status: body.status,
    });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Não foi possível atualizar o status." },
      { status: 502 },
    );
  }
}
