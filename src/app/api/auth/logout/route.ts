import { handleRouteError, jsonOk } from "@/lib/http";
import { revokeAndClearSession } from "@/lib/session";

export async function POST() {
  try {
    await revokeAndClearSession();
    return jsonOk({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
