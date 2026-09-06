const UPLOAD_PATH = /^\/uploads\/[A-Za-z0-9._-]+$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string) {
  return UUID_RE.test(value);
}

export function isAllowedPhotoUrl(url: string) {
  const trimmed = url.trim();
  if (!trimmed || trimmed.includes("..") || trimmed.includes("\\")) return false;
  if (/^https:\/\//i.test(trimmed)) {
    try {
      return new URL(trimmed).protocol === "https:";
    } catch {
      return false;
    }
  }
  return UPLOAD_PATH.test(trimmed);
}
