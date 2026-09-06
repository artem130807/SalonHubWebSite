import { UserRole } from "@/server/domain/types";
import { getApp } from "@/server/infrastructure/get-app";
import { requireRole } from "@/lib/session";
import { fromResult, handleRouteError } from "@/lib/http";
import { dateOnly } from "@/server/domain/scheduling";

export async function GET() {
  try {
    const session = await requireRole([UserRole.Master]);
    const today = dateOnly(new Date());
    return fromResult(await getApp().appointments.getMasterDay(session.userId, today));
  } catch (error) {
    return handleRouteError(error);
  }
}
