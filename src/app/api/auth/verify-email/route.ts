import { getApp } from "@/server/infrastructure/get-app";
import { fromResult, handleRouteError, readJson } from "@/lib/http";

export async function POST(request: Request) {
  try {
    const body = await readJson<{ email: string; code: string }>(request);
    return fromResult(await getApp().auth.verifyEmail(body.email, body.code));
  } catch (error) {
    return handleRouteError(error);
  }
}
