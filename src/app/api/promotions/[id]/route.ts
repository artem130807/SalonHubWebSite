import { UserRole } from "@/server/domain/types";
import { getApp } from "@/server/infrastructure/get-app";
import { requireRole } from "@/lib/session";
import { fromResult, handleRouteError, readJson } from "@/lib/http";
import type { PromotionDraft } from "@/server/application/catalog-content-services";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const session = await requireRole([UserRole.SalonAdmin]);
    const { id } = await params;
    const body = await readJson<PromotionDraft>(request);
    return fromResult(await getApp().promotions.update(session.userId, id, body));
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const session = await requireRole([UserRole.SalonAdmin]);
    const { id } = await params;
    return fromResult(await getApp().promotions.remove(session.userId, id));
  } catch (error) {
    return handleRouteError(error);
  }
}
