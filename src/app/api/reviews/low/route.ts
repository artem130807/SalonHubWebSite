import { UserRole } from "@/server/domain/types";
import { getApp } from "@/server/infrastructure/get-app";
import { requireRole } from "@/lib/session";
import { fromResult, handleRouteError, jsonError } from "@/lib/http";

export async function GET() {
  try {
    const session = await requireRole([UserRole.SalonAdmin]);
    if (!session.salonId) return jsonError("Салон не найден", 404);
    return fromResult(await getApp().reviews.lowRating(session.salonId));
  } catch (error) {
    return handleRouteError(error);
  }
}
