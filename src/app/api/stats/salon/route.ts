import { UserRole } from "@/server/domain/types";
import { getApp } from "@/server/infrastructure/get-app";
import { requireRole } from "@/lib/session";
import { fromResult, handleRouteError, jsonError } from "@/lib/http";

function period(value: string | null): "week" | "month" | "year" {
  if (value === "month" || value === "year") return value;
  return "week";
}

export async function GET(request: Request) {
  try {
    const session = await requireRole([UserRole.SalonAdmin]);
    const params = new URL(request.url).searchParams;
    const salonId = params.get("salonId") ?? session.salonId;
    if (!salonId) return jsonError("Салон не найден");
    const date = params.get("date") ? new Date(params.get("date")!) : new Date();
    return fromResult(await getApp().stats.salon(session, salonId, period(params.get("period")), date));
  } catch (error) {
    return handleRouteError(error);
  }
}
