import { NextResponse } from "next/server";
import type { Result } from "@/server/domain/result";
import { AuthError } from "@/lib/session";

export class HttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

export function jsonOk<T>(value: T, status = 200) {
  if (value === undefined) {
    return NextResponse.json({ ok: true }, { status });
  }
  return NextResponse.json(value, { status });
}

export function jsonError(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

export function statusFromMessage(error: string) {
  const text = error.toLowerCase();
  if (text.includes("не авторизован")) return 401;
  if (text.includes("refresh-токен") || text.includes("refresh token")) return 401;
  if (text.includes("нет прав") || text.includes("недостаточно прав")) return 403;
  if (text.includes("не найден") || text.includes("не существует")) return 404;
  if (text.includes("занят")) return 409;
  return 400;
}

export function fromResult<T>(result: Result<T>, created = false) {
  if (!result.ok) return jsonError(result.error, statusFromMessage(result.error));
  return jsonOk(result.value, created ? 201 : 200);
}

export function handleRouteError(error: unknown) {
  if (error instanceof AuthError) return jsonError(error.message, error.status);
  if (error instanceof HttpError) return jsonError(error.message, error.status);
  const message = error instanceof Error ? error.message : "Unexpected error";
  return jsonError(message, 500);
}

export async function readJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new HttpError("Некорректный JSON", 400);
  }
}
