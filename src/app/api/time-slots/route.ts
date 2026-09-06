import { UserRole } from "@/server/domain/types";
import { getApp } from "@/server/infrastructure/get-app";
import { requireRole } from "@/lib/session";
import { fromResult, handleRouteError, readJson } from "@/lib/http";

export async function GET(request: Request) {
  try {
    const session = await requireRole([UserRole.Master]);
    const date = new URL(request.url).searchParams.get("date");
    if (!date) return fromResult({ ok: false, error: "Укажите дату" });
    return fromResult(await getApp().timeSlots.getMine(session.userId, date));
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireRole([UserRole.Master]);
    const body = await readJson<
      | { scheduleDate: string; startTime: string; endTime: string }
      | { scheduleDate: string; startTime: string; endTime: string }[]
    >(request);
    if (Array.isArray(body)) {
      return fromResult(await getApp().timeSlots.createRange(session.userId, body), true);
    }
    return fromResult(await getApp().timeSlots.create(session.userId, body), true);
  } catch (error) {
    return handleRouteError(error);
  }
}
