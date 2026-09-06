import { UserRole } from "@/server/domain/types";
import { getApp } from "@/server/infrastructure/get-app";
import { requireRole } from "@/lib/session";
import { fromResult, handleRouteError } from "@/lib/http";

export async function GET(request: Request) {
  try {
    const session = await requireRole([UserRole.Master]);
    const date = new URL(request.url).searchParams.get("date");
    return fromResult(await getApp().appointments.listMaster(session.userId, date ?? undefined));
  } catch (error) {
    return handleRouteError(error);
  }
}
