import { getApp } from "@/server/infrastructure/get-app";
import { requireSession } from "@/lib/session";
import { fromResult, handleRouteError, readJson } from "@/lib/http";

export async function PATCH(request: Request) {
  try {
    const session = await requireSession();
    const body = await readJson<{ currentPassword: string; nextPassword: string }>(request);
    return fromResult(
      await getApp().profile.updatePassword(session.userId, body.currentPassword, body.nextPassword),
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
