import { getApp } from "@/server/infrastructure/get-app";
import { fromResult, handleRouteError } from "@/lib/http";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const durationMinutes = Number(searchParams.get("durationMinutes"));
    if (!date) {
      return fromResult({ ok: false, error: "Укажите дату" });
    }
    return fromResult(await getApp().timeSlots.getAvailable(id, date, durationMinutes));
  } catch (error) {
    return handleRouteError(error);
  }
}
