export async function apiFetch(input: RequestInfo | URL, init?: RequestInit) {
  const response = await fetch(input, { ...init, credentials: "same-origin" });
  if (response.status !== 401) return response;
  const url = String(input);
  if (url.includes("/api/auth/refresh") || url.includes("/api/auth/login")) {
    return response;
  }
  const refreshed = await fetch("/api/auth/refresh", { method: "POST", credentials: "same-origin" });
  if (!refreshed.ok) return response;
  return fetch(input, { ...init, credentials: "same-origin" });
}
