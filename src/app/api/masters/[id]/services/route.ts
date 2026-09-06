import { UserRole } from "@/server/domain/types";
import { getApp } from "@/server/infrastructure/get-app";
import { requireRole } from "@/lib/session";
import { fromResult, handleRouteError, readJson } from "@/lib/http";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    return fromResult(await getApp().masters.getMasterServices(id));
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const session = await requireRole([UserRole.SalonAdmin]);
    const { id } = await params;
    const body = await readJson<{ serviceId: string }>(request);
    return fromResult(await getApp().masters.assignService(session.userId, id, body.serviceId));
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const session = await requireRole([UserRole.SalonAdmin]);
    const { id } = await params;
    const serviceId = new URL(request.url).searchParams.get("serviceId");
    if (!serviceId) return fromResult({ ok: false, error: "Укажите услугу" });
    return fromResult(await getApp().masters.unassignService(session.userId, id, serviceId));
  } catch (error) {
    return handleRouteError(error);
  }
}
