import { UserRole } from "@/server/domain/types";
import { getApp } from "@/server/infrastructure/get-app";
import { requireRole } from "@/lib/session";
import { fromResult, handleRouteError, jsonError, readJson } from "@/lib/http";

export async function GET() {
  try {
    const session = await requireRole([UserRole.Master]);
    if (!session.masterProfileId) return jsonError("Профиль мастера не найден");
    return fromResult(await getApp().portfolio.listByMaster(session.masterProfileId));
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireRole([UserRole.Master]);
    const body = await readJson<{ url: string; caption?: string }>(request);
    return fromResult(await getApp().portfolio.add(session.userId, body), true);
  } catch (error) {
    return handleRouteError(error);
  }
}
