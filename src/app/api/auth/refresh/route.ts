import { getApp } from "@/server/infrastructure/get-app";
import { createAuthCookies, readRefreshToken, clearSessionCookie } from "@/lib/session";
import { fromResult, handleRouteError, jsonError, jsonOk } from "@/lib/http";

export async function POST() {
  try {
    const refreshToken = await readRefreshToken();
    if (!refreshToken) {
      await clearSessionCookie();
      return jsonError("Refresh-токен отсутствует", 401);
    }
    const result = await getApp().auth.refresh(refreshToken);
    if (!result.ok) {
      await clearSessionCookie();
      return fromResult(result);
    }
    await createAuthCookies(result.value);
    const { accessToken: _a, refreshToken: _r, refreshTokenId: _id, ...safe } = result.value;
    return jsonOk({
      ...safe,
      accessTokenExpiresAt: result.value.accessTokenExpiresAt,
      refreshTokenExpiresAt: result.value.refreshTokenExpiresAt,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
