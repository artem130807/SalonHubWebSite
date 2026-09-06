import { UserRole } from "@/server/domain/types";
import { getApp } from "@/server/infrastructure/get-app";
import { requireRole } from "@/lib/session";
import { fromResult, handleRouteError } from "@/lib/http";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const session = await requireRole([UserRole.Master]);
    const { id } = await params;
    return fromResult(await getApp().templates.get(session.userId, id));
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const session = await requireRole([UserRole.Master]);
    const { id } = await params;
    return fromResult(await getApp().templates.remove(session.userId, id));
  } catch (error) {
    return handleRouteError(error);
  }
}
