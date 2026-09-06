import { UserRole } from "@/server/domain/types";
import { getApp } from "@/server/infrastructure/get-app";
import { requireRole } from "@/lib/session";
import { fromResult, handleRouteError } from "@/lib/http";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireRole([UserRole.Client, UserRole.Master]);
    const { id } = await params;
    return fromResult(await getApp().appointments.cancel(session.userId, id));
  } catch (error) {
    return handleRouteError(error);
  }
}
