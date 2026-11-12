import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

export const ADMIN_SESSION_COOKIE = "betesda_admin_session";
export const ADMIN_SESSION_SECONDS = 8 * 60 * 60;

type AdminSession = {
  sub: string;
  iat: number;
  exp: number;
};

function getSessionSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || Buffer.byteLength(secret) < 32) {
    throw new Error("A configuração da sessão administrativa é inválida.");
  }
  return secret;
}

function signature(payload: string) {
  return createHmac("sha256", getSessionSecret()).update(payload).digest("base64url");
}

export function createAdminSession(username: string) {
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({ sub: username, iat: now, exp: now + ADMIN_SESSION_SECONDS }),
  ).toString("base64url");
  return `${payload}.${signature(payload)}`;
}

export function verifyAdminSession(token: string | undefined): AdminSession | null {
  if (!token) return null;

  const [payload, providedSignature, extra] = token.split(".");
  if (!payload || !providedSignature || extra) return null;

  let expectedSignature: Buffer;
  try {
    expectedSignature = Buffer.from(signature(payload), "base64url");
  } catch {
    return null;
  }
  const actualSignature = Buffer.from(providedSignature, "base64url");
  if (
    expectedSignature.length !== actualSignature.length ||
    !timingSafeEqual(expectedSignature, actualSignature)
  ) {
    return null;
  }

  try {
    const session = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as AdminSession;
    const now = Math.floor(Date.now() / 1000);
    if (
      typeof session.sub !== "string" ||
      !session.sub ||
      !Number.isInteger(session.iat) ||
      !Number.isInteger(session.exp) ||
      session.exp <= now ||
      session.iat > now + 60 ||
      session.exp - session.iat !== ADMIN_SESSION_SECONDS
    ) {
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function getAdminSession(request: NextRequest) {
  return verifyAdminSession(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

export function hasSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  return origin !== null && origin === new URL(request.url).origin;
}
