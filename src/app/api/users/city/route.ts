import { getApp } from "@/server/infrastructure/get-app";
import { requireSession } from "@/lib/session";
import { fromResult, handleRouteError, readJson } from "@/lib/http";

export async function PATCH(request: Request) {
  try {
    const session = await requireSession();
    const body = await readJson<{ city: string }>(request);
    return fromResult(await getApp().profile.updateCity(session.userId, body.city));
  } catch (error) {
    return handleRouteError(error);
  }
}
