import { UserRole } from "@/server/domain/types";
import { getApp } from "@/server/infrastructure/get-app";
import { requireRole } from "@/lib/session";
import { fromResult, handleRouteError, jsonError, readJson } from "@/lib/http";
import type { PromotionDraft } from "@/server/application/catalog-content-services";

export async function GET() {
  try {
    const session = await requireRole([UserRole.SalonAdmin]);
    if (!session.salonId) return jsonError("Салон не найден");
    return fromResult(await getApp().promotions.listForAdmin(session.userId, session.salonId));
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireRole([UserRole.SalonAdmin]);
    if (!session.salonId) return jsonError("Салон не найден");
    const body = await readJson<PromotionDraft>(request);
    return fromResult(await getApp().promotions.create(session.userId, session.salonId, body), true);
  } catch (error) {
    return handleRouteError(error);
  }
}
