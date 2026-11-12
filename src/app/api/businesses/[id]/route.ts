import { NextRequest, NextResponse } from "next/server";
import { callAppsScript } from "@/lib/server/apps-script";
import { toPublicBusiness } from "@/lib/server/business-view";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const business = await callAppsScript<Record<string, unknown> | null>(
      "getBusiness",
      { id: params.id },
    );
    if (!business || business.status !== "aprovado") {
      return NextResponse.json({ error: "Empresa não encontrada." }, { status: 404 });
    }
    return NextResponse.json(toPublicBusiness(business));
  } catch {
    return NextResponse.json(
      { error: "Não foi possível carregar a empresa." },
      { status: 502 },
    );
  }
}
