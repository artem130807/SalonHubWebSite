import { UserRole } from "@/server/domain/types";
import { getApp } from "@/server/infrastructure/get-app";
import { requireRole } from "@/lib/session";
import { fromResult, handleRouteError, readJson } from "@/lib/http";

export async function GET() {
  try {
    const session = await requireRole([UserRole.Master]);
    return fromResult(await getApp().templates.list(session.userId));
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireRole([UserRole.Master]);
    const body = await readJson<{
      name: string;
      days: { weekday: number; startTime: string; endTime: string }[];
    }>(request);
    return fromResult(await getApp().templates.create(session.userId, body), true);
  } catch (error) {
    return handleRouteError(error);
  }
}
