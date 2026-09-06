import { UserRole } from "@/server/domain/types";
import { getApp } from "@/server/infrastructure/get-app";
import { requireRole } from "@/lib/session";
import { fromResult, handleRouteError, readJson } from "@/lib/http";

export async function POST(request: Request) {
  try {
    const session = await requireRole([UserRole.Master]);
    const body = await readJson<{
      salonId: string;
      masterId: string;
      serviceId: string;
      timeSlotId: string;
      startTime: string;
      appointmentDate: string;
      clientNotes?: string;
      clientId?: string | null;
      guestName?: string | null;
    }>(request);
    return fromResult(await getApp().appointments.createWalkIn(session.userId, body), true);
  } catch (error) {
    return handleRouteError(error);
  }
}
