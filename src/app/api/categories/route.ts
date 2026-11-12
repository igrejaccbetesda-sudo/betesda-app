import { NextResponse } from "next/server";
import { callAppsScript } from "@/lib/server/apps-script";

export const runtime = "nodejs";

export async function GET() {
  try {
    const categories = await callAppsScript<unknown[]>("listCategories");
    return NextResponse.json(categories);
  } catch {
    return NextResponse.json(
      { error: "Não foi possível carregar as categorias." },
      { status: 502 },
    );
  }
}
