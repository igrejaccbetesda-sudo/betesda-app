import { scrypt as scryptCallback, timingSafeEqual } from "node:crypto";

export function normalizeAdminUsername(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const username = value.trim().toLowerCase();
  return username.length > 0 && username.length <= 254 ? username : null;
}

export function isValidAdminPassword(value: unknown): value is string {
  return typeof value === "string" && value.length >= 6 && value.length <= 1024;
}

export async function verifyAdminPassword(
  password: string,
  encodedHash: string,
  saltHex: string,
) {
  const match = /^scrypt\$16384\$8\$1\$([a-f0-9]{64})$/i.exec(encodedHash);
  if (!match || !/^[a-f0-9]{32}$/i.test(saltHex)) return false;

  const expected = Buffer.from(match[1], "hex");
  const actual = await new Promise<Buffer>((resolve, reject) => {
    scryptCallback(
      password,
      Buffer.from(saltHex, "hex"),
      32,
      { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 },
      (error, derivedKey) => {
        if (error) reject(error);
        else resolve(derivedKey);
      },
    );
  });
  return timingSafeEqual(expected, actual);
}
