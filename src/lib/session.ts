import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getApp } from "@/server/infrastructure/get-app";
import {
  ACCESS_COOKIE,
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_COOKIE,
  REFRESH_TOKEN_TTL_SECONDS,
} from "@/lib/constants";

const cookieBase = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export async function createAuthCookies(tokens: { accessToken: string; refreshToken: string }) {
  const store = await cookies();
  store.set(ACCESS_COOKIE, tokens.accessToken, {
    ...cookieBase,
    maxAge: ACCESS_TOKEN_TTL_SECONDS,
  });
  store.set(REFRESH_COOKIE, tokens.refreshToken, {
    ...cookieBase,
    maxAge: REFRESH_TOKEN_TTL_SECONDS,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(ACCESS_COOKIE);
  store.delete(REFRESH_COOKIE);
  store.delete("session");
}

export async function readRefreshToken() {
  const store = await cookies();
  return store.get(REFRESH_COOKIE)?.value ?? null;
}

export async function getOptionalSession() {
  try {
    return await requireSession();
  } catch (error) {
    if (error instanceof AuthError && error.status === 401) return null;
    throw error;
  }
}

export async function requireSession() {
  const userId = await readAuthenticatedUserId();
  if (!userId) {
    throw new AuthError("Пользователь не авторизован", 401);
  }
  const current = await getApp().auth.current(userId);
  if (!current.ok) {
    throw new AuthError("Пользователь не авторизован", 401);
  }
  return current.value;
}

export async function requireRole(roles: string[]) {
  const session = await requireSession();
  if (!roles.includes(session.role)) {
    throw new AuthError("Недостаточно прав", 403);
  }
  return session;
}

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

export function redirectIfAuthError(error: unknown, from: string): never {
  if (error instanceof AuthError) {
    if (error.status === 401) {
      redirect(`/login?from=${encodeURIComponent(from)}`);
    }
    redirect("/");
  }
  throw error;
}

export async function revokeAndClearSession() {
  const refresh = await readRefreshToken();
  await getApp().auth.logout(refresh ?? undefined);
  await clearSessionCookie();
}

async function readAuthenticatedUserId() {
  const store = await cookies();
  const access = store.get(ACCESS_COOKIE)?.value ?? store.get("session")?.value;
  if (access) {
    const payload = await getApp().tokens.verify(access);
    if (payload?.userId) return payload.userId;
  }
  const refresh = store.get(REFRESH_COOKIE)?.value;
  if (!refresh) return null;
  const resolved = await getApp().auth.resolveRefresh(refresh);
  return resolved.ok ? resolved.value.userId : null;
}
