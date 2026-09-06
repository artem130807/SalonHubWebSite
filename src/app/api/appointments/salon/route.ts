import { UserRole } from "@/server/domain/types";
import { getApp } from "@/server/infrastructure/get-app";
import { requireRole } from "@/lib/session";
import { fromResult, handleRouteError, jsonError } from "@/lib/http";

export async function GET(request: Request) {
  try {
    const session = await requireRole([UserRole.SalonAdmin]);
    const date = new URL(request.url).searchParams.get("date");
    if (!session.salonId) return jsonError("Салон администратора не найден");
    return fromResult(await getApp().appointments.listSalon(session.salonId, date ?? undefined));
  } catch (error) {
    return handleRouteError(error);
  }
}
