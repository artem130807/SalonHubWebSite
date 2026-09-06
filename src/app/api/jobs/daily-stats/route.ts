import { getApp } from "@/server/infrastructure/get-app";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";

export async function POST(request: Request) {
  try {
    const secret = process.env.CRON_SECRET;
    if (!secret) return jsonError("Not found", 404);
    const header = request.headers.get("x-cron-secret");
    if (header !== secret) return jsonError("Не авторизован", 401);
    const result = await getApp().dailyStatsJob.catchUp();
    if (!result.ok) return jsonError(result.error);
    return jsonOk(result.value);
  } catch (error) {
    return handleRouteError(error);
  }
}
