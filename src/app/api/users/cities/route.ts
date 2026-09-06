import { getApp } from "@/server/infrastructure/get-app";
import { fromResult, handleRouteError } from "@/lib/http";

export async function GET(request: Request) {
  try {
    const prefix = new URL(request.url).searchParams.get("city") ?? undefined;
    return fromResult(await getApp().profile.cities(prefix));
  } catch (error) {
    return handleRouteError(error);
  }
}
