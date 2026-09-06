import { UserRole } from "@/server/domain/types";
import { getApp } from "@/server/infrastructure/get-app";
import { fromResult, handleRouteError, readJson } from "@/lib/http";

export async function POST(request: Request) {
  try {
    const body = await readJson<{
      name: string;
      email: string;
      phone: string;
      password: string;
      role?: (typeof UserRole)[keyof typeof UserRole];
    }>(request);
    const includeCode = process.env.NODE_ENV !== "production";
    const result = await getApp().auth.register(body, includeCode);
    return fromResult(result, true);
  } catch (error) {
    return handleRouteError(error);
  }
}
