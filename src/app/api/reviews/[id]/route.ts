import { UserRole } from "@/server/domain/types";
import { getApp } from "@/server/infrastructure/get-app";
import { requireRole } from "@/lib/session";
import { fromResult, handleRouteError, readJson } from "@/lib/http";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const session = await requireRole([UserRole.Client]);
    const { id } = await params;
    const body = await readJson<{ salonRating: number; masterRating: number; comment?: string }>(request);
    return fromResult(await getApp().reviews.update(session.userId, id, body));
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const session = await requireRole([UserRole.Client]);
    const { id } = await params;
    return fromResult(await getApp().reviews.delete(session.userId, id));
  } catch (error) {
    return handleRouteError(error);
  }
}
