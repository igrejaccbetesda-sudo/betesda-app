const GOOGLE_DRIVE_HOSTS = new Set([
  "drive.google.com",
  "drive.usercontent.google.com",
]);

export function getBrowserImageUrl(source: string) {
  try {
    const url = new URL(source);
    if (!GOOGLE_DRIVE_HOSTS.has(url.hostname)) return source;

    const id =
      url.searchParams.get("id") ??
      url.pathname.match(/^\/file\/d\/([^/]+)/)?.[1];
    if (!id) return source;

    const thumbnail = new URL("https://drive.google.com/thumbnail");
    thumbnail.searchParams.set("id", id);
    thumbnail.searchParams.set("sz", "w2000");
    return thumbnail.toString();
  } catch {
    return source;
  }
}
