export function parseInternalPath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const path = value.trim();
  if (!path.startsWith("/")) return null;
  if (path.startsWith("//") || path.startsWith("/\\")) return null;
  if (path.includes("://")) return null;
  return path;
}

export function withReturnTo(href: string, from?: string | null) {
  const path = parseInternalPath(from);
  if (!path) return href;
  const separator = href.includes("?") ? "&" : "?";
  return `${href}${separator}from=${encodeURIComponent(path)}`;
}
