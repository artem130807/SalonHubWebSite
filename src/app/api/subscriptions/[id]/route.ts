import { UserRole } from "@/server/domain/types";
import { getApp } from "@/server/infrastructure/get-app";
import { requireRole } from "@/lib/session";
import { fromResult, handleRouteError } from "@/lib/http";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole([UserRole.Client]);
    const { id } = await params;
    return fromResult(await getApp().subscriptions.remove(session.userId, id));
  } catch (error) {
    return handleRouteError(error);
  }
}
