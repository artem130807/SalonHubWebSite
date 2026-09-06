import { UserRole } from "@/server/domain/types";
import { getApp } from "@/server/infrastructure/get-app";
import { requireRole } from "@/lib/session";
import { fromResult, handleRouteError, readJson } from "@/lib/http";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    return fromResult(await getApp().catalog.getBySalon(id, true));
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const session = await requireRole([UserRole.SalonAdmin]);
    const { id } = await params;
    const body = await readJson<{
      name: string;
      description?: string;
      durationMinutes: number;
      price: number;
    }>(request);
    return fromResult(await getApp().catalog.create(session.userId, id, body), true);
  } catch (error) {
    return handleRouteError(error);
  }
}
