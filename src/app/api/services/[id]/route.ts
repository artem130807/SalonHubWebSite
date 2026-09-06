import { UserRole } from "@/server/domain/types";
import { getApp } from "@/server/infrastructure/get-app";
import { requireRole } from "@/lib/session";
import { fromResult, handleRouteError, readJson } from "@/lib/http";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireRole([UserRole.SalonAdmin]);
    const { id } = await params;
    const body = await readJson<{
      name: string;
      description?: string;
      durationMinutes: number;
      price: number;
      isActive: boolean;
    }>(request);
    return fromResult(await getApp().catalog.update(session.userId, id, body));
  } catch (error) {
    return handleRouteError(error);
  }
}
