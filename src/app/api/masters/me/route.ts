import { UserRole } from "@/server/domain/types";
import { getApp } from "@/server/infrastructure/get-app";
import { requireRole } from "@/lib/session";
import { fromResult, handleRouteError, jsonError, readJson } from "@/lib/http";

export async function GET() {
  try {
    const session = await requireRole([UserRole.Master]);
    return fromResult(await getApp().masters.getOwn(session.userId));
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireRole([UserRole.Master]);
    const body = await readJson<{ avatarUrl?: string | null }>(request);
    if (!("avatarUrl" in body)) return jsonError("Укажите фото профиля");
    return fromResult(await getApp().masters.updateOwnAvatar(session.userId, body.avatarUrl ?? null));
  } catch (error) {
    return handleRouteError(error);
  }
}
