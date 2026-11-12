const INSTAGRAM_HOSTS = new Set(["instagram.com", "www.instagram.com"]);
const PROFILE_NAME = /^[A-Za-z0-9._]{1,30}$/;

function isProfileName(value: string) {
  return PROFILE_NAME.test(value) && !value.startsWith(".") && !value.endsWith(".");
}

export function getInstagramProfileUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const input = value.trim();
  if (!input) return null;

  const username = input.startsWith("@") ? input.slice(1) : input;
  if (isProfileName(username)) {
    return `https://www.instagram.com/${encodeURIComponent(username)}/`;
  }

  let url: URL;
  try {
    const urlInput = /^https?:\/\//i.test(input)
      ? input
      : /^(?:www\.)?instagram\.com(?:\/|$)/i.test(input)
        ? `https://${input}`
        : "";
    if (!urlInput) return null;
    url = new URL(urlInput);
  } catch {
    return null;
  }

  if (
    !INSTAGRAM_HOSTS.has(url.hostname.toLowerCase()) ||
    (url.protocol !== "http:" && url.protocol !== "https:") ||
    url.username ||
    url.password ||
    url.port
  ) {
    return null;
  }

  const pathSegments = url.pathname.split("/").filter(Boolean);
  if (!pathSegments.length) return null;
  const firstSegment = pathSegments[0].startsWith("@")
    ? pathSegments[0].slice(1)
    : pathSegments[0];
  if (!isProfileName(firstSegment)) return null;
  pathSegments[0] = firstSegment;

  url.protocol = "https:";
  url.hostname = "www.instagram.com";
  url.pathname = `/${pathSegments.map(encodeURIComponent).join("/")}/`;
  return url.toString();
}
