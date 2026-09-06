import { UserRole } from "@/server/domain/types";
import { getApp } from "@/server/infrastructure/get-app";
import { requireRole } from "@/lib/session";
import { fromResult, handleRouteError, readJson } from "@/lib/http";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    return fromResult(await getApp().masters.getBySalon(id));
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
      email: string;
      phone: string;
      password: string;
      bio?: string;
      specialization?: string;
    }>(request);
    return fromResult(await getApp().masters.createForSalon(session.userId, id, body), true);
  } catch (error) {
    return handleRouteError(error);
  }
}
