import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "betesda_admin_session";
const SESSION_SECONDS = 8 * 60 * 60;

function decodeBase64Url(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export async function middleware(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!token || !secret || secret.length < 32) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      decodeBase64Url(signature),
      new TextEncoder().encode(payload),
    );
    if (!valid) return NextResponse.redirect(new URL("/admin", request.url));

    const session = JSON.parse(
      new TextDecoder().decode(decodeBase64Url(payload)),
    ) as { sub?: unknown; iat?: unknown; exp?: unknown };
    const now = Math.floor(Date.now() / 1000);
    if (
      typeof session.sub !== "string" ||
      !session.sub ||
      !Number.isInteger(session.iat) ||
      !Number.isInteger(session.exp) ||
      (session.exp as number) <= now ||
      (session.iat as number) > now + 60 ||
      (session.exp as number) - (session.iat as number) !== SESSION_SECONDS
    ) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/admin", request.url));
  }
}

export const config = {
  matcher: ["/admin/dashboard/:path*"],
};
