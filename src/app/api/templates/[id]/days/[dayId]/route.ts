import { UserRole } from "@/server/domain/types";
import { getApp } from "@/server/infrastructure/get-app";
import { requireRole } from "@/lib/session";
import { fromResult, handleRouteError } from "@/lib/http";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; dayId: string }> },
) {
  try {
    const session = await requireRole([UserRole.Master]);
    const { id, dayId } = await params;
    return fromResult(await getApp().templates.deleteDay(session.userId, id, dayId));
  } catch (error) {
    return handleRouteError(error);
  }
}
