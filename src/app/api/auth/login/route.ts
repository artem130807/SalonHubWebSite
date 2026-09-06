import { getApp } from "@/server/infrastructure/get-app";
import { createAuthCookies } from "@/lib/session";
import { fromResult, handleRouteError, jsonOk, readJson } from "@/lib/http";

export async function POST(request: Request) {
  try {
    const body = await readJson<{ email: string; password: string }>(request);
    const result = await getApp().auth.login(body.email, body.password);
    if (result.ok) {
      await createAuthCookies(result.value);
      const { accessToken: _a, refreshToken: _r, refreshTokenId: _id, ...safe } = result.value;
      return jsonOk(safe);
    }
    return fromResult(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
