import { UserRole } from "@/server/domain/types";
import { getApp } from "@/server/infrastructure/get-app";
import { requireRole } from "@/lib/session";
import { fromResult, handleRouteError } from "@/lib/http";

function period(value: string | null): "week" | "month" | "year" {
  if (value === "month" || value === "year") return value;
  return "week";
}

export async function GET(request: Request) {
  try {
    const session = await requireRole([UserRole.Master]);
    const params = new URL(request.url).searchParams;
    const date = params.get("date") ? new Date(params.get("date")!) : new Date();
    return fromResult(await getApp().stats.mine(session, period(params.get("period")), date));
  } catch (error) {
    return handleRouteError(error);
  }
}
