import { UserRole } from "@/server/domain/types";
import { getApp } from "@/server/infrastructure/get-app";
import { requireRole } from "@/lib/session";
import { fromResult, handleRouteError, readJson } from "@/lib/http";

export async function GET() {
  try {
    const session = await requireRole([UserRole.Client]);
    return fromResult(await getApp().reviews.mine(session.userId));
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireRole([UserRole.Client]);
    const body = await readJson<{
      appointmentId: string;
      salonRating: number;
      masterRating: number;
      comment?: string;
    }>(request);
    return fromResult(await getApp().reviews.create(session.userId, body), true);
  } catch (error) {
    return handleRouteError(error);
  }
}
