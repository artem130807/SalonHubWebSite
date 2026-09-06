import { UserRole } from "@/server/domain/types";
import { getApp } from "@/server/infrastructure/get-app";
import { requireRole } from "@/lib/session";
import { fromResult, handleRouteError, readJson } from "@/lib/http";

export async function POST(request: Request) {
  try {
    const session = await requireRole([UserRole.Client]);
    const body = await readJson<{
      salonId: string;
      masterId: string;
      serviceId: string;
      timeSlotId: string;
      startTime: string;
      appointmentDate: string;
      clientNotes?: string;
    }>(request);
    return fromResult(await getApp().appointments.create(session.userId, body), true);
  } catch (error) {
    return handleRouteError(error);
  }
}
