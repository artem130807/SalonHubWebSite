import { getApp } from "@/server/infrastructure/get-app";
import { fromResult, handleRouteError } from "@/lib/http";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const month = new URL(request.url).searchParams.get("month");
    return fromResult(await getApp().publicMasters.getCalendar(id, month));
  } catch (error) {
    return handleRouteError(error);
  }
}
