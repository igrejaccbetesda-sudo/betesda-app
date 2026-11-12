import { NextRequest, NextResponse } from "next/server";
import { callAppsScript } from "@/lib/server/apps-script";
import { getAdminSession } from "@/lib/server/admin-session";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!getAdminSession(request)) {
    return NextResponse.json({ error: "Sessão administrativa inválida." }, { status: 401 });
  }
  try {
    const businesses = await callAppsScript<unknown[]>("adminListBusinesses");
    return NextResponse.json(businesses);
  } catch {
    return NextResponse.json(
      { error: "Não foi possível carregar os cadastros." },
      { status: 502 },
    );
  }
}
