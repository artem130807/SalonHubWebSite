import { UserRole } from "@/server/domain/types";
import { getApp } from "@/server/infrastructure/get-app";
import { requireRole } from "@/lib/session";
import { fromResult, handleRouteError } from "@/lib/http";

export async function GET() {
  try {
    const session = await requireRole([UserRole.Client]);
    return fromResult(await getApp().appointments.getMine(session.userId));
  } catch (error) {
    return handleRouteError(error);
  }
}
