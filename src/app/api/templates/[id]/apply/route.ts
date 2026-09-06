import { UserRole } from "@/server/domain/types";
import { getApp } from "@/server/infrastructure/get-app";
import { requireRole } from "@/lib/session";
import { fromResult, handleRouteError, readJson } from "@/lib/http";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole([UserRole.Master]);
    const { id } = await params;
    const body = await readJson<{ from: string; to: string }>(request);
    return fromResult(await getApp().templates.apply(session.userId, id, body.from, body.to));
  } catch (error) {
    return handleRouteError(error);
  }
}
