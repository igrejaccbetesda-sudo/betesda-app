import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/server/admin-session";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = getAdminSession(request);
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({ authenticated: true, usuario: session.sub });
}
