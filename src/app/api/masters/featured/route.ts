import { getApp } from "@/server/infrastructure/get-app";
import { fromResult, handleRouteError } from "@/lib/http";

export async function GET(request: Request) {
  try {
    const limit = Number(new URL(request.url).searchParams.get("limit") ?? 4);
    return fromResult(await getApp().masters.featured(Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 12) : 4));
  } catch (error) {
    return handleRouteError(error);
  }
}
