import { UserRole } from "@/server/domain/types";
import { getApp } from "@/server/infrastructure/get-app";
import { requireRole } from "@/lib/session";
import { fromResult, handleRouteError, readJson } from "@/lib/http";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    return fromResult(await getApp().salons.getById(id));
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PUT(request: Request, { params }: Params) {
  try {
    const session = await requireRole([UserRole.SalonAdmin]);
    const { id } = await params;
    const body = await readJson<{
      name: string;
      description?: string;
      city: string;
      street: string;
      building: string;
      phone?: string;
      openingTime?: string;
      closingTime?: string;
    }>(request);
    return fromResult(await getApp().salons.update(session.userId, id, body));
  } catch (error) {
    return handleRouteError(error);
  }
}
