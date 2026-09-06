import { getApp } from "@/server/infrastructure/get-app";
import { requireSession } from "@/lib/session";
import { fromResult, handleRouteError } from "@/lib/http";

export async function GET() {
  try {
    const session = await requireSession();
    return fromResult(await getApp().chat.unreadCount(session.userId));
  } catch (error) {
    return handleRouteError(error);
  }
}
