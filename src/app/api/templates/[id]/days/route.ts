import { UserRole } from "@/server/domain/types";
import { getApp } from "@/server/infrastructure/get-app";
import { requireRole } from "@/lib/session";
import { fromResult, handleRouteError, readJson } from "@/lib/http";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const session = await requireRole([UserRole.Master]);
    const { id } = await params;
    const body = await readJson<{ weekday: number; startTime: string; endTime: string }>(request);
    return fromResult(await getApp().templates.updateDay(session.userId, id, body));
  } catch (error) {
    return handleRouteError(error);
  }
}
