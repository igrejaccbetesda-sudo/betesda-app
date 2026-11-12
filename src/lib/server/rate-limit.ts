import type { NextRequest } from "next/server";

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

// Best-effort per-instance throttle; authoritative login throttling is in Apps Script.
export function isRateLimited(
  request: NextRequest,
  scope: string,
  limit: number,
  windowMs: number,
) {
  const address =
    request.headers.get("x-nf-client-connection-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
  const key = `${scope}:${address}`;
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 2000) {
      buckets.forEach((bucket, bucketKey) => {
        if (bucket.resetAt <= now) buckets.delete(bucketKey);
      });
    }
    return false;
  }
  current.count += 1;
  return current.count > limit;
}
