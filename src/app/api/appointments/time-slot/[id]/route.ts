import { UserRole } from "@/server/domain/types";
import { getApp } from "@/server/infrastructure/get-app";
import { requireRole } from "@/lib/session";
import { fromResult, handleRouteError } from "@/lib/http";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole([UserRole.Master, UserRole.SalonAdmin]);
    const { id } = await params;
    return fromResult(await getApp().appointments.getByTimeSlot(session, id));
  } catch (error) {
    return handleRouteError(error);
  }
}
