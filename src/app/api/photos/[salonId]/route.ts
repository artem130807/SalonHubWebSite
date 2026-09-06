import { UserRole } from "@/server/domain/types";
import { getApp } from "@/server/infrastructure/get-app";
import { requireRole } from "@/lib/session";
import { fromResult, handleRouteError, readJson } from "@/lib/http";

type Params = { params: Promise<{ salonId: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { salonId } = await params;
    return fromResult(await getApp().photos.list(salonId));
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const session = await requireRole([UserRole.SalonAdmin]);
    const { salonId } = await params;
    const body = await readJson<{ url: string }>(request);
    return fromResult(await getApp().photos.add(session.userId, salonId, body.url), true);
  } catch (error) {
    return handleRouteError(error);
  }
}
